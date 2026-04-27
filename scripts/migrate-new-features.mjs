import mysql from 'mysql2/promise';

async function migrate() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  console.log('Connected to database');

  // ===== 1. حقول التحقق من المندوب =====
  const [driverCols] = await conn.execute('SHOW COLUMNS FROM drivers');
  const driverFields = driverCols.map(c => c.Field);

  const driverAlterations = [
    { field: 'nationalId', sql: 'ALTER TABLE drivers ADD COLUMN nationalId varchar(20) NULL COMMENT "رقم الهوية الوطنية"' },
    { field: 'licenseNumber', sql: 'ALTER TABLE drivers ADD COLUMN licenseNumber varchar(30) NULL COMMENT "رقم رخصة القيادة"' },
    { field: 'licenseExpiry', sql: 'ALTER TABLE drivers ADD COLUMN licenseExpiry date NULL COMMENT "تاريخ انتهاء الرخصة"' },
    { field: 'vehiclePlate', sql: 'ALTER TABLE drivers ADD COLUMN vehiclePlate varchar(20) NULL COMMENT "لوحة السيارة"' },
    { field: 'vehicleModel', sql: 'ALTER TABLE drivers ADD COLUMN vehicleModel varchar(100) NULL COMMENT "موديل السيارة"' },
    { field: 'vehicleYear', sql: 'ALTER TABLE drivers ADD COLUMN vehicleYear int NULL COMMENT "سنة السيارة"' },
    { field: 'vehicleColor', sql: 'ALTER TABLE drivers ADD COLUMN vehicleColor varchar(50) NULL COMMENT "لون السيارة"' },
    { field: 'isVerified', sql: 'ALTER TABLE drivers ADD COLUMN isVerified tinyint(1) NOT NULL DEFAULT 0 COMMENT "هل تم التحقق من هوية المندوب"' },
    { field: 'verifiedAt', sql: 'ALTER TABLE drivers ADD COLUMN verifiedAt timestamp NULL COMMENT "تاريخ التحقق"' },
    { field: 'verificationNotes', sql: 'ALTER TABLE drivers ADD COLUMN verificationNotes text NULL COMMENT "ملاحظات التحقق"' },
  ];

  for (const alt of driverAlterations) {
    if (!driverFields.includes(alt.field)) {
      await conn.execute(alt.sql);
      console.log(`Added drivers.${alt.field}`);
    } else {
      console.log(`drivers.${alt.field} already exists`);
    }
  }

  // ===== 2. جدول الشكاوى =====
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS complaints (
      id int AUTO_INCREMENT PRIMARY KEY,
      userId int NULL COMMENT 'phoneUsers.id',
      userPhone varchar(20) NULL,
      userName varchar(255) NULL,
      orderId int NULL,
      orderNumber varchar(50) NULL,
      category enum('delivery','driver','restaurant','payment','other') NOT NULL DEFAULT 'other',
      subject varchar(255) NOT NULL,
      description text NOT NULL,
      status enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
      adminReply text NULL,
      repliedAt timestamp NULL,
      createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('complaints table ready');

  // ===== 3. التحقق من termsAccepted في phoneUsers =====
  const [userCols] = await conn.execute('SHOW COLUMNS FROM phoneUsers');
  const userFields = userCols.map(c => c.Field);
  if (!userFields.includes('termsAccepted')) {
    await conn.execute('ALTER TABLE phoneUsers ADD COLUMN termsAccepted tinyint(1) NOT NULL DEFAULT 0');
    console.log('Added phoneUsers.termsAccepted');
  }
  if (!userFields.includes('termsAcceptedAt')) {
    await conn.execute('ALTER TABLE phoneUsers ADD COLUMN termsAcceptedAt timestamp NULL');
    console.log('Added phoneUsers.termsAcceptedAt');
  }

  await conn.end();
  console.log('\n✅ All migrations completed successfully');
}

migrate().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
