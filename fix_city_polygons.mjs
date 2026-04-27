import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [rows] = await conn.execute('SELECT id, cityName, polygon FROM cityPolygons');
console.log(`Found ${rows.length} city polygons`);

let fixed = 0;
for (const row of rows) {
  try {
    const raw = row.polygon;
    
    // إذا كان flat array من الأرقام (mysql يعيده كـ object/array)
    if (Array.isArray(raw)) {
      // flat array: [lng1, lat1, lng2, lat2, ...]
      const points = [];
      for (let i = 0; i < raw.length; i += 2) {
        const lng = parseFloat(raw[i]);
        const lat = parseFloat(raw[i + 1]);
        if (!isNaN(lat) && !isNaN(lng)) {
          points.push([lat, lng]); // تحويل إلى [lat, lng]
        }
      }
      if (points.length >= 3) {
        await conn.execute('UPDATE cityPolygons SET polygon = ? WHERE id = ?', [JSON.stringify(points), row.id]);
        console.log(`Fixed polygon ${row.id} (${row.cityName}): ${raw.length} numbers -> ${points.length} points`);
        fixed++;
      }
    } else if (typeof raw === 'string') {
      // string: "44.103,26.240,43.834,26.189,..."
      const nums = raw.split(',').map(n => parseFloat(n.trim())).filter(n => !isNaN(n));
      const points = [];
      for (let i = 0; i < nums.length; i += 2) {
        const lng = nums[i];
        const lat = nums[i + 1];
        if (!isNaN(lat) && !isNaN(lng)) {
          points.push([lat, lng]); // تحويل إلى [lat, lng]
        }
      }
      if (points.length >= 3) {
        await conn.execute('UPDATE cityPolygons SET polygon = ? WHERE id = ?', [JSON.stringify(points), row.id]);
        console.log(`Fixed polygon ${row.id} (${row.cityName}): ${nums.length} numbers -> ${points.length} points`);
        fixed++;
      }
    } else {
      console.log(`Polygon ${row.id} (${row.cityName}): unknown type ${typeof raw}`);
    }
  } catch(e) {
    console.log(`Error processing polygon ${row.id}: ${e.message}`);
  }
}

console.log(`\nDone: Fixed ${fixed} city polygons`);

// التحقق من النتيجة
const [check] = await conn.execute('SELECT id, cityName, polygon FROM cityPolygons LIMIT 2');
for (const r of check) {
  console.log(`\nVerify ${r.id} (${r.cityName}):`, JSON.stringify(r.polygon).substring(0, 80));
}

await conn.end();
