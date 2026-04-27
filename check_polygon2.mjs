import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// الرحلات النشطة لمدينة قبه (بدون همزة)
const [trips] = await conn.execute(
  "SELECT id, driverUserId, shopperTripStatus, toCityName, coveragePolygon FROM shopperTrips WHERE shopperTripStatus IN ('upcoming','collecting') ORDER BY id DESC LIMIT 10"
);

// موقع العميل
const customerLat = 27.4013749;
const customerLng = 44.3308099;

// خوارزمية point-in-polygon
function isPointInPolygon(lat, lng, polygon) {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i][1], yi = polygon[i][0];
    const xj = polygon[j][1], yj = polygon[j][0];
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

console.log(`Customer location: lat=${customerLat}, lng=${customerLng}`);
console.log('---');

for (const t of trips) {
  console.log(`Trip ${t.id} - "${t.toCityName}" - ${t.shopperTripStatus}`);
  if (t.coveragePolygon) {
    try {
      const poly = JSON.parse(t.coveragePolygon);
      const inside = isPointInPolygon(customerLat, customerLng, poly);
      console.log(`  Polygon: ${poly.length} points, customer inside: ${inside}`);
      console.log(`  Lat range: ${Math.min(...poly.map(p=>p[0])).toFixed(4)} - ${Math.max(...poly.map(p=>p[0])).toFixed(4)}`);
      console.log(`  Lng range: ${Math.min(...poly.map(p=>p[1])).toFixed(4)} - ${Math.max(...poly.map(p=>p[1])).toFixed(4)}`);
    } catch(e) {
      console.log(`  Invalid polygon: ${e.message}`);
    }
  } else {
    console.log('  No coverage polygon');
  }
}

await conn.end();
