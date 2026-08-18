// ============================================================
// seed-demo-data.mjs — Comprehensive Demo Data Populator
// ============================================================

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import {
  getFirestore, doc, setDoc, addDoc, collection,
  Timestamp
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            "AIzaSyDpijlkW9Fpn-xZRQScMvffbB67K0035DE",
  authDomain:        "meditrack-1b87d.firebaseapp.com",
  projectId:         "meditrack-1b87d",
  storageBucket:     "meditrack-1b87d.firebasestorage.app",
  messagingSenderId: "928230496777",
  appId:             "1:928230496777:web:466426e1ac6e077507b6d8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

async function loginOrCreate(email, password, name, role, extra = {}) {
  let user;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    user = cred.user;
    console.log(`✅ Created Auth account: ${email}`);
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      user = cred.user;
      console.log(`🔑 Signed in: ${email}`);
    } else {
      throw err;
    }
  }

  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    name,
    email,
    role,
    ...extra,
    updatedAt: Timestamp.now()
  }, { merge: true });

  return { uid: user.uid, name, email, role, ...extra };
}

async function safeAdd(colName, data, asRole = '') {
  try {
    const ref = await addDoc(collection(db, colName), data);
    return ref;
  } catch (e) {
    console.warn(`⚠️ Warning adding to ${colName} [${asRole}]:`, e.message);
    return null;
  }
}

async function safeSet(colName, docId, data, asRole = '') {
  try {
    await setDoc(doc(db, colName, docId), data, { merge: true });
    return true;
  } catch (e) {
    console.warn(`⚠️ Warning setting ${colName}/${docId} [${asRole}]:`, e.message);
    return false;
  }
}

async function main() {
  console.log('🌟 MediTrack — Seeding Comprehensive Demo Data...\n');
  const now = new Date();

  // 1. Accounts
  console.log('👤 [1/4] Updating User Accounts...');
  const priya = await loginOrCreate(
    'patient@meditrack.test',
    'Patient@123',
    'Priya Sharma',
    'patient',
    {
      gender: 'female',
      phone: '+91 98765 43210',
      dob: '1995-06-15',
      bloodGroup: 'O+',
      allergies: 'Penicillin, Dust Mites'
    }
  );

  const rahul = await loginOrCreate(
    'patient.male@meditrack.test',
    'Patient@123',
    'Rahul Verma',
    'patient',
    {
      gender: 'male',
      phone: '+91 98111 22334',
      dob: '1992-11-08',
      bloodGroup: 'B+',
      allergies: 'Sulfa Drugs, Peanuts'
    }
  );

  const doctor = await loginOrCreate(
    'doctor@meditrack.test',
    'Doctor@123',
    'Dr. Arjun Mehta',
    'doctor',
    {
      specialization: 'General Physician & Cardiometabolic Specialist',
      phone: '+91 91234 56789',
      dob: '1980-03-22'
    }
  );

  const admin = await loginOrCreate(
    'admin@meditrack.test',
    'Admin@123',
    'Admin User',
    'admin',
    {
      phone: '+91 99900 00001',
      dob: '1985-01-01'
    }
  );

  // 2. Doctor: Prescriptions, Appointments & Medicines
  console.log('\n🩺 [2/4] (As Doctor) Adding Prescriptions, Appointments & Medicines...');
  await signInWithEmailAndPassword(auth, 'doctor@meditrack.test', 'Doctor@123');

  const datePriyaRx1 = new Date(now.getTime() - 14 * 86400000);
  const datePriyaRx2 = new Date(now.getTime() - 4 * 86400000);
  const dateRahulRx1 = new Date(now.getTime() - 20 * 86400000);
  const dateRahulRx2 = new Date(now.getTime() - 6 * 86400000);

  // Priya Prescriptions
  const rxP1 = await safeAdd('prescriptions', {
    patientId: priya.uid,
    patientName: priya.name,
    doctorId: doctor.uid,
    doctorName: doctor.name,
    diagnosis: 'Microcytic Anemia & Vitamin D3 Deficiency',
    status: 'active',
    medicines: [
      { name: 'Autrin-XT (Ferrous Ascorbate)', dosage: '100mg', frequency: 'Once daily', duration: '60 days' },
      { name: 'Calcirol (Vitamin D3)', dosage: '60,000 IU', frequency: 'Once weekly', duration: '8 weeks' },
      { name: 'Folvite (Folic Acid)', dosage: '5mg', frequency: 'Once daily', duration: '60 days' },
      { name: 'Becosules Z Multivitamin', dosage: '1 capsule', frequency: 'Once daily', duration: '30 days' }
    ],
    notes: 'Take iron tablet on an empty stomach with Vitamin C or lemon water. Avoid tea/coffee 2h around iron dose.',
    createdAt: Timestamp.fromDate(datePriyaRx1)
  }, 'doctor');

  const rxP2 = await safeAdd('prescriptions', {
    patientId: priya.uid,
    patientName: priya.name,
    doctorId: doctor.uid,
    doctorName: doctor.name,
    diagnosis: 'Seasonal Allergic Rhinitis & Sinus Congestion',
    status: 'active',
    medicines: [
      { name: 'Montek-LC (Montelukast + Levocetirizine)', dosage: '10mg/5mg', frequency: 'Once daily', duration: '10 days' },
      { name: 'Otrivin Nasal Spray', dosage: '2 puffs', frequency: 'Twice daily', duration: '5 days' }
    ],
    notes: 'Steam inhalation twice daily. Drink warm water throughout the day.',
    createdAt: Timestamp.fromDate(datePriyaRx2)
  }, 'doctor');

  // Rahul Prescriptions
  const rxR1 = await safeAdd('prescriptions', {
    patientId: rahul.uid,
    patientName: rahul.name,
    doctorId: doctor.uid,
    doctorName: doctor.name,
    diagnosis: 'Primary Hypertension Stage 1 & Borderline Dyslipidemia',
    status: 'active',
    medicines: [
      { name: 'Telma 40 (Telmisartan)', dosage: '40mg', frequency: 'Once daily', duration: '90 days' },
      { name: 'Rozavel 10 (Rosuvastatin)', dosage: '10mg', frequency: 'Once daily', duration: '90 days' },
      { name: 'Maxirich Daily Multivitamin', dosage: '1 softgel', frequency: 'Once daily', duration: '60 days' }
    ],
    notes: 'Low sodium diet (<2g daily), 30 mins brisk walking. Log morning BP readings twice a week.',
    createdAt: Timestamp.fromDate(dateRahulRx1)
  }, 'doctor');

  const rxR2 = await safeAdd('prescriptions', {
    patientId: rahul.uid,
    patientName: rahul.name,
    doctorId: doctor.uid,
    doctorName: doctor.name,
    diagnosis: 'Gastroesophageal Reflux (GERD) & Acid Dyspepsia',
    status: 'active',
    medicines: [
      { name: 'Pan-D (Pantoprazole + Domperidone)', dosage: '40mg/30mg', frequency: 'Once daily', duration: '14 days' },
      { name: 'Digene Gel Suspension', dosage: '10ml', frequency: 'As needed', duration: '14 days' }
    ],
    notes: 'Avoid spicy/fried meals and late-night dinners. Maintain 2 hours gap before sleeping.',
    createdAt: Timestamp.fromDate(dateRahulRx2)
  }, 'doctor');

  // Appointments
  const priyaApptDate = new Date(now.getTime() + 4 * 86400000);
  priyaApptDate.setHours(10, 30, 0, 0);

  const rahulApptDate = new Date(now.getTime() + 8 * 86400000);
  rahulApptDate.setHours(11, 15, 0, 0);

  await safeAdd('appointments', {
    patientId: priya.uid,
    patientName: priya.name,
    doctorId: doctor.uid,
    doctorName: doctor.name,
    followUpDate: Timestamp.fromDate(priyaApptDate),
    status: 'upcoming',
    notes: 'Review 4-week iron supplement response, repeat CBC, and allergy recovery.',
    createdAt: Timestamp.fromDate(datePriyaRx1)
  }, 'doctor');

  await safeAdd('appointments', {
    patientId: priya.uid,
    patientName: priya.name,
    doctorId: doctor.uid,
    doctorName: doctor.name,
    followUpDate: Timestamp.fromDate(new Date(now.getTime() - 14 * 86400000)),
    status: 'completed',
    notes: 'Initial clinical evaluation for fatigue & seasonal allergies.',
    createdAt: Timestamp.fromDate(new Date(now.getTime() - 20 * 86400000))
  }, 'doctor');

  await safeAdd('appointments', {
    patientId: rahul.uid,
    patientName: rahul.name,
    doctorId: doctor.uid,
    doctorName: doctor.name,
    followUpDate: Timestamp.fromDate(rahulApptDate),
    status: 'upcoming',
    notes: 'Blood pressure review, repeat fasting lipid profile check & GERD response evaluation.',
    createdAt: Timestamp.fromDate(dateRahulRx1)
  }, 'doctor');

  await safeAdd('appointments', {
    patientId: rahul.uid,
    patientName: rahul.name,
    doctorId: doctor.uid,
    doctorName: doctor.name,
    followUpDate: Timestamp.fromDate(new Date(now.getTime() - 20 * 86400000)),
    status: 'completed',
    notes: 'Executive annual health checkup & antihypertensive therapy initiation.',
    createdAt: Timestamp.fromDate(new Date(now.getTime() - 25 * 86400000))
  }, 'doctor');

  // Medicines (Priya & Rahul)
  await safeAdd('medicines', {
    patientId: priya.uid,
    prescriptionId: rxP1 ? rxP1.id : '',
    medicineName: 'Autrin-XT (Ferrous Ascorbate)',
    dosage: '100mg',
    frequency: 'Once daily',
    time: '08:00 AM',
    duration: '60 days',
    instructions: 'Take in morning with lemon water',
    status: 'taken',
    createdAt: Timestamp.fromDate(datePriyaRx1)
  }, 'doctor');

  await safeAdd('medicines', {
    patientId: priya.uid,
    prescriptionId: rxP1 ? rxP1.id : '',
    medicineName: 'Becosules Z Multivitamin',
    dosage: '1 capsule',
    frequency: 'Once daily',
    time: '01:00 PM',
    duration: '30 days',
    instructions: 'Take after lunch',
    status: 'taken',
    createdAt: Timestamp.fromDate(datePriyaRx1)
  }, 'doctor');

  await safeAdd('medicines', {
    patientId: priya.uid,
    prescriptionId: rxP2 ? rxP2.id : '',
    medicineName: 'Montek-LC (Montelukast + Levocetirizine)',
    dosage: '10mg/5mg',
    frequency: 'Once daily',
    time: '09:30 PM',
    duration: '10 days',
    instructions: 'Take before bedtime',
    status: 'pending',
    createdAt: Timestamp.fromDate(datePriyaRx2)
  }, 'doctor');

  await safeAdd('medicines', {
    patientId: rahul.uid,
    prescriptionId: rxR2 ? rxR2.id : '',
    medicineName: 'Pan-D (Pantoprazole + Domperidone)',
    dosage: '40mg/30mg',
    frequency: 'Once daily',
    time: '07:30 AM',
    duration: '14 days',
    instructions: 'Take 30 mins before morning breakfast',
    status: 'taken',
    createdAt: Timestamp.fromDate(dateRahulRx2)
  }, 'doctor');

  await safeAdd('medicines', {
    patientId: rahul.uid,
    prescriptionId: rxR1 ? rxR1.id : '',
    medicineName: 'Telma 40 (Telmisartan)',
    dosage: '40mg',
    frequency: 'Once daily',
    time: '08:30 AM',
    duration: '90 days',
    instructions: 'Take after breakfast',
    status: 'taken',
    createdAt: Timestamp.fromDate(dateRahulRx1)
  }, 'doctor');

  await safeAdd('medicines', {
    patientId: rahul.uid,
    prescriptionId: rxR1 ? rxR1.id : '',
    medicineName: 'Rozavel 10 (Rosuvastatin)',
    dosage: '10mg',
    frequency: 'Once daily',
    time: '10:00 PM',
    duration: '90 days',
    instructions: 'Take before bedtime',
    status: 'pending',
    createdAt: Timestamp.fromDate(dateRahulRx1)
  }, 'doctor');

  // 3. Priya: Period Tracker Baseline & Logs
  console.log('\n🌸 [3/4] (As Priya Sharma) Saving Period Profile & Daily Logs...');
  await signInWithEmailAndPassword(auth, 'patient@meditrack.test', 'Patient@123');

  const lastPeriodStart = new Date(now.getTime() - 12 * 86400000);
  const lmpIso = `${lastPeriodStart.getFullYear()}-${String(lastPeriodStart.getMonth()+1).padStart(2,'0')}-${String(lastPeriodStart.getDate()).padStart(2,'0')}`;

  await safeSet('periodProfiles', priya.uid, {
    patientId: priya.uid,
    goal: 'track_period',
    avgCycleLength: 28,
    periodDuration: 5,
    regularity: 'regular',
    lastPeriodStart: lmpIso,
    conditions: ['cramps', 'headache'],
    birthControl: 'none',
    updatedAt: Timestamp.now()
  }, 'priya');

  const daysLog = [
    { offset: 12, flow: 'heavy', symptoms: ['cramps', 'fatigue'], mood: 'low', pain: 3, notes: 'First day, mild abdominal cramps' },
    { offset: 11, flow: 'heavy', symptoms: ['cramps'], mood: 'okay', pain: 2, notes: 'Hydrated well, warm compress helped' },
    { offset: 10, flow: 'medium', symptoms: ['bloating'], mood: 'good', pain: 1, notes: 'Feeling much better' },
    { offset: 9,  flow: 'light', symptoms: [], mood: 'great', pain: 0, notes: 'Flow subsided significantly' },
    { offset: 8,  flow: 'spotting', symptoms: [], mood: 'great', pain: 0, notes: 'Last day of period' },
    { offset: 2,  flow: 'none', symptoms: [], mood: 'great', pain: 0, notes: 'High energy day during follicular phase' }
  ];

  for (const item of daysLog) {
    const d = new Date(now.getTime() - item.offset * 86400000);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const docId = `${priya.uid}_${dateStr}`;
    await safeSet('periodLogs', docId, {
      patientId: priya.uid,
      date: dateStr,
      flow: item.flow,
      symptoms: item.symptoms,
      mood: item.mood,
      painLevel: item.pain,
      notes: item.notes,
      loggedAt: Timestamp.fromDate(d)
    }, 'priya');
  }

  // 4. Reports (try as Doctor or Patient)
  console.log('\n📁 [4/4] Adding Diagnostic Reports...');
  await safeAdd('reports', {
    patientId: priya.uid,
    patientName: priya.name,
    reportName: 'Complete Blood Count (CBC) & Ferritin Panel.pdf',
    reportType: 'Blood Test',
    fileUrl: '#',
    fileSize: 1420000,
    notes: 'Hemoglobin: 10.4 g/dL (Mild Anemia), Serum Ferritin: 16 ng/mL, Platelets: 240,000 /uL',
    uploadedAt: Timestamp.fromDate(new Date(now.getTime() - 15 * 86400000))
  }, 'priya');

  await safeAdd('reports', {
    patientId: priya.uid,
    patientName: priya.name,
    reportName: 'Vitamin D & B12 Diagnostic Profile.pdf',
    reportType: 'Blood Test',
    fileUrl: '#',
    fileSize: 980000,
    notes: '25-OH Vitamin D: 18.2 ng/mL (Insufficient), Vitamin B12: 340 pg/mL (Normal)',
    uploadedAt: Timestamp.fromDate(new Date(now.getTime() - 14 * 86400000))
  }, 'priya');

  await safeAdd('reports', {
    patientId: priya.uid,
    patientName: priya.name,
    reportName: 'Pelvic Ultrasound (USG) Scan.pdf',
    reportType: 'Ultrasound',
    fileUrl: '#',
    fileSize: 2850000,
    notes: 'Normal uterine morphology, bilateral ovaries normal, no cysts or fibroids detected.',
    uploadedAt: Timestamp.fromDate(new Date(now.getTime() - 30 * 86400000))
  }, 'priya');

  // Sign in as Rahul for Rahul's reports
  await signInWithEmailAndPassword(auth, 'patient.male@meditrack.test', 'Patient@123');

  await safeAdd('reports', {
    patientId: rahul.uid,
    patientName: rahul.name,
    reportName: 'Comprehensive Lipid & Cholesterol Profile.pdf',
    reportType: 'Blood Test',
    fileUrl: '#',
    fileSize: 1150000,
    notes: 'Total Cholesterol: 218 mg/dL, Triglycerides: 185 mg/dL, HDL: 42 mg/dL, LDL: 139 mg/dL',
    uploadedAt: Timestamp.fromDate(new Date(now.getTime() - 21 * 86400000))
  }, 'rahul');

  await safeAdd('reports', {
    patientId: rahul.uid,
    patientName: rahul.name,
    reportName: '12-Lead Resting Electrocardiogram (ECG).pdf',
    reportType: 'ECG',
    fileUrl: '#',
    fileSize: 840000,
    notes: 'Normal sinus rhythm at 72 bpm, no ST-T segment elevation or ischaemic changes.',
    uploadedAt: Timestamp.fromDate(new Date(now.getTime() - 20 * 86400000))
  }, 'rahul');

  await safeAdd('reports', {
    patientId: rahul.uid,
    patientName: rahul.name,
    reportName: 'Chest X-Ray (PA View).pdf',
    reportType: 'X-Ray',
    fileUrl: '#',
    fileSize: 3200000,
    notes: 'Clear bronchovascular lung fields, normal heart size (<50% CTR), diaphragm clear.',
    uploadedAt: Timestamp.fromDate(new Date(now.getTime() - 60 * 86400000))
  }, 'rahul');

  console.log('\n🎉 Demo records seeded successfully!');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
