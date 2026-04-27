import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// موقع العميل
const customerLat = 27.4013749;
const customerLng = 44.3308099;

// خوارزمية point-in-polygon [lat, lng]
function isPointInPolygon(lat, lng, polygon) {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const yi = polygon[i][0], xi = polygon[i][1]; // [lat, lng]
    const yj = polygon[j][0], xj = polygon[j][1];
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

console.log(`Customer: lat=${customerLat}, lng=${customerLng}`);
console.log('---');

// فحص cityPolygons
const [cityPolys] = await conn.execute('SELECT id, cityName, polygon FROM cityPolygons');
for (const r of cityPolys) {
  const poly = r.polygon;
  if (!Array.isArray(poly)) continue;
  const inside = isPointInPolygon(customerLat, customerLng, poly);
  console.log(`CityPolygon ${r.id} (${r.cityName}): ${inside ? '✅ INSIDE' : '❌ outside'}`);
  console.log(`  Lat range: ${Math.min(...poly.map(p=>p[0])).toFixed(4)} - ${Math.max(...poly.map(p=>p[0])).toFixed(4)}`);
  console.log(`  Lng range: ${Math.min(...poly.map(p=>p[1])).toFixed(4)} - ${Math.max(...poly.map(p=>p[1])).toFixed(4)}`);
}

// فحص رحلات قبه
const [trips] = await conn.execute("SELECT id, toCityName, coveragePolygon, shopperTripStatus FROM shopperTrips WHERE shopperTripStatus IN ('upcoming','collecting')");
console.log('\n--- Active trips ---');
for (const t of trips) {
  if (!t.coveragePolygon) { console.log(`Trip ${t.id} (${t.toCityName}): no polygon`); continue; }
  try {
    const poly = JSON.parse(t.coveragePolygon);
    const inside = isPointInPolygon(customerLat, customerLng, poly);
    console.log(`Trip ${t.id} (${t.toCityName}): ${inside ? '✅ INSIDE' : '❌ outside'}`);
  } catch(e) {
    console.log(`Trip ${t.id}: parse error ${e.message}`);
  }
}

await conn.end();
