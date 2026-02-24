import * as XLSX from "xlsx";
import { getDB, getConnection, runQuery } from "./duckdb";
import type { LoadedFile } from "./types";

function sanitizeTableName(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, "") // remove extension
    .replace(/[^a-zA-Z0-9_]/g, "_") // replace special chars
    .toLowerCase();
}

async function getTableInfo(
  tableName: string
): Promise<{ rowCount: number; columnCount: number }> {
  const countResult = await runQuery(
    `SELECT COUNT(*) as cnt FROM "${tableName}"`
  );
  const rowCount = Number(countResult.rows[0]?.cnt ?? 0);

  const colResult = await runQuery(
    `SELECT COUNT(*) as cnt FROM information_schema.columns WHERE table_name = '${tableName}' AND table_schema = 'main'`
  );
  const columnCount = Number(colResult.rows[0]?.cnt ?? 0);

  return { rowCount, columnCount };
}

async function loadCSV(file: File): Promise<LoadedFile> {
  const db = await getDB();
  const tableName = sanitizeTableName(file.name);
  const text = await file.text();

  await db.registerFileText(`${tableName}.csv`, text);

  const conn = await getConnection();
  await conn.query(`
    CREATE OR REPLACE TABLE "${tableName}" AS
    SELECT * FROM read_csv_auto('${tableName}.csv', header=true)
  `);

  const info = await getTableInfo(tableName);
  return { fileName: file.name, tableName, ...info };
}

async function loadExcel(file: File): Promise<LoadedFile[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const results: LoadedFile[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    const tableName = sanitizeTableName(
      workbook.SheetNames.length === 1
        ? file.name
        : `${file.name}_${sheetName}`
    );

    const db = await getDB();
    await db.registerFileText(`${tableName}.csv`, csv);

    const conn = await getConnection();
    await conn.query(`
      CREATE OR REPLACE TABLE "${tableName}" AS
      SELECT * FROM read_csv_auto('${tableName}.csv', header=true)
    `);

    const info = await getTableInfo(tableName);
    results.push({ fileName: file.name, tableName, ...info });
  }

  return results;
}

async function loadJSON(file: File): Promise<LoadedFile> {
  const db = await getDB();
  const tableName = sanitizeTableName(file.name);
  const text = await file.text();

  await db.registerFileText(`${tableName}.json`, text);

  const conn = await getConnection();
  await conn.query(`
    CREATE OR REPLACE TABLE "${tableName}" AS
    SELECT * FROM read_json_auto('${tableName}.json')
  `);

  const info = await getTableInfo(tableName);
  return { fileName: file.name, tableName, ...info };
}

async function loadParquet(file: File): Promise<LoadedFile> {
  const db = await getDB();
  const tableName = sanitizeTableName(file.name);
  const buffer = await file.arrayBuffer();

  await db.registerFileBuffer(
    `${tableName}.parquet`,
    new Uint8Array(buffer)
  );

  const conn = await getConnection();
  await conn.query(`
    CREATE OR REPLACE TABLE "${tableName}" AS
    SELECT * FROM read_parquet('${tableName}.parquet')
  `);

  const info = await getTableInfo(tableName);
  return { fileName: file.name, tableName, ...info };
}

export async function loadFileFromBytes(name: string, bytes: Uint8Array): Promise<LoadedFile[]> {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const file = new File([buffer], name);
  return loadFile(file);
}

export async function loadFile(file: File): Promise<LoadedFile[]> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "csv":
    case "tsv":
      return [await loadCSV(file)];
    case "xlsx":
    case "xls":
      return loadExcel(file);
    case "json":
      return [await loadJSON(file)];
    case "parquet":
      return [await loadParquet(file)];
    default:
      throw new Error(`Unsupported file type: .${ext}`);
  }
}
