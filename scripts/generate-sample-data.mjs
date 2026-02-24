/**
 * Generates synthetic e-commerce sample data for GlassDB demo.
 * Run: node scripts/generate-sample-data.mjs
 */

import { writeFileSync } from "fs";

// Seed for reproducible random numbers
let seed = 42;
function random() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

function pick(arr) {
  return arr[Math.floor(random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function randomDate(start, end) {
  const d = new Date(
    start.getTime() + random() * (end.getTime() - start.getTime())
  );
  return d.toISOString().split("T")[0];
}

// --- Products (200 rows) ---
const categories = [
  { name: "Electronics", subs: ["Laptops", "Phones", "Tablets", "Headphones", "Cameras"] },
  { name: "Clothing", subs: ["Shirts", "Pants", "Dresses", "Jackets", "Shoes"] },
  { name: "Home & Garden", subs: ["Furniture", "Kitchen", "Decor", "Lighting", "Tools"] },
  { name: "Sports", subs: ["Fitness", "Outdoor", "Team Sports", "Water Sports", "Cycling"] },
  { name: "Books", subs: ["Fiction", "Non-Fiction", "Technical", "Children", "Comics"] },
];

const products = [];
let productId = 1;
for (const cat of categories) {
  for (const sub of cat.subs) {
    for (let i = 0; i < 8; i++) {
      const price = cat.name === "Electronics"
        ? randomInt(50, 2000)
        : cat.name === "Books"
          ? randomInt(8, 45)
          : randomInt(15, 300);
      const cost = Math.round(price * (0.3 + random() * 0.4));
      products.push({
        product_id: productId++,
        name: `${sub} ${String.fromCharCode(65 + i)}${randomInt(100, 999)}`,
        category: cat.name,
        subcategory: sub,
        price,
        cost,
      });
    }
  }
}

// --- Customers (5000 rows) ---
const firstNames = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Christopher", "Karen", "Emma", "Liam", "Olivia", "Noah", "Ava", "Sophia", "Isabella", "Mia", "Charlotte", "Amelia"];
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"];
const segments = ["Enterprise", "SMB", "Consumer"];
const countries = ["US", "UK", "DE", "FR", "JP", "AU", "CA", "BR", "IN", "KR"];

const customers = [];
for (let i = 1; i <= 5000; i++) {
  customers.push({
    customer_id: i,
    name: `${pick(firstNames)} ${pick(lastNames)}`,
    email: `customer${i}@example.com`,
    segment: pick(segments),
    join_date: randomDate(new Date("2020-01-01"), new Date("2024-12-31")),
    country: pick(countries),
  });
}

// --- Orders (50,000 rows) ---
const regions = ["North America", "Europe", "Asia Pacific", "Latin America"];
const statuses = ["completed", "completed", "completed", "completed", "shipped", "processing", "returned"];

const orders = [];
for (let i = 1; i <= 50000; i++) {
  const product = pick(products);
  const customer = pick(customers);
  const quantity = randomInt(1, 5);
  // Add seasonality: more orders in Q4
  const month = randomInt(1, 12);
  const seasonWeight = month >= 10 ? 1.5 : month <= 2 ? 0.8 : 1.0;
  if (random() > seasonWeight / 1.5) {
    // skip some to create seasonality effect
    i--;
    continue;
  }
  const orderDate = randomDate(new Date("2023-01-01"), new Date("2024-12-31"));
  orders.push({
    order_id: i,
    customer_id: customer.customer_id,
    product_id: product.product_id,
    order_date: orderDate,
    quantity,
    unit_price: product.price,
    total_amount: product.price * quantity,
    region: pick(regions),
    status: pick(statuses),
  });
}

// Trim to exactly 50,000
const finalOrders = orders.slice(0, 50000);

// --- Write CSVs ---
function toCSV(data, columns) {
  const header = columns.join(",");
  const rows = data.map((row) =>
    columns.map((col) => {
      const val = row[col];
      if (typeof val === "string" && (val.includes(",") || val.includes('"'))) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(",")
  );
  return header + "\n" + rows.join("\n") + "\n";
}

writeFileSync(
  "public/sample-data/products.csv",
  toCSV(products, ["product_id", "name", "category", "subcategory", "price", "cost"])
);
console.log(`products.csv: ${products.length} rows`);

writeFileSync(
  "public/sample-data/customers.csv",
  toCSV(customers, ["customer_id", "name", "email", "segment", "join_date", "country"])
);
console.log(`customers.csv: ${customers.length} rows`);

writeFileSync(
  "public/sample-data/orders.csv",
  toCSV(finalOrders, ["order_id", "customer_id", "product_id", "order_date", "quantity", "unit_price", "total_amount", "region", "status"])
);
console.log(`orders.csv: ${finalOrders.length} rows`);

console.log("Done! Sample data generated in public/sample-data/");
