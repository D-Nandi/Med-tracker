// ============================================================
// firebase/firestore.js — Firestore data service
// ============================================================

import {
  collection, doc, addDoc, setDoc, getDoc, getDocs,
  updateDoc, deleteDoc, query, where, orderBy, limit,
  serverTimestamp, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { db } from "./init.js";

// ── Helpers ────────────────────────────────────────────────────
const col  = name => collection(db, name);
const docRef = (name, id) => doc(db, name, id);

// ─────────────────────────────────────────────────────────────
// PRESCRIPTIONS
// ─────────────────────────────────────────────────────────────

export async function createPrescription(data) {
  const ref = await addDoc(col("prescriptions"), {
    ...data,
    createdAt: serverTimestamp(),
    status: "active"
  });
  return ref.id;
}

export async function getPatientPrescriptions(patientId) {
  const q = query(col("prescriptions"), where("patientId", "==", patientId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getDoctorPrescriptions(doctorId) {
  const q = query(col("prescriptions"), where("doctorId", "==", doctorId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getPrescription(id) {
  const snap = await getDoc(docRef("prescriptions", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ─────────────────────────────────────────────────────────────
// MEDICINES
// ─────────────────────────────────────────────────────────────

export async function addMedicine(prescriptionId, data) {
  const ref = await addDoc(col("medicines"), {
    ...data,
    prescriptionId,
    createdAt: serverTimestamp(),
    status: "active" // active | completed | missed
  });
  return ref.id;
}

export async function getPatientMedicines(patientId) {
  const q = query(col("medicines"), where("patientId", "==", patientId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateMedicineStatus(medicineId, status) {
  await updateDoc(docRef("medicines", medicineId), { status, updatedAt: serverTimestamp() });
}

// ─────────────────────────────────────────────────────────────
// REPORTS
// ─────────────────────────────────────────────────────────────

export async function addReport(data) {
  const ref = await addDoc(col("reports"), {
    ...data,
    uploadedAt: serverTimestamp()
  });
  return ref.id;
}

export async function getPatientReports(patientId) {
  const q = query(col("reports"), where("patientId", "==", patientId), orderBy("uploadedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function deleteReport(reportId) {
  await deleteDoc(docRef("reports", reportId));
}

// ─────────────────────────────────────────────────────────────
// APPOINTMENTS
// ─────────────────────────────────────────────────────────────

export async function createAppointment(data) {
  const ref = await addDoc(col("appointments"), {
    ...data,
    status: "upcoming",
    createdAt: serverTimestamp()
  });
  return ref.id;
}

export async function getPatientAppointments(patientId) {
  const q = query(col("appointments"), where("patientId", "==", patientId), orderBy("followUpDate", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getDoctorAppointments(doctorId) {
  const q = query(col("appointments"), where("doctorId", "==", doctorId), orderBy("followUpDate", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateAppointmentStatus(apptId, status) {
  await updateDoc(docRef("appointments", apptId), { status, updatedAt: serverTimestamp() });
}

// ─────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────

export async function createNotification(userId, title, message) {
  await addDoc(col("notifications"), {
    userId, title, message,
    read: false,
    timestamp: serverTimestamp()
  });
}

export async function getUserNotifications(userId) {
  const q = query(col("notifications"), where("userId", "==", userId), orderBy("timestamp", "desc"), limit(20));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function markNotificationRead(notifId) {
  await updateDoc(docRef("notifications", notifId), { read: true });
}

export function listenNotifications(userId, callback) {
  const q = query(col("notifications"), where("userId", "==", userId), where("read", "==", false), orderBy("timestamp", "desc"));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

// ─────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────

export async function getAllPatients() {
  const q = query(col("users"), where("role", "==", "patient"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getAllDoctors() {
  const q = query(col("users"), where("role", "==", "doctor"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getUserById(uid) {
  const snap = await getDoc(docRef("users", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateUserProfile(uid, data) {
  await updateDoc(docRef("users", uid), { ...data, updatedAt: serverTimestamp() });
}

// ─────────────────────────────────────────────────────────────
// ADMIN STATS
// ─────────────────────────────────────────────────────────────

export async function getAdminStats() {
  const [patients, doctors, prescriptions, appointments] = await Promise.all([
    getDocs(query(col("users"), where("role", "==", "patient"))),
    getDocs(query(col("users"), where("role", "==", "doctor"))),
    getDocs(col("prescriptions")),
    getDocs(query(col("appointments"), where("status", "==", "upcoming")))
  ]);
  return {
    totalPatients:     patients.size,
    totalDoctors:      doctors.size,
    totalPrescriptions: prescriptions.size,
    upcomingAppts:     appointments.size
  };
}

// ─────────────────────────────────────────────────────────────
// HEALTH TIMELINE (combined events)
// ─────────────────────────────────────────────────────────────

export async function getHealthTimeline(patientId) {
  const [prescriptions, reports, appointments] = await Promise.all([
    getPatientPrescriptions(patientId),
    getPatientReports(patientId),
    getPatientAppointments(patientId)
  ]);

  const events = [
    ...prescriptions.map(p => ({
      type: "prescription", date: p.createdAt, title: "New Prescription",
      subtitle: p.diagnosis, id: p.id
    })),
    ...reports.map(r => ({
      type: "report", date: r.uploadedAt, title: "Report Uploaded",
      subtitle: r.reportType, id: r.id
    })),
    ...appointments.map(a => ({
      type: "appointment", date: a.createdAt, title: "Appointment Scheduled",
      subtitle: `Follow-up: ${a.followUpDate}`, id: a.id
    }))
  ];

  // Sort newest first (handle Firestore Timestamp or string)
  events.sort((a, b) => {
    const ta = a.date?.toDate?.() || new Date(a.date || 0);
    const tb = b.date?.toDate?.() || new Date(b.date || 0);
    return tb - ta;
  });

  return events;
}
