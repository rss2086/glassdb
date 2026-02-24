use std::sync::Mutex;

use rusqlite::{params, Connection};
use rusqlite_migration::{Migrations, M};
use serde::{Deserialize, Serialize};
use tauri::State;

pub struct DbConn(pub Mutex<Connection>);

fn migrations() -> Migrations<'static> {
    Migrations::new(vec![M::up(
        "CREATE TABLE sessions (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE messages (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            tool_calls TEXT,
            tool_results TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE dashboards (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
            components TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE loaded_files (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
            file_path TEXT NOT NULL,
            table_name TEXT NOT NULL,
            row_count INTEGER NOT NULL,
            column_count INTEGER NOT NULL
        );",
    )])
}

pub fn init_db(data_dir: &std::path::Path) -> Connection {
    std::fs::create_dir_all(data_dir).expect("failed to create data dir");
    let db_path = data_dir.join("glassdb.db");
    let mut conn = Connection::open(&db_path).expect("failed to open database");
    conn.pragma_update(None, "journal_mode", "WAL")
        .expect("failed to set WAL mode");
    conn.pragma_update(None, "foreign_keys", "ON")
        .expect("failed to enable foreign keys");
    migrations()
        .to_latest(&mut conn)
        .expect("migration failed");
    conn
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionMessage {
    pub id: String,
    pub session_id: String,
    pub role: String,
    pub content: String,
    pub tool_calls: Option<String>,
    pub tool_results: Option<String>,
    pub created_at: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionFile {
    pub id: String,
    pub session_id: String,
    pub file_path: String,
    pub table_name: String,
    pub row_count: i64,
    pub column_count: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FullSession {
    pub session: Session,
    pub messages: Vec<SessionMessage>,
    pub dashboard_components: Option<String>,
    pub files: Vec<SessionFile>,
}

#[tauri::command]
pub fn list_sessions(db: State<'_, DbConn>) -> Result<Vec<Session>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, created_at, updated_at FROM sessions ORDER BY updated_at DESC LIMIT 50",
        )
        .map_err(|e| e.to_string())?;
    let sessions = stmt
        .query_map([], |row| {
            Ok(Session {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(sessions)
}

#[tauri::command]
pub fn create_session(db: State<'_, DbConn>, name: String) -> Result<Session, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO sessions (id, name) VALUES (?1, ?2)",
        params![id, name],
    )
    .map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT id, name, created_at, updated_at FROM sessions WHERE id = ?1",
        params![id],
        |row| {
            Ok(Session {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_message(
    db: State<'_, DbConn>,
    session_id: String,
    role: String,
    content: String,
    tool_calls: Option<String>,
    tool_results: Option<String>,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO messages (id, session_id, role, content, tool_calls, tool_results) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, session_id, role, content, tool_calls, tool_results],
    )
    .map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE sessions SET updated_at = datetime('now') WHERE id = ?1",
        params![session_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn save_dashboard(
    db: State<'_, DbConn>,
    session_id: String,
    components: String,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "DELETE FROM dashboards WHERE session_id = ?1",
        params![session_id],
    )
    .map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO dashboards (id, session_id, components) VALUES (?1, ?2, ?3)",
        params![id, session_id, components],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn save_loaded_files(
    db: State<'_, DbConn>,
    session_id: String,
    files: Vec<SessionFile>,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM loaded_files WHERE session_id = ?1",
        params![session_id],
    )
    .map_err(|e| e.to_string())?;
    for f in &files {
        let id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO loaded_files (id, session_id, file_path, table_name, row_count, column_count) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![id, session_id, f.file_path, f.table_name, f.row_count, f.column_count],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn load_session(db: State<'_, DbConn>, id: String) -> Result<FullSession, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let session = conn
        .query_row(
            "SELECT id, name, created_at, updated_at FROM sessions WHERE id = ?1",
            params![id],
            |row| {
                Ok(Session {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    created_at: row.get(2)?,
                    updated_at: row.get(3)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, session_id, role, content, tool_calls, tool_results, created_at FROM messages WHERE session_id = ?1 ORDER BY created_at",
        )
        .map_err(|e| e.to_string())?;
    let messages = stmt
        .query_map(params![id], |row| {
            Ok(SessionMessage {
                id: row.get(0)?,
                session_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                tool_calls: row.get(4)?,
                tool_results: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    let dashboard_components: Option<String> = conn
        .query_row(
            "SELECT components FROM dashboards WHERE session_id = ?1 ORDER BY created_at DESC LIMIT 1",
            params![id],
            |row| row.get(0),
        )
        .ok();
    let mut stmt = conn
        .prepare(
            "SELECT id, session_id, file_path, table_name, row_count, column_count FROM loaded_files WHERE session_id = ?1",
        )
        .map_err(|e| e.to_string())?;
    let files = stmt
        .query_map(params![id], |row| {
            Ok(SessionFile {
                id: row.get(0)?,
                session_id: row.get(1)?,
                file_path: row.get(2)?,
                table_name: row.get(3)?,
                row_count: row.get(4)?,
                column_count: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(FullSession {
        session,
        messages,
        dashboard_components,
        files,
    })
}

#[tauri::command]
pub fn delete_session(db: State<'_, DbConn>, id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM sessions WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
