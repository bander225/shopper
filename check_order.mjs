import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [rows] = await conn.execute('SELECT id, cityName, polygon FROM cityPolygons');

// السعودية: lat تتراوح بين 16-32، lng تتراوح بين 36-56
for (const row of rows) {
  const raw = row.polygon;
  console.log(`\nID: ${row.id}, City: ${row.cityName}`);
  console.log('Raw type:', typeof raw, Array.isArray(raw) ? 'array' : '');
  
  if (Array.isArray(raw)) {
    console.log('Array length:', raw.length);
    console.log('First 6 values:', raw.slice(0, 6));
    // تحليل: هل الأرقام في النطاق الصحيح؟
    // lat: 16-32, lng: 36-56
    const first = parseFloat(raw[0]);
    const second = parseFloat(raw[1]);
    console.log(`First: ${first} (${first >= 16 && first <= 32 ? 'lat?' : first >= 36 && first <= 56 ? 'lng?' : 'unknown'})`);
    console.log(`Second: ${second} (${second >= 16 && second <= 32 ? 'lat?' : second >= 36 && second <= 56 ? 'lng?' : 'unknown'})`);
  }
}

await conn.end();
