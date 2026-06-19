if (process.env.NODE_ENV === 'production') {
  console.error('Seed script cannot run in production');
  process.exit(1);
}

const { default: db } = await import('./index.js');

export {};

// Clear existing data
db.exec('DELETE FROM sms_log');
db.exec('DELETE FROM appointments');
db.exec('DELETE FROM invoices');
db.exec('DELETE FROM patients');

// Reset auto-increment
db.exec("DELETE FROM sqlite_sequence WHERE name IN ('patients', 'appointments', 'invoices', 'sms_log')");

// Create demo patients
const patients = [
  { first_name: 'Maria', last_name: 'Schmidt', phone: '+43 650 1234567', email: 'maria.schmidt@email.at', birthdate: '1985-03-15' },
  { first_name: 'Max', last_name: 'Müller', phone: '+43 660 9876543', email: 'max.mueller@web.de', birthdate: '1972-08-22' },
  { first_name: 'Anna', last_name: 'Weber', phone: '+43 650 5551234', email: 'anna.weber@gmx.at', birthdate: '1990-11-30' },
  { first_name: 'Thomas', last_name: 'Gruber', phone: '+43 660 1112233', email: 'thomas.gruber@gmail.com', birthdate: '1968-05-10' },
  { first_name: 'Lisa', last_name: 'Huber', phone: '+43 650 4445566', email: 'lisa.huber@outlook.at', birthdate: '1995-01-20' },
];

const insertPatient = db.prepare(`
  INSERT INTO patients (first_name, last_name, phone, email, birthdate)
  VALUES (?, ?, ?, ?, ?)
`);

patients.forEach(p => {
  insertPatient.run(p.first_name, p.last_name, p.phone, p.email, p.birthdate);
});
console.log(`✅ ${patients.length} patients created`);

// Create demo appointments for today and upcoming days
const today = new Date().toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const dayAfter = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);

const appointments = [
  { patient_id: 1, date: today, time_start: '09:00', time_end: '10:00', treatment_type: 'Massage', notes: 'Rückenschmerzen' },
  { patient_id: 2, date: today, time_start: '10:30', time_end: '11:30', treatment_type: 'Physiotherapie', notes: 'Knöchel verstaucht' },
  { patient_id: 3, date: today, time_start: '14:00', time_end: '15:00', treatment_type: 'Training', notes: 'Reha nach OP' },
  { patient_id: 4, date: tomorrow, time_start: '09:00', time_end: '10:00', treatment_type: 'Physiotherapie', notes: '' },
  { patient_id: 5, date: tomorrow, time_start: '11:00', time_end: '12:00', treatment_type: 'Massage', notes: 'Nackenverspannung' },
  { patient_id: 1, date: dayAfter, time_start: '15:00', time_end: '16:00', treatment_type: 'Folgekontrolle', notes: '' },
  { patient_id: 3, date: dayAfter, time_start: '10:00', time_end: '11:00', treatment_type: 'Beratung', notes: 'Neue Therapieplanung' },
];

const insertAppointment = db.prepare(`
  INSERT INTO appointments (patient_id, date, time_start, time_end, treatment_type, notes)
  VALUES (?, ?, ?, ?, ?, ?)
`);

appointments.forEach(a => {
  insertAppointment.run(a.patient_id, a.date, a.time_start, a.time_end, a.treatment_type, a.notes);
});
console.log(`✅ ${appointments.length} appointments created`);

// Create demo invoices
const invoices = [
  { patient_id: 1, units: 10, rate_per_unit: 50, description: 'Massage + Physiotherapie', paid: 1 },
  { patient_id: 2, units: 8, rate_per_unit: 50, description: 'Physiotherapie', paid: 0 },
  { patient_id: 3, units: 12, rate_per_unit: 45, description: 'Trainingseinheit', paid: 0 },
  { patient_id: 4, units: 6, rate_per_unit: 55, description: 'Physiotherapie + Beratung', paid: 1 },
];

const insertInvoice = db.prepare(`
  INSERT INTO invoices (invoice_number, patient_id, units, rate_per_unit, total, description, paid)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

invoices.forEach((inv, i) => {
  const invoiceNumber = `RF-${today.replace(/-/g, '')}-${String(i + 1).padStart(3, '0')}`;
  insertInvoice.run(invoiceNumber, inv.patient_id, inv.units, inv.rate_per_unit, inv.units * inv.rate_per_unit, inv.description, inv.paid);
});
console.log(`✅ ${invoices.length} invoices created`);

console.log('🎉 Demo data seeded successfully!');
console.log('');
console.log('📊 Summary:');
console.log(`   - ${patients.length} patients`);
console.log(`   - ${appointments.length} appointments (today, tomorrow, day after)`);
console.log(`   - ${invoices.length} invoices (${invoices.filter(i => !i.paid).length} unpaid)`);
