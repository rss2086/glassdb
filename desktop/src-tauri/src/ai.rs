use futures::StreamExt;
use reqwest_eventsource::{Event, EventSource};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::ipc::Channel;

use crate::keychain;

// ── Types for the Anthropic API ─────────────────────────

#[derive(Serialize, Debug)]
struct MessagesRequest {
    model: String,
    max_tokens: u32,
    stream: bool,
    system: String,
    messages: Vec<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    tools: Option<Vec<Value>>,
}

// ── Channel event types sent to the frontend ────────────

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase", tag = "event", content = "data")]
pub enum ChatEvent {
    MessageStart { id: String },
    ContentDelta { text: String },
    ToolUseStart { index: usize, id: String, name: String },
    ToolUseInputDelta { index: usize, partial_json: String },
    ToolUseEnd { index: usize },
    MessageDelta { stop_reason: Option<String> },
    Done,
    Error { message: String },
}

// ── SSE payload parsing ─────────────────────────────────

#[derive(Deserialize)]
struct MessageStartPayload {
    message: MessageMeta,
}

#[derive(Deserialize)]
struct MessageMeta {
    id: String,
}

#[derive(Deserialize)]
struct ContentBlockStartPayload {
    index: usize,
    content_block: ContentBlockInfo,
}

#[derive(Deserialize)]
#[serde(tag = "type")]
enum ContentBlockInfo {
    #[serde(rename = "text")]
    Text { #[allow(dead_code)] text: String },
    #[serde(rename = "tool_use")]
    ToolUse { id: String, name: String },
}

#[derive(Deserialize)]
struct ContentBlockDeltaPayload {
    index: usize,
    delta: Delta,
}

#[derive(Deserialize)]
#[serde(tag = "type")]
enum Delta {
    #[serde(rename = "text_delta")]
    TextDelta { text: String },
    #[serde(rename = "input_json_delta")]
    InputJsonDelta { partial_json: String },
    #[serde(rename = "thinking_delta")]
    ThinkingDelta { #[allow(dead_code)] thinking: String },
    #[serde(rename = "signature_delta")]
    SignatureDelta { #[allow(dead_code)] signature: String },
}

#[derive(Deserialize)]
struct ContentBlockStopPayload {
    index: usize,
}

#[derive(Deserialize)]
struct MessageDeltaPayload {
    delta: MessageDeltaInfo,
}

#[derive(Deserialize)]
struct MessageDeltaInfo {
    stop_reason: Option<String>,
}

// ── Main streaming command ──────────────────────────────

#[tauri::command]
pub async fn chat_stream(
    messages: Vec<Value>,
    system_prompt: String,
    tools: Option<Vec<Value>>,
    model: Option<String>,
    on_event: Channel<ChatEvent>,
) -> Result<(), String> {
    let api_key = keychain::get_api_key()?
        .ok_or_else(|| "No API key found. Please set your Anthropic API key in settings.".to_string())?;

    let request_body = MessagesRequest {
        model: model.unwrap_or_else(|| "claude-sonnet-4-5-20250929".to_string()),
        max_tokens: 4096,
        stream: true,
        system: system_prompt,
        messages,
        tools,
    };

    let client = reqwest::Client::new();
    let builder = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", &api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&request_body);

    let mut es = EventSource::new(builder).map_err(|e| e.to_string())?;

    while let Some(event) = es.next().await {
        match event {
            Ok(Event::Open) => {}
            Ok(Event::Message(msg)) => {
                match msg.event.as_str() {
                    "message_start" => {
                        if let Ok(payload) = serde_json::from_str::<MessageStartPayload>(&msg.data) {
                            let _ = on_event.send(ChatEvent::MessageStart {
                                id: payload.message.id,
                            });
                        }
                    }
                    "content_block_start" => {
                        if let Ok(payload) = serde_json::from_str::<ContentBlockStartPayload>(&msg.data) {
                            match payload.content_block {
                                ContentBlockInfo::Text { .. } => {}
                                ContentBlockInfo::ToolUse { id, name } => {
                                    let _ = on_event.send(ChatEvent::ToolUseStart {
                                        index: payload.index,
                                        id,
                                        name,
                                    });
                                }
                            }
                        }
                    }
                    "content_block_delta" => {
                        if let Ok(payload) = serde_json::from_str::<ContentBlockDeltaPayload>(&msg.data) {
                            match payload.delta {
                                Delta::TextDelta { text } => {
                                    let _ = on_event.send(ChatEvent::ContentDelta { text });
                                }
                                Delta::InputJsonDelta { partial_json } => {
                                    let _ = on_event.send(ChatEvent::ToolUseInputDelta {
                                        index: payload.index,
                                        partial_json,
                                    });
                                }
                                Delta::ThinkingDelta { .. } | Delta::SignatureDelta { .. } => {}
                            }
                        }
                    }
                    "content_block_stop" => {
                        if let Ok(payload) = serde_json::from_str::<ContentBlockStopPayload>(&msg.data) {
                            let _ = on_event.send(ChatEvent::ToolUseEnd {
                                index: payload.index,
                            });
                        }
                    }
                    "message_delta" => {
                        if let Ok(payload) = serde_json::from_str::<MessageDeltaPayload>(&msg.data) {
                            let _ = on_event.send(ChatEvent::MessageDelta {
                                stop_reason: payload.delta.stop_reason,
                            });
                        }
                    }
                    "message_stop" => {
                        let _ = on_event.send(ChatEvent::Done);
                        es.close();
                    }
                    "ping" => {}
                    "error" => {
                        let _ = on_event.send(ChatEvent::Error {
                            message: msg.data.clone(),
                        });
                        es.close();
                    }
                    _ => {}
                }
            }
            Err(reqwest_eventsource::Error::StreamEnded) => break,
            Err(err) => {
                let _ = on_event.send(ChatEvent::Error {
                    message: err.to_string(),
                });
                es.close();
                break;
            }
        }
    }

    Ok(())
}
