use serde::Serialize;
use std::path::PathBuf;

#[derive(Serialize)]
pub struct FileData {
    pub path: String,
    pub name: String,
    pub contents: Vec<u8>,
}

#[tauri::command]
pub async fn read_file_bytes(path: String) -> Result<FileData, String> {
    let p = PathBuf::from(&path);
    let name = p
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();
    let contents = tokio::fs::read(&p).await.map_err(|e| e.to_string())?;
    Ok(FileData {
        path,
        name,
        contents,
    })
}
