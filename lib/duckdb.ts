import * as duckdb from "@duckdb/duckdb-wasm";
import type { DataSchema, TableSchema } from "./types";

let db: duckdb.AsyncDuckDB | null = null;
let conn: duckdb.AsyncDuckDBConnection | null = null;

export async function initDuckDB(): Promise<duckdb.AsyncDuckDB> {
  if (db) return db;

  const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

  const workerUrl = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker!}");`], {
      type: "text/javascript",
    })
  );

  const worker = new Worker(workerUrl);
  const logger = new duckdb.ConsoleLogger();
  db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  URL.revokeObjectURL(workerUrl);

  conn = await db.connect();
  return db;
}

export async function getDB(): Promise<duckdb.AsyncDuckDB> {
  if (!db) {
    return initDuckDB();
  }
  return db;
}

export async function getConnection(): Promise<duckdb.AsyncDuckDBConnection> {
  if (!conn) {
    const database = await initDuckDB();
    conn = await database.connect();
  }
  return conn;
}

export async function runQuery(sql: string): Promise<{
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
}> {
  const connection = await getConnection();
  const result = await connection.query(sql);

  const columns = result.schema.fields.map((f) => f.name);
  const rawRows = result.toArray();
  const rows = rawRows.map((row) => {
    const obj: Record<string, unknown> = {};
    for (const col of columns) {
      const val = row[col];
      // Convert BigInt to number for JSON serialization
      obj[col] = typeof val === "bigint" ? Number(val) : val;
    }
    return obj;
  });

  return { columns, rows, rowCount: rows.length };
}

export async function dropTable(tableName: string): Promise<void> {
  const connection = await getConnection();
  await connection.query(`DROP TABLE IF EXISTS "${tableName}"`);
}

export async function dropAllTables(): Promise<void> {
  const names = await getTableNames();
  for (const name of names) {
    await dropTable(name);
  }
}

export async function getTableNames(): Promise<string[]> {
  const result = await runQuery(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'main'"
  );
  return result.rows.map((r) => r.table_name as string);
}

export async function getTableSchema(tableName: string): Promise<TableSchema> {
  const colResult = await runQuery(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${tableName}' AND table_schema = 'main'`
  );
  const columns = colResult.rows.map((r) => ({
    name: r.column_name as string,
    type: r.data_type as string,
  }));

  const countResult = await runQuery(
    `SELECT COUNT(*) as cnt FROM "${tableName}"`
  );
  const rowCount = Number(countResult.rows[0]?.cnt ?? 0);

  return { name: tableName, columns, rowCount };
}

export async function getAllSchemas(sampleRowLimit: number = 0): Promise<DataSchema> {
  const names = await getTableNames();
  const tables = await Promise.all(
    names.map(async (name) => {
      const schema = await getTableSchema(name);
      if (sampleRowLimit > 0) {
        const sampleResult = await runQuery(
          `SELECT * FROM "${name}" LIMIT ${sampleRowLimit}`
        );
        return { ...schema, sampleRows: sampleResult.rows };
      }
      return schema;
    })
  );
  const totalRows = tables.reduce((sum, t) => sum + t.rowCount, 0);
  return { tables, totalRows };
}
