import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [cols] = await conn.execute('DESCRIBE cityPolygons');
console.log('cityPolygons columns:', cols.map(c => c.Field + ':' + c.Type));

const [rows] = await conn.execute('SELECT id, cityName, polygon FROM cityPolygons LIMIT 3');
for (const r of rows) {
  console.log(`\nID: ${r.id}, City: ${r.cityName}`);
  console.log('Polygon raw (first 100 chars):', String(r.polygon).substring(0, 100));
  console.log('Polygon type:', typeof r.polygon);
}

await conn.end();
