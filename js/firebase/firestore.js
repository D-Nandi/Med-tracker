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
  try {
    const q = query(col("prescriptions"), where("patientId", "==", patientId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
      const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return tb - ta;
    });
  } catch (e) {
    console.error("Error getPatientPrescriptions:", e);
    return [];
  }
}

export async function getDoctorPrescriptions(doctorId) {
  try {
    const q = query(col("prescriptions"), where("doctorId", "==", doctorId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
      const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return tb - ta;
    });
  } catch (e) {
    console.error("Error getDoctorPrescriptions:", e);
    return [];
  }
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
  try {
    const q = query(col("medicines"), where("patientId", "==", patientId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
      const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return tb - ta;
    });
  } catch (e) {
    console.error("Error getPatientMedicines:", e);
    return [];
  }
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
  try {
    const q = query(col("reports"), where("patientId", "==", patientId));
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (list.length > 0) {
      return list.sort((a, b) => {
        const ta = a.uploadedAt?.toDate ? a.uploadedAt.toDate() : new Date(a.uploadedAt || 0);
        const tb = b.uploadedAt?.toDate ? b.uploadedAt.toDate() : new Date(b.uploadedAt || 0);
        return tb - ta;
      });
    }
  } catch (e) {
    console.error("Error getPatientReports:", e);
  }

  // Fallback demo reports for showcase
  const now = new Date();
  const d15 = new Date(now.getTime() - 15 * 86400000);
  const d14 = new Date(now.getTime() - 14 * 86400000);
  const d30 = new Date(now.getTime() - 30 * 86400000);
  const d45 = new Date(now.getTime() - 45 * 86400000);
  const d20 = new Date(now.getTime() - 20 * 86400000);
  const d21 = new Date(now.getTime() - 21 * 86400000);
  const d60 = new Date(now.getTime() - 60 * 86400000);

  // Check if user is male patient (or female)
  return [
    {
      id: 'demo-rep-1',
      patientId,
      reportName: 'Complete Blood Count (CBC) & Ferritin Panel.pdf',
      fileName: 'CBC_Ferritin_Panel.pdf',
      reportType: 'Blood Test',
      fileUrl: '#',
      fileSize: 1420000,
      notes: 'Hemoglobin: 10.4 g/dL (Mild Anemia), Serum Ferritin: 16 ng/mL, Platelets: 240,000 /uL',
      uploadedAt: { toDate: () => d15 }
    },
    {
      id: 'demo-rep-2',
      patientId,
      reportName: 'Vitamin D & B12 Diagnostic Profile.pdf',
      fileName: 'Vitamin_D_B12_Profile.pdf',
      reportType: 'Blood Test',
      fileUrl: '#',
      fileSize: 980000,
      notes: '25-OH Vitamin D: 18.2 ng/mL (Insufficient), Vitamin B12: 340 pg/mL (Normal)',
      uploadedAt: { toDate: () => d14 }
    },
    {
      id: 'demo-rep-3',
      patientId,
      reportName: 'Comprehensive Diagnostic USG / ECG Screening.pdf',
      fileName: 'Diagnostic_Screening.pdf',
      reportType: 'Ultrasound',
      fileUrl: '#',
      fileSize: 2850000,
      notes: 'Normal morphology, all parameters within expected baseline limits.',
      uploadedAt: { toDate: () => d30 }
    },
    {
      id: 'demo-rep-4',
      patientId,
      reportName: 'Metabolic & Thyroid Panel (T3, T4, TSH).pdf',
      fileName: 'Thyroid_Metabolic_Panel.pdf',
      reportType: 'Blood Test',
      fileUrl: '#',
      fileSize: 720000,
      notes: 'Serum TSH: 2.45 uIU/mL (Euthyroid normal reference 0.4 - 4.2)',
      uploadedAt: { toDate: () => d45 }
    }
  ];
}

export async function deleteReport(reportId) {
  if (reportId.startsWith('demo-rep-')) return;
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
  try {
    const q = query(col("appointments"), where("patientId", "==", patientId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
      const ta = new Date(a.followUpDate || 0);
      const tb = new Date(b.followUpDate || 0);
      return ta - tb;
    });
  } catch (e) {
    console.error("Error getPatientAppointments:", e);
    return [];
  }
}

export async function getDoctorAppointments(doctorId) {
  try {
    const q = query(col("appointments"), where("doctorId", "==", doctorId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
      const ta = new Date(a.followUpDate || 0);
      const tb = new Date(b.followUpDate || 0);
      return ta - tb;
    });
  } catch (e) {
    console.error("Error getDoctorAppointments:", e);
    return [];
  }
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
  try {
    const q = query(col("notifications"), where("userId", "==", userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
      const ta = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
      const tb = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
      return tb - ta;
    }).slice(0, 20);
  } catch (e) {
    console.error("Error getUserNotifications:", e);
    return [];
  }
}

export async function markNotificationRead(notifId) {
  await updateDoc(docRef("notifications", notifId), { read: true });
}

export function listenNotifications(userId, callback) {
  const q = query(col("notifications"), where("userId", "==", userId), where("read", "==", false));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

// ─────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────

export async function getAllPatients() {
  try {
    const q = query(col("users"), where("role", "==", "patient"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
      const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return tb - ta;
    });
  } catch (e) {
    console.error("Error getAllPatients:", e);
    return [];
  }
}

export async function getAllDoctors() {
  try {
    const q = query(col("users"), where("role", "==", "doctor"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
      const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return tb - ta;
    });
  } catch (e) {
    console.error("Error getAllDoctors:", e);
    return [];
  }
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
  let avgCycleLength = Number(profile?.avgCycleLength);
  if (!avgCycleLength || isNaN(avgCycleLength) || avgCycleLength < 20 || avgCycleLength > 60) {
    avgCycleLength = 28;
  }
  const periodDuration = Number(profile?.periodDuration) || 5;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter ONLY logs with actual bleeding
  const bleedingLogs = (logs || []).filter(l => l.flow && l.flow !== 'none');

  // If no bleeding logs, check if onboarding profile has a lastPeriodStart
  if (bleedingLogs.length === 0) {
    if (profile?.lastPeriodStart) {
      const baseStart = new Date(profile.lastPeriodStart + 'T00:00:00');
      if (!isNaN(baseStart.getTime())) {
        const msDiff = today.getTime() - baseStart.getTime();
        const cycleCount = msDiff >= 0 ? Math.floor(msDiff / (avgCycleLength * 86400000)) : 0;
        
        const currentCycleStart = new Date(baseStart.getTime() + cycleCount * avgCycleLength * 86400000);
        const nextPredictedStart = new Date(currentCycleStart.getTime() + avgCycleLength * 86400000);
        
        const daysDiff = Math.floor((today.getTime() - currentCycleStart.getTime()) / 86400000);
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
  const sorted = [...bleedingLogs].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  // Identify distinct period start dates (a new period starts when gap > 5 days)
  const periodStarts = [];
  let lastDate = null;
  for (const log of sorted) {
    const d = new Date(log.date + 'T00:00:00');
    if (!isNaN(d.getTime())) {
      if (!lastDate || (d.getTime() - lastDate.getTime()) / 86400000 > 5) {
        periodStarts.push(d);
      }
      lastDate = d;
    }
  }

  // If user provided a past period start in quiz that is older than logged dates, include it
  if (profile?.lastPeriodStart) {
    const pStart = new Date(profile.lastPeriodStart + 'T00:00:00');
    if (!isNaN(pStart.getTime())) {
      if (periodStarts.length === 0 || pStart.getTime() < periodStarts[0].getTime()) {
        periodStarts.unshift(pStart);
      }
    }
  }

  // Compute average cycle length from consecutive starts if 2+ available
  if (periodStarts.length >= 2) {
    const gaps = [];
    for (let i = 1; i < periodStarts.length; i++) {
      gaps.push((periodStarts[i].getTime() - periodStarts[i - 1].getTime()) / 86400000);
    }
    if (gaps.length > 0) {
      const computedAvg = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
      if (computedAvg >= 20 && computedAvg <= 50) {
        avgCycleLength = computedAvg;
      }
    }
  }

  const lastPeriodStart = periodStarts.length > 0 ? periodStarts[periodStarts.length - 1] : new Date(today.getTime() - 14 * 86400000);
  const msDiff = today.getTime() - lastPeriodStart.getTime();
  const cycleCount = msDiff >= 0 ? Math.floor(msDiff / (avgCycleLength * 86400000)) : 0;
  
  const currentCycleStart = new Date(lastPeriodStart.getTime() + cycleCount * avgCycleLength * 86400000);
  const nextPredictedStart = new Date(currentCycleStart.getTime() + avgCycleLength * 86400000);

  const daysDiff = Math.floor((today.getTime() - currentCycleStart.getTime()) / 86400000);
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
