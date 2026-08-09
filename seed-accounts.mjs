/**
 * MediTrack — Dummy Account Seeder
 * Run: node seed-accounts.mjs
 * Creates 3 test accounts: 1 patient, 1 doctor, 1 admin
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, updateProfile
} from 'firebase/auth';
import {
  getFirestore, doc, setDoc, serverTimestamp
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

const accounts = [
  {
    name:     'Priya Sharma',
    email:    'patient@meditrack.test',
    password: 'Patient@123',
    role:     'patient',
    phone:    '+91 98765 43210',
    dob:      '1995-06-15'
  },
  {
    name:     'Dr. Arjun Mehta',
    email:    'doctor@meditrack.test',
    password: 'Doctor@123',
    role:     'doctor',
    phone:    '+91 91234 56789',
    dob:      '1980-03-22',
    specialization: 'General Physician'
  },
  {
    name:     'Admin User',
    email:    'admin@meditrack.test',
    password: 'Admin@123',
    role:     'admin',
    phone:    '+91 99900 00001',
    dob:      '1985-01-01'
  }
];

async function createAccount(account) {
  try {
    let uid;
    try {
      const cred = await createUserWithEmailAndPassword(auth, account.email, account.password);
      await updateProfile(cred.user, { displayName: account.name });
      uid = cred.user.uid;
      console.log(`Created: ${account.email}`);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        const cred = await signInWithEmailAndPassword(auth, account.email, account.password);
        uid = cred.user.uid;
        console.log(`Already exists, updating Firestore doc: ${account.email}`);
      } else {
        throw err;
      }
    }

    await setDoc(doc(db, 'users', uid), {
      uid,
      name:           account.name,
      email:          account.email,
      phone:          account.phone || '',
      dob:            account.dob || '',
      role:           account.role,
      specialization: account.specialization || '',
      createdAt:      serverTimestamp(),
      avatar:         ''
    }, { merge: true });

    console.log(`   Firestore doc written for role: ${account.role}`);
  } catch (err) {
    console.error(`Failed for ${account.email}:`, err.message);
  }
}

console.log('MediTrack - Creating dummy test accounts...\n');
for (const account of accounts) {
  await createAccount(account);
}
console.log('\nDone! Use these credentials to log in:\n');
console.log('Patient  ->  patient@meditrack.test  /  Patient@123');
console.log('Doctor   ->  doctor@meditrack.test   /  Doctor@123');
console.log('Admin    ->  admin@meditrack.test    /  Admin@123');
process.exit(0);
