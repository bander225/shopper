import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { readFileSync } from "fs";

dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const conn = await mysql.createConnection(url);

const sqls = [
  "ALTER TABLE `googlePlaceRestaurants` ADD COLUMN IF NOT EXISTS `hasHotBag` boolean DEFAULT false NOT NULL",
  "ALTER TABLE `googlePlaceRestaurants` ADD COLUMN IF NOT EXISTS `hasColdBag` boolean DEFAULT false NOT NULL",
  "ALTER TABLE `restaurants` ADD COLUMN IF NOT EXISTS `hasHotBag` boolean DEFAULT false NOT NULL",
  "ALTER TABLE `restaurants` ADD COLUMN IF NOT EXISTS `hasColdBag` boolean DEFAULT false NOT NULL",
  "ALTER TABLE `phoneUsers` ADD COLUMN IF NOT EXISTS `pinnedAddressCityId` int",
  "ALTER TABLE `phoneUsers` ADD COLUMN IF NOT EXISTS `pinnedAddressCityName` varchar(150)",
  "ALTER TABLE `shopperTrips` ADD COLUMN IF NOT EXISTS `toCityLat` decimal(10,7)",
  "ALTER TABLE `shopperTrips` ADD COLUMN IF NOT EXISTS `toCityLng` decimal(10,7)",
  "ALTER TABLE `shopperTrips` ADD COLUMN IF NOT EXISTS `toCityRadiusKm` decimal(6,2) DEFAULT 10",
  "ALTER TABLE `shopperTrips` ADD COLUMN IF NOT EXISTS `fromLat` decimal(10,7)",
  "ALTER TABLE `shopperTrips` ADD COLUMN IF NOT EXISTS `fromLng` decimal(10,7)",
  "ALTER TABLE `phoneUsers` ADD COLUMN IF NOT EXISTS `currentCityName` varchar(150)",
  "ALTER TABLE `phoneUsers` ADD COLUMN IF NOT EXISTS `currentLat` varchar(30)",
  "ALTER TABLE `phoneUsers` ADD COLUMN IF NOT EXISTS `currentLng` varchar(30)",
];

for (const sql of sqls) {
  try {
    await conn.execute(sql);
    console.log("✓", sql.substring(0, 80));
  } catch (e) {
    if (e.code === "ER_DUP_FIELDNAME") {
      console.log("⚠ Column already exists, skipping:", sql.substring(0, 60));
    } else {
      console.error("✗ Error:", e.message);
    }
  }
}

await conn.end();
console.log("Migration done!");
