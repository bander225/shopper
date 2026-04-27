import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// الرحلات النشطة لمدينة قبة
const [trips] = await conn.execute(
  "SELECT id, driverUserId, shopperTripStatus, toCityName, coveragePolygon FROM shopperTrips WHERE shopperTripStatus IN ('upcoming','collecting') AND toCityName LIKE '%قبة%' ORDER BY id DESC LIMIT 3"
);

for (const t of trips) {
  console.log(`Trip ${t.id} - ${t.toCityName} - ${t.shopperTripStatus}`);
  if (t.coveragePolygon) {
    try {
      const poly = JSON.parse(t.coveragePolygon);
      console.log('  Polygon points:', poly.length);
      console.log('  First 3 points:', poly.slice(0, 3));
      console.log('  Bounds: lat', Math.min(...poly.map(p=>p[0])).toFixed(4), '-', Math.max(...poly.map(p=>p[0])).toFixed(4));
      console.log('  Bounds: lng', Math.min(...poly.map(p=>p[1])).toFixed(4), '-', Math.max(...poly.map(p=>p[1])).toFixed(4));
    } catch(e) {
      console.log('  Invalid polygon JSON:', e.message);
    }
  } else {
    console.log('  No coverage polygon');
  }
}

// موقع العميل
const [customer] = await conn.execute(
  "SELECT id, phone, name, currentLat, currentLng, pinnedAddressLat, pinnedAddressLng, pinnedAddressText FROM phoneUsers WHERE phone = '0557392919'"
);
console.log('\nCustomer:', customer[0]);

await conn.end();
