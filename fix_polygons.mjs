import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// جلب جميع المناطق
const [polygons] = await conn.execute('SELECT id, cityName, polygon FROM cityPolygons');
console.log(`Found ${polygons.length} polygons to fix`);

let fixed = 0;
for (const row of polygons) {
  try {
    const poly = JSON.parse(row.polygon);
    if (!Array.isArray(poly) || poly.length < 3) continue;
    
    // التحقق: إذا كانت القيمة الأولى في كل نقطة تبدو كـ lng (>40) والثانية تبدو كـ lat (<30)
    // فهذا يعني أنها مقلوبة [lng, lat] بدلاً من [lat, lng]
    const firstPoint = poly[0];
    const isSwapped = firstPoint[0] > 35 && firstPoint[1] < 35; // lng أكبر من lat في السعودية
    
    if (isSwapped) {
      // تبديل الترتيب: [lng, lat] -> [lat, lng]
      const fixedPoly = poly.map(p => [p[1], p[0]]);
      await conn.execute('UPDATE cityPolygons SET polygon = ? WHERE id = ?', [JSON.stringify(fixedPoly), row.id]);
      console.log(`Fixed polygon ${row.id} (${row.cityName}): swapped lat/lng`);
      fixed++;
    } else {
      console.log(`Polygon ${row.id} (${row.cityName}): already correct`);
    }
  } catch(e) {
    console.log(`Error processing polygon ${row.id}: ${e.message}`);
  }
}

// أيضاً إصلاح coveragePolygon في shopperTrips
const [trips] = await conn.execute("SELECT id, toCityName, coveragePolygon FROM shopperTrips WHERE coveragePolygon IS NOT NULL");
console.log(`\nFound ${trips.length} trips with coverage polygons`);

let tripsFixed = 0;
for (const trip of trips) {
  try {
    const poly = JSON.parse(trip.coveragePolygon);
    if (!Array.isArray(poly) || poly.length < 3) continue;
    
    const firstPoint = poly[0];
    const isSwapped = firstPoint[0] > 35 && firstPoint[1] < 35;
    
    if (isSwapped) {
      const fixedPoly = poly.map(p => [p[1], p[0]]);
      await conn.execute('UPDATE shopperTrips SET coveragePolygon = ? WHERE id = ?', [JSON.stringify(fixedPoly), trip.id]);
      console.log(`Fixed trip ${trip.id} (${trip.toCityName}): swapped lat/lng`);
      tripsFixed++;
    } else {
      console.log(`Trip ${trip.id} (${trip.toCityName}): already correct`);
    }
  } catch(e) {
    console.log(`Error processing trip ${trip.id}: ${e.message}`);
  }
}

console.log(`\nDone: Fixed ${fixed} city polygons, ${tripsFixed} trip polygons`);
await conn.end();
