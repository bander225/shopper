import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// السعودية: lat تتراوح بين 16-32، lng تتراوح بين 36-56
function isLat(v) { return v >= 16 && v <= 32; }
function isLng(v) { return v >= 36 && v <= 56; }

// إصلاح cityPolygons
const [rows] = await conn.execute('SELECT id, cityName, polygon FROM cityPolygons');
console.log(`=== cityPolygons: ${rows.length} rows ===`);

for (const row of rows) {
  const raw = row.polygon;
  if (!Array.isArray(raw) || raw.length === 0) continue;
  
  const first = raw[0];
  if (!Array.isArray(first)) {
    console.log(`Skip ${row.id} (${row.cityName}): not array of arrays`);
    continue;
  }
  
  const v0 = parseFloat(first[0]);
  const v1 = parseFloat(first[1]);
  
  // تحديد الترتيب الصحيح
  if (isLng(v0) && isLat(v1)) {
    // [lng, lat] -> تبديل إلى [lat, lng]
    const fixed = raw.map(p => [parseFloat(p[1]), parseFloat(p[0])]);
    await conn.execute('UPDATE cityPolygons SET polygon = ? WHERE id = ?', [JSON.stringify(fixed), row.id]);
    console.log(`Fixed ${row.id} (${row.cityName}): [lng,lat] -> [lat,lng], ${fixed.length} points`);
    console.log(`  First point: [${fixed[0][0].toFixed(4)}, ${fixed[0][1].toFixed(4)}]`);
  } else if (isLat(v0) && isLng(v1)) {
    // [lat, lng] -> صحيح بالفعل
    console.log(`OK ${row.id} (${row.cityName}): already [lat,lng]`);
  } else {
    // كلا القيمتين في نفس النطاق - بيانات مشوهة
    console.log(`CORRUPT ${row.id} (${row.cityName}): both values out of range [${v0.toFixed(2)}, ${v1.toFixed(2)}] - DELETING`);
    await conn.execute('DELETE FROM cityPolygons WHERE id = ?', [row.id]);
  }
}

// إصلاح shopperTrips
const [trips] = await conn.execute("SELECT id, toCityName, coveragePolygon FROM shopperTrips WHERE coveragePolygon IS NOT NULL");
console.log(`\n=== shopperTrips: ${trips.length} rows ===`);

for (const trip of trips) {
  try {
    const raw = JSON.parse(trip.coveragePolygon);
    if (!Array.isArray(raw) || raw.length === 0) continue;
    
    const first = raw[0];
    if (!Array.isArray(first)) continue;
    
    const v0 = parseFloat(first[0]);
    const v1 = parseFloat(first[1]);
    
    if (isLng(v0) && isLat(v1)) {
      // [lng, lat] -> تبديل
      const fixed = raw.map(p => [parseFloat(p[1]), parseFloat(p[0])]);
      await conn.execute('UPDATE shopperTrips SET coveragePolygon = ? WHERE id = ?', [JSON.stringify(fixed), trip.id]);
      console.log(`Fixed trip ${trip.id} (${trip.toCityName}): [lng,lat] -> [lat,lng]`);
    } else if (isLat(v0) && isLng(v1)) {
      console.log(`OK trip ${trip.id} (${trip.toCityName}): already [lat,lng]`);
    } else {
      console.log(`CORRUPT trip ${trip.id} (${trip.toCityName}): [${v0.toFixed(2)}, ${v1.toFixed(2)}] - clearing polygon`);
      await conn.execute('UPDATE shopperTrips SET coveragePolygon = NULL WHERE id = ?', [trip.id]);
    }
  } catch(e) {
    console.log(`Error trip ${trip.id}: ${e.message}`);
  }
}

// التحقق النهائي
console.log('\n=== Verification ===');
const [check] = await conn.execute('SELECT id, cityName, polygon FROM cityPolygons');
for (const r of check) {
  const p = r.polygon;
  if (Array.isArray(p) && p.length > 0) {
    console.log(`${r.id} (${r.cityName}): first=[${p[0][0]?.toFixed(4)}, ${p[0][1]?.toFixed(4)}]`);
  }
}

const [tripCheck] = await conn.execute("SELECT id, toCityName, coveragePolygon FROM shopperTrips WHERE shopperTripStatus IN ('upcoming','collecting')");
for (const t of tripCheck) {
  if (!t.coveragePolygon) { console.log(`Trip ${t.id} (${t.toCityName}): NO POLYGON`); continue; }
  try {
    const p = JSON.parse(t.coveragePolygon);
    console.log(`Trip ${t.id} (${t.toCityName}): first=[${p[0][0]?.toFixed(4)}, ${p[0][1]?.toFixed(4)}]`);
  } catch {}
}

await conn.end();
