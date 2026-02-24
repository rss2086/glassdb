# GlassDB

Privacy-first data analysis powered by AI. Your data stays in your browser.

## What it does

GlassDB lets you drop in CSV, Excel, or Parquet files and ask questions in plain English. An AI agent writes SQL, queries your data locally with DuckDB-WASM, and renders interactive dashboards — all without your raw data ever leaving the browser.

## Privacy architecture

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

- **Raw data never leaves the browser.** Files are loaded directly into an in-browser DuckDB instance.
- **You control what the AI sees.** A sample row slider (0–100) lets you choose how many example rows the model receives for context. Set it to 0 for schema-only mode.
- **A live privacy beacon** tracks every token and row sent to the API in real time.

## Features

- **Quick mode** — fast single-pass analysis with tool calling
- **Deep mode** — multi-step agentic analysis with extended thinking and code execution
- **5 themes** — Ember, Mono, Paper, Pixel, Vista
- **Excel export** — download query results as `.xlsx`
- **Desktop app** — native macOS/Windows/Linux app via Tauri with system keychain storage and session persistence

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
| `AI_GATEWAY_API_KEY` | No | Alternative: use an AI gateway instead |

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 + React 19 |
| Styling | Tailwind CSS v4 |
| Data engine | DuckDB-WASM (in-browser) |
| AI | Vercel AI SDK + Anthropic Claude |
| Charts | Recharts |
| Markdown | Streamdown |
| Desktop | Tauri 2 (Rust) |
| Export | SheetJS (xlsx) |

## How it works

1. **Load** — Drop files onto the landing page. They're parsed and loaded into DuckDB-WASM entirely in the browser.
2. **Ask** — Type a question. The AI agent receives only table schemas and a configurable number of sample rows.
3. **Query** — The agent writes DuckDB SQL. Queries execute locally in the browser against your full dataset.
4. **Visualize** — Results are rendered as interactive charts, tables, and stat cards on a live dashboard.
5. **Export** — Download any query result as an Excel file, or ask the AI to export specific slices of data.

## License

[MIT](LICENSE)
