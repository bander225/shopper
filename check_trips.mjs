import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// الرحلات النشطة
const [trips] = await conn.execute(
  "SELECT id, driverUserId, shopperTripStatus, toCityName, toCityLat, toCityLng, coveragePolygon FROM shopperTrips WHERE shopperTripStatus IN ('upcoming','collecting') ORDER BY id DESC LIMIT 10"
);
console.log('Active trips count:', trips.length);
for (const t of trips) {
  console.log({
    id: t.id,
    driver: t.driverUserId,
    status: t.shopperTripStatus,
    city: t.toCityName,
    hasCoverage: !!t.coveragePolygon,
    lat: t.toCityLat,
    lng: t.toCityLng
  });
}

// المندوب
const [driver] = await conn.execute(
  "SELECT id, phone, name, isOnline, cityId, currentLat, currentLng FROM phoneUsers WHERE phone = '0557999999'"
);
console.log('\nDriver:', driver[0]);

// إعدادات المندوب
const [settings] = await conn.execute(
  "SELECT * FROM shopperDriverSettings WHERE driverUserId = ?", [driver[0]?.id]
);
console.log('\nDriver Shopper Settings:', settings[0] || 'NO SETTINGS');

await conn.end();
