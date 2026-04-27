import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// فحص رحلات تبوك
const [trips] = await conn.execute(
  "SELECT id, toCityName, coveragePolygon, shopperTripStatus as status, fromCityName FROM shopperTrips WHERE toCityName LIKE '%تبوك%' OR toCityName LIKE '%Tabuk%'"
);
console.log('=== رحلات تبوك ===');
console.log(JSON.stringify(trips, null, 2));

// فحص جميع الرحلات النشطة
const [active] = await conn.execute(
  "SELECT id, toCityName, coveragePolygon IS NOT NULL as hasPolygon, shopperTripStatus as status FROM shopperTrips WHERE shopperTripStatus IN ('upcoming','collecting')"
);
console.log('\n=== جميع الرحلات النشطة ===');
for (const t of active) {
  let polygonInfo = 'no polygon';
  if (t.hasPolygon) {
    const [rows] = await conn.execute('SELECT coveragePolygon FROM shopperTrips WHERE id = ?', [t.id]);
    try {
      const poly = JSON.parse(rows[0].coveragePolygon);
      if (Array.isArray(poly) && poly.length > 0) {
        const firstLat = poly[0][0];
        const firstLng = poly[0][1];
        const isSwapped = firstLat > 35;
        polygonInfo = `${poly.length} pts, first=[${firstLat.toFixed(4)}, ${firstLng.toFixed(4)}]${isSwapped ? ' ⚠️ SWAPPED!' : ' ✅'}`;
      }
    } catch(e) { polygonInfo = `parse error: ${e.message}`; }
  }
  console.log(`  Trip ${t.id} (${t.toCityName}): ${t.status} | ${polygonInfo}`);
}

// فحص بيانات العميل
const [users] = await conn.execute(
  "SELECT id, phone, pinnedAddressText, pinnedAddressLat, pinnedAddressLng FROM phoneUsers WHERE phone LIKE '%392919%'"
);
console.log('\n=== بيانات العميل ===');
console.log(JSON.stringify(users, null, 2));

await conn.end();
