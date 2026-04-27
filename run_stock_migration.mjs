import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const connection = await createConnection(process.env.DATABASE_URL);

try {
  console.log("Applying stock migration...");
  
  // Check if columns already exist
  const [cols] = await connection.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'menuItems' 
     AND COLUMN_NAME IN ('stockEnabled', 'stockCount')`
  );
  
  const existingCols = cols.map(c => c.COLUMN_NAME);
  
  if (!existingCols.includes('stockEnabled')) {
    await connection.execute(`ALTER TABLE \`menuItems\` ADD \`stockEnabled\` boolean DEFAULT false NOT NULL`);
    console.log("✓ Added stockEnabled column");
  } else {
    console.log("✓ stockEnabled already exists");
  }
  
  if (!existingCols.includes('stockCount')) {
    await connection.execute(`ALTER TABLE \`menuItems\` ADD \`stockCount\` int DEFAULT 0 NOT NULL`);
    console.log("✓ Added stockCount column");
  } else {
    console.log("✓ stockCount already exists");
  }
  
  // Also check googlePlaceRestaurants for hasHotBag/hasColdBag
  const [gCols] = await connection.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'googlePlaceRestaurants' 
     AND COLUMN_NAME IN ('hasHotBag', 'hasColdBag')`
  );
  
  const existingGCols = gCols.map(c => c.COLUMN_NAME);
  
  if (!existingGCols.includes('hasHotBag')) {
    await connection.execute(`ALTER TABLE \`googlePlaceRestaurants\` ADD \`hasHotBag\` boolean DEFAULT false NOT NULL`);
    console.log("✓ Added hasHotBag to googlePlaceRestaurants");
  } else {
    console.log("✓ hasHotBag already exists in googlePlaceRestaurants");
  }
  
  if (!existingGCols.includes('hasColdBag')) {
    await connection.execute(`ALTER TABLE \`googlePlaceRestaurants\` ADD \`hasColdBag\` boolean DEFAULT false NOT NULL`);
    console.log("✓ Added hasColdBag to googlePlaceRestaurants");
  } else {
    console.log("✓ hasColdBag already exists in googlePlaceRestaurants");
  }
  
  console.log("Migration completed successfully!");
} catch (err) {
  console.error("Migration error:", err);
  process.exit(1);
} finally {
  await connection.end();
}
