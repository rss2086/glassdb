# GlassDB

Drop a file. Ask a question. Get a dashboard.

GlassDB is the fastest way to explore a dataset. Drop in a CSV, Excel, or Parquet file, ask a question in plain English, and an AI agent instantly generates interactive charts, tables, and insights — no setup, no code, no waiting.

## How it works

1. **Drop** — Drag files onto the page. They're loaded into DuckDB-WASM instantly, right in your browser.
2. **Ask** — Type a question like "show me revenue by month" or "which customers churned last quarter."
3. **See** — The AI writes SQL, runs it against your data, and generates a full interactive dashboard in seconds.
4. **Export** — Download any result as Excel, or ask the AI to slice the data differently.

## Features

- **Instant dashboards** — AI generates charts, stat cards, and tables from your questions automatically
- **Quick mode** — fast single-pass analysis for straightforward questions
- **Deep mode** — multi-step agentic analysis with extended thinking for complex exploration
- **5 themes** — Ember, Mono, Paper, Pixel, Vista
- **Excel export** — download any query result as `.xlsx`
- **Privacy built in** — your raw data never leaves the browser. The AI only sees table schemas and a configurable number of sample rows. A live privacy beacon tracks exactly what's sent.
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

## License

[MIT](LICENSE)
