# GlassDB

Drop a CSV. Ask a question. Get a dashboard.

GlassDB turns plain-English questions into interactive dashboards over your data. It runs a DuckDB engine directly in the browser — your files never leave the tab — and uses an AI agent to write SQL, execute queries, and render charts, tables, and stat cards on the fly.

## Architecture

```
┌──────────────────────────────────────────────────┐
│  Browser                                         │
│  ┌────────────┐   ┌─────────────┐                │
│  │ Your Files  │──▶│ DuckDB-WASM │──▶ Dashboard   │
│  └────────────┘   └──────┬──────┘                │
│        ▲                 │ schema + sample rows   │
│        │                 ▼                        │
│        │          ┌─────────────┐                 │
│        └──────────│   AI Agent  │                 │
│          SQL      └─────────────┘                 │
└──────────────────────────────────────────────────┘
                           │ only metadata
                           ▼
                    Anthropic API
```

Files are parsed and loaded into DuckDB-WASM entirely client-side. The AI agent receives table schemas and a configurable number of sample rows (0–100), writes DuckDB SQL, and the queries execute locally against the full dataset. Raw data never hits the network.

A live **privacy beacon** in the chat panel tracks every token and row sent to the API, so you always know exactly what left the browser.

## Features

**Two analysis modes.** Quick mode does single-pass tool-calling for fast answers. Deep mode runs multi-step agentic analysis with extended thinking and code execution — useful for open-ended exploration where you don't know what you're looking for yet.

**Generated dashboards.** The agent picks the right visualization for each result: line charts, bar charts, area charts, pie charts, stat cards, KPI rows, data tables. Everything renders into a live dashboard you can scroll through while continuing the conversation.

**Five themes.** Ember (warm terracotta), Mono (black & white editorial), Paper (light mode), Pixel (voxel landscape), Vista (redwood forest). All built on CSS custom properties with glassmorphic panels.

**Excel export.** Any query result can be downloaded as `.xlsx`. The export runs the full query locally with no row limit — what you see in the dashboard is capped at 20 rows, but the export gets everything.

**Desktop app.** A Tauri 2 wrapper gives you a native macOS/Windows/Linux app. API keys are stored in the system keychain, sessions persist across launches, and files are loaded through native OS dialogs.

## Quick start

### Web

```bash
git clone https://github.com/rss2086/glassdb.git
cd glassdb
npm install
cp .env.example .env.local
# Add your ANTHROPIC_API_KEY to .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Desktop (Tauri)

```bash
cd desktop
npm install
npx tauri dev
```

The desktop app stores your API key in the system keychain — no `.env` file needed.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes (web) | Anthropic API key for Claude |
| `AI_GATEWAY_API_KEY` | No | Use an AI gateway instead of direct Anthropic access |

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16, React 19 |
| Styling | Tailwind CSS v4 |
| Data engine | DuckDB-WASM (in-browser) |
| AI | Vercel AI SDK, Anthropic Claude |
| Charts | Recharts |
| Markdown | Streamdown |
| Desktop | Tauri 2 (Rust) |
| Export | SheetJS |

## License

[MIT](LICENSE)
