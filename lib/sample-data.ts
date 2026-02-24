"use client";

import { getDB, getConnection } from "./duckdb";
import { addLocalRows } from "./privacy";

export const SAMPLE_SUGGESTIONS = [
  "What are the top 10 customers by total revenue?",
  "Show me monthly sales trends by region for 2024",
  "Which product categories have the highest profit margins?",
  "Compare revenue across customer segments (Enterprise vs SMB vs Consumer)",
  "Which products have declining sales quarter over quarter?",
];

export async function loadSampleData(): Promise<{
  tables: { name: string; rowCount: number; columnCount: number }[];
}> {
  const db = await getDB();
  const conn = await getConnection();

  const files = [
    { url: "/sample-data/orders.csv", name: "orders" },
    { url: "/sample-data/customers.csv", name: "customers" },
    { url: "/sample-data/products.csv", name: "products" },
  ];

  const tables: { name: string; rowCount: number; columnCount: number }[] = [];

  for (const file of files) {
    const response = await fetch(file.url);
    const text = await response.text();

    await db.registerFileText(`${file.name}.csv`, text);
    await conn.query(`
      CREATE OR REPLACE TABLE "${file.name}" AS
      SELECT * FROM read_csv_auto('${file.name}.csv', header=true)
    `);

    const countResult = await conn.query(
      `SELECT COUNT(*) as cnt FROM "${file.name}"`
    );
    const rowCount = Number(countResult.toArray()[0]?.cnt ?? 0);

    const colResult = await conn.query(
      `SELECT COUNT(*) as cnt FROM information_schema.columns WHERE table_name = '${file.name}' AND table_schema = 'main'`
    );
    const columnCount = Number(colResult.toArray()[0]?.cnt ?? 0);

    addLocalRows(rowCount);
    tables.push({ name: file.name, rowCount, columnCount });
  }

  return { tables };
}
