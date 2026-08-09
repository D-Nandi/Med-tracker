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
// PERIOD TRACKING & PERSONALIZATION
// ─────────────────────────────────────────────────────────────

/**
 * Save or update period personalization profile for a patient.
 * @param {string} patientId
 * @param {object} profileData
 */
export async function savePeriodProfile(patientId, profileData) {
  await setDoc(doc(db, 'periodProfiles', patientId), {
    patientId,
    ...profileData,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

/**
 * Fetch period personalization profile for a patient.
 * @param {string} patientId
 */
export async function getPeriodProfile(patientId) {
  try {
    const snap = await getDoc(doc(db, 'periodProfiles', patientId));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
  } catch (err) {
    console.error('Error fetching period profile:', err);
  }
  return null;
}

/**
 * Log or update a single period day for a patient.
 * Uses the date string as the document ID so re-logging a day is an upsert.
 * @param {string} patientId
 * @param {{ date: string, flow: string, symptoms: string[], mood: string, painLevel: number, notes: string }} data
 */
export async function logPeriodDay(patientId, data) {
  // Use "patientId_date" as doc ID so each day has exactly one record
  const docId = `${patientId}_${data.date}`;
  await setDoc(doc(db, 'periodLogs', docId), {
    patientId,
    ...data,
    updatedAt: serverTimestamp()
  }, { merge: true });
  return docId;
}

/**
 * Fetch all period logs for a patient, sorted newest first.
 * Sorted client-side to avoid requiring a composite index in Firestore.
 */
export async function getPeriodLogs(patientId) {
  const q = query(
    collection(db, 'periodLogs'),
    where('patientId', '==', patientId)
  );
  const snap = await getDocs(q);
  const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return logs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

/**
 * Delete a single period day log.
 */
export async function deletePeriodLog(logId) {
  await deleteDoc(doc(db, 'periodLogs', logId));
}

/**
 * Compute cycle statistics from period logs and onboarding profile.
 * Only logs with actual bleeding (flow !== 'none') are used for period calculations.
 * Returns: avgCycleLength, lastPeriodStart, nextPredictedStart, currentCycleDay, isFromProfile.
 * @param {Array} logs - Array of logged days (period and/or non-period symptom logs)
 * @param {Object} [profile] - User's personalization quiz profile
 */
export function getCycleStats(logs, profile = null) {
  let avgCycleLength = profile?.avgCycleLength ? Number(profile.avgCycleLength) : 28;
  const periodDuration = profile?.periodDuration ? Number(profile.periodDuration) : 5;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter ONLY logs with actual bleeding
  const bleedingLogs = (logs || []).filter(l => l.flow && l.flow !== 'none');

  // If no bleeding logs, check if onboarding profile has a lastPeriodStart
  if (bleedingLogs.length === 0) {
    if (profile?.lastPeriodStart) {
      const baseStart = new Date(profile.lastPeriodStart + 'T00:00:00');
      
      // Project cycles forward from baseStart until we find the current cycle and next prediction
      let currentCycleStart = new Date(baseStart);
      while ((today - currentCycleStart) / 86400000 >= avgCycleLength) {
        currentCycleStart.setDate(currentCycleStart.getDate() + avgCycleLength);
      }

      const nextPredictedStart = new Date(currentCycleStart);
      nextPredictedStart.setDate(nextPredictedStart.getDate() + avgCycleLength);

      const daysDiff = Math.floor((today - currentCycleStart) / 86400000);
      const currentCycleDay = daysDiff >= 0 ? daysDiff + 1 : 1;

      return {
        avgCycleLength,
        periodDuration,
        lastPeriodStart: currentCycleStart,
        nextPredictedStart,
        currentCycleDay,
        isFromProfile: true,
        goal: profile.goal || 'track_period'
      };
    }

    return {
      avgCycleLength,
      periodDuration,
      lastPeriodStart: null,
      nextPredictedStart: null,
      currentCycleDay: null,
      isFromProfile: false,
      goal: profile?.goal || 'track_period'
    };
  }

  // Sort ascending by date
  const sorted = [...bleedingLogs].sort((a, b) => new Date(a.date) - new Date(b.date));

  // Identify distinct period start dates (a new period starts when gap > 5 days)
  const periodStarts = [];
  let lastDate = null;
  for (const log of sorted) {
    const d = new Date(log.date + 'T00:00:00');
    if (!lastDate || (d - lastDate) / 86400000 > 5) {
      periodStarts.push(d);
    }
    lastDate = d;
  }

  // If user provided a past period start in quiz that is older than logged dates, include it
  if (profile?.lastPeriodStart) {
    const pStart = new Date(profile.lastPeriodStart + 'T00:00:00');
    if (periodStarts.length === 0 || pStart < periodStarts[0]) {
      periodStarts.unshift(pStart);
    }
  }

  // Compute average cycle length from consecutive starts if 2+ available
  if (periodStarts.length >= 2) {
    const gaps = [];
    for (let i = 1; i < periodStarts.length; i++) {
      gaps.push((periodStarts[i] - periodStarts[i - 1]) / 86400000);
    }
    const computedAvg = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
    if (computedAvg >= 20 && computedAvg <= 50) {
      avgCycleLength = computedAvg;
    }
  }

  let lastPeriodStart = periodStarts[periodStarts.length - 1];
  
  // Project to find current cycle if last start was more than avgCycleLength ago
  let currentCycleStart = new Date(lastPeriodStart);
  while ((today - currentCycleStart) / 86400000 >= avgCycleLength) {
    currentCycleStart.setDate(currentCycleStart.getDate() + avgCycleLength);
  }

  const nextPredictedStart = new Date(currentCycleStart);
  nextPredictedStart.setDate(nextPredictedStart.getDate() + avgCycleLength);

  const daysDiff = Math.floor((today - currentCycleStart) / 86400000);
  const currentCycleDay = daysDiff >= 0 ? daysDiff + 1 : 1;

  return {
    avgCycleLength,
    periodDuration,
    lastPeriodStart,
    nextPredictedStart,
    currentCycleDay,
    isFromProfile: bleedingLogs.length === 0,
    goal: profile?.goal || 'track_period'
  };
}

// ─────────────────────────────────────────────────────────────
// HEALTH TIMELINE (combined events — includes period & symptom logs)
// ─────────────────────────────────────────────────────────────

export async function getHealthTimeline(patientId) {
  const [prescriptions, reports, appointments, periodLogs] = await Promise.all([
    getPatientPrescriptions(patientId),
    getPatientReports(patientId),
    getPatientAppointments(patientId),
    getPeriodLogs(patientId)
  ]);

  // Separate bleeding logs from non-bleeding symptom check-ins
  const bleedingLogs  = periodLogs.filter(l => l.flow && l.flow !== 'none');
  const symptomOnlyLogs = periodLogs.filter(l => !l.flow || l.flow === 'none');

  // Group consecutive period bleeding dates into ranges
  const periodEvents = [];
  if (bleedingLogs.length > 0) {
    const sorted = [...bleedingLogs].sort((a, b) => new Date(a.date) - new Date(b.date));
    let rangeStart = sorted[0].date;
    let rangeEnd   = sorted[0].date;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].date);
      const curr = new Date(sorted[i].date);
      if ((curr - prev) / 86400000 <= 1) {
        rangeEnd = sorted[i].date;
      } else {
        periodEvents.push({ rangeStart, rangeEnd });
        rangeStart = sorted[i].date;
        rangeEnd   = sorted[i].date;
      }
    }
    periodEvents.push({ rangeStart, rangeEnd });
  }

  // Map non-bleeding symptom check-in days
  const symptomEvents = symptomOnlyLogs.map(s => {
    const symptomList = (s.symptoms || []).map(sym => sym.replace('_', ' ')).join(', ');
    const desc = [
      s.mood ? `Mood: ${s.mood}` : '',
      symptomList ? `Symptoms: ${symptomList}` : '',
      s.painLevel ? `Pain: ${s.painLevel}/5` : ''
    ].filter(Boolean).join(' • ') || 'Daily health check-in';

    return {
      type: 'symptom_log',
      date: s.date,
      title: `Daily Health Log: ${s.date}`,
      subtitle: desc,
      id: s.id
    };
  });

  const events = [
    ...prescriptions.map(p => ({
      type: 'prescription', date: p.createdAt, title: 'New Prescription',
      subtitle: p.diagnosis, id: p.id
    })),
    ...reports.map(r => ({
      type: 'report', date: r.uploadedAt, title: 'Report Uploaded',
      subtitle: r.reportType, id: r.id
    })),
    ...appointments.map(a => ({
      type: 'appointment', date: a.createdAt, title: 'Appointment Scheduled',
      subtitle: `Follow-up: ${a.followUpDate}`, id: a.id
    })),
    ...periodEvents.map(p => ({
      type: 'period',
      date: p.rangeStart,
      title: p.rangeStart === p.rangeEnd ? `Period Log: ${p.rangeStart}` : `Period: ${p.rangeStart} → ${p.rangeEnd}`,
      subtitle: 'Menstrual cycle bleeding',
      id: p.rangeStart
    })),
    ...symptomEvents
  ];

  // Sort newest first (handle Firestore Timestamp or string)
  events.sort((a, b) => {
    const ta = a.date?.toDate?.() || new Date(a.date || 0);
    const tb = b.date?.toDate?.() || new Date(b.date || 0);
    return tb - ta;
  });

  return events;
}
