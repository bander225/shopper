import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// جلب المندوبين
const [drivers] = await conn.execute("SELECT id, name, phone, userId FROM drivers LIMIT 10");
console.log("=== drivers table ===");
console.table(drivers);

// جلب phoneUsers
const [phoneUsers] = await conn.execute("SELECT id, phone, name, role FROM phoneUsers LIMIT 10");
console.log("=== phone_users table ===");
console.table(phoneUsers);

await conn.end();
