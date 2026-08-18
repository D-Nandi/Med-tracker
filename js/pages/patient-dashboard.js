// =============================================
// MediTrack - Patient Dashboard Logic
// =============================================
import { requireAuth } from "../components/auth-guard.js";
import { renderSidebar, renderTopbar, svgIcon } from "../components/sidebar.js";
import { db } from "../firebase/init.js";
import { collection, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getPeriodLogs, getCycleStats, getPeriodProfile } from "../firebase/firestore.js";
import toast from "../components/toast.js";

let userData = null;

async function init() {
  try {
    userData = await requireAuth(['patient']);
    renderSidebar(userData, 'dashboard');
    renderTopbar('Dashboard', userData);

    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const welcomeEl = document.getElementById('welcome-msg');
    if (welcomeEl) {
      welcomeEl.textContent = `${greet}, ${userData.name?.split(' ')[0] || 'there'}!`;
    }

    await loadDashboardData();
  } catch (err) {
    console.error('Init error:', err);
  }
}

async function loadDashboardData() {
  showSkeletons();
  try {
    const uid = userData.uid;
    const [presSnap, medsSnap, reportsSnap, apptSnap] = await Promise.all([
      getDocs(query(collection(db, 'prescriptions'), where('patientId', '==', uid))),
      getDocs(query(collection(db, 'medicines'), where('patientId', '==', uid))),
      getDocs(query(collection(db, 'reports'), where('patientId', '==', uid))),
      getDocs(query(collection(db, 'appointments'), where('patientId', '==', uid), where('status', '==', 'upcoming')))
    ]);
    const stats = { prescriptions: presSnap.size, medicines: medsSnap.size, reports: reportsSnap.size, appointments: apptSnap.size };
    renderStats(stats);
    renderRecentPrescriptions(presSnap.docs.slice(0, 3));
    renderUpcomingAppointments(apptSnap.docs.slice(0, 3));
    renderTodayMedicines(medsSnap.docs.slice(0, 4));
    renderTimeline(presSnap.docs, reportsSnap.docs, apptSnap.docs);
    loadCycleOverview(uid);
  } catch (err) {
    toast.error('Failed to load dashboard data.', 'Error');
    console.error(err);
  }
}

function showSkeletons() {
  document.getElementById('stats-grid').innerHTML = Array(4).fill(`
    <div class="stat-card"><div class="skeleton" style="width:52px;height:52px;border-radius:10px;"></div><div><div class="skeleton skeleton-title" style="width:60px;"></div><div class="skeleton skeleton-text" style="width:100px;"></div></div></div>
  `).join('');
}

function renderStats({ prescriptions, medicines, reports, appointments }) {
  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon stat-icon--blue">${svgIcon('file-text')}</div>
      <div><div class="stat-value">${prescriptions}</div><div class="stat-label">Prescriptions</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon stat-icon--green">${svgIcon('pill')}</div>
      <div><div class="stat-value">${medicines}</div><div class="stat-label">Active Medicines</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon stat-icon--amber">${svgIcon('folder')}</div>
      <div><div class="stat-value">${reports}</div><div class="stat-label">Uploaded Reports</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon stat-icon--red">${svgIcon('calendar')}</div>
      <div><div class="stat-value">${appointments}</div><div class="stat-label">Upcoming Follow-Ups</div></div>
    </div>
  `;
}

function renderRecentPrescriptions(docs) {
  const el = document.getElementById('recent-prescriptions');
  if (!docs.length) { el.innerHTML = emptyState('file-text', 'No prescriptions yet', 'Your doctor will add prescriptions here.'); return; }
  el.innerHTML = docs.map(d => {
    const data = d.data();
    const date = data.date?.toDate ? data.date.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
    const meds = data.medicines || [];
    return `<div class="prescription-card" onclick="window.location.href='prescriptions.html'">
      <div class="prescription-header">
        <span class="prescription-date">${date}</span>
        <span class="badge badge-primary">Rx</span>
      </div>
      <div class="prescription-diagnosis">${data.diagnosis || 'General Prescription'}</div>
      <div class="prescription-meds">${meds.slice(0,3).map(m => `<span class="med-chip">${m.name || m}</span>`).join('')}${meds.length > 3 ? `<span class="med-chip">+${meds.length-3} more</span>` : ''}</div>
    </div>`;
  }).join('');
}

function renderUpcomingAppointments(docs) {
  const el = document.getElementById('upcoming-appointments');
  if (!docs.length) { el.innerHTML = emptyState('calendar', 'No upcoming appointments', 'Your doctor will schedule follow-ups here.'); return; }
  el.innerHTML = docs.map(d => {
    const data = d.data();
    const date = data.followUpDate?.toDate ? data.followUpDate.toDate() : new Date();
    const day = date.getDate();
    const month = date.toLocaleDateString('en-IN', { month: 'short' });
    const daysLeft = Math.ceil((date - new Date()) / 86400000);
    return `<div class="appointment-item">
      <div class="appt-date-box"><div class="appt-day">${day}</div><div class="appt-month">${month}</div></div>
      <div class="appt-info">
        <div class="appt-title">Follow-Up Visit</div>
        <div class="appt-doctor">${data.doctorName || 'Doctor'}</div>
        <div class="appt-time">${daysLeft > 0 ? `In ${daysLeft} day${daysLeft !== 1 ? 's' : ''}` : 'Today'}</div>
      </div>
      <span class="badge ${daysLeft <= 2 ? 'badge-danger' : daysLeft <= 7 ? 'badge-warning' : 'badge-primary'}">${daysLeft <= 0 ? 'Today' : `${daysLeft}d left`}</span>
    </div>`;
  }).join('');
}

function renderTodayMedicines(docs) {
  const el = document.getElementById('today-medicines');
  if (!docs.length) { el.innerHTML = emptyState('pill', 'No medicines scheduled', 'Your medicines will appear here.'); return; }
  el.innerHTML = docs.map(d => {
    const data = d.data();
    return `<div class="medicine-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
        <div><div class="medicine-name">${data.medicineName || 'Medicine'}</div><div class="medicine-dosage">${data.dosage || ''} — ${data.frequency || ''}</div></div>
        <span class="badge ${data.status === 'taken' ? 'badge-success' : data.status === 'missed' ? 'badge-danger' : 'badge-warning'}">${data.status || 'pending'}</span>
      </div>
      <div class="medicine-time">${svgIcon('clock', 14)} ${data.time || '8:00 AM'}</div>
    </div>`;
  }).join('');
}

function renderTimeline(presDocs, reportDocs, apptDocs) {
  const el = document.getElementById('health-timeline');
  const events = [
    ...presDocs.map(d => ({ type: 'prescription', date: d.data().date?.toDate?.() || new Date(), title: `Prescription: ${d.data().diagnosis || 'General'}`, dot: '' })),
    ...reportDocs.map(d => ({ type: 'report', date: d.data().uploadedAt?.toDate?.() || new Date(), title: `Report Uploaded: ${d.data().reportType || 'Medical Report'}`, dot: 'green' })),
    ...apptDocs.map(d => ({ type: 'appointment', date: d.data().followUpDate?.toDate?.() || new Date(), title: `Follow-Up Appointment`, dot: 'amber' })),
  ].sort((a, b) => b.date - a.date).slice(0, 6);
  if (!events.length) { el.innerHTML = emptyState('clock', 'No activity yet', 'Your health timeline will appear here.'); return; }
  el.innerHTML = `<div class="timeline">${events.map(ev => `
    <div class="timeline-item">
      <div class="timeline-dot ${ev.dot ? 'timeline-dot--' + ev.dot : ''}"></div>
      <div class="timeline-date">${ev.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
      <div class="timeline-content"><div class="timeline-title">${ev.title}</div></div>
    </div>`).join('')}</div>`;
}

function emptyState(icon, title, desc) {
  return `<div class="empty-state"><div class="empty-state-icon">${svgIcon(icon, 36)}</div><h3>${title}</h3><p>${desc}</p></div>`;
}

async function loadCycleOverview(uid) {
  const el = document.getElementById('cycle-overview');
  if (!el) return;

  const card = el.closest('.card') || document.getElementById('cycle-overview-card');
  if (userData?.gender === 'male') {
    if (card) card.style.display = 'none';
    return;
  }

  try {
    const [logs, profile] = await Promise.all([
      getPeriodLogs(uid),
      getPeriodProfile(uid)
    ]);
    const stats  = getCycleStats(logs, profile);
    const logMap = Object.fromEntries(logs.map(l => [l.date, l]));

    const { avgCycleLength, nextPredictedStart, currentCycleDay, isFromProfile } = stats;
    const today   = new Date(); today.setHours(0,0,0,0);
    const year    = today.getFullYear();
    const month   = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = `${year}-${String(month+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    if (logs.length === 0 && !profile?.lastPeriodStart) {
      el.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">${svgIcon('cycle', 32)}</div>
        <h3>No cycle data yet</h3>
        <p>Take the quick personalization quiz to customize predictions & insights.</p>
        <a href="period-tracker.html" class="btn btn-primary btn-sm" style="background:var(--color-period);border-color:var(--color-period);margin-top:4px;">Open Period Tracker</a>
      </div>`;
      return;
    }

    // Stats row
    const cycleDayText   = currentCycleDay && currentCycleDay > 0 ? `Day ${currentCycleDay}` : '—';
    let   nextPeriodText = '—';
    if (nextPredictedStart) {
      const daysUntil = Math.ceil((nextPredictedStart - today) / 86400000);
      nextPeriodText = daysUntil > 0
        ? `In ${daysUntil}d`
        : daysUntil === 0 ? 'Today' : nextPredictedStart.toLocaleDateString('en-US', { month:'short', day:'numeric' });
    }

    // Build predicted set for mini-strip
    const predictedDates = new Set();
    if (nextPredictedStart) {
      for (let i = 0; i < 5; i++) {
        const d = new Date(nextPredictedStart); d.setDate(d.getDate() + i);
        const s = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        predictedDates.add(s);
      }
    }

    // Mini strip (current month only)
    let stripHtml = '';
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      let cls = 'cycle-mini-cell';
      const logEntry = logMap[ds];
      if (logEntry && logEntry.flow && logEntry.flow !== 'none') {
        cls += ' period';
      } else if (logEntry && (!logEntry.flow || logEntry.flow === 'none')) {
        cls += ' symptom-only';
      } else if (predictedDates.has(ds)) {
        cls += ' predicted';
      }
      if (ds === todayStr) cls += ' today';
      stripHtml += `<div class="${cls}" title="${ds}" aria-hidden="true"></div>`;
    }

    el.innerHTML = `
      <div class="cycle-overview-row">
        <div class="cycle-mini-stat">
          <div class="cycle-mini-value">${cycleDayText}</div>
          <div class="cycle-mini-label">Day of Cycle</div>
        </div>
        <div class="cycle-mini-stat">
          <div class="cycle-mini-value" style="color:var(--color-fertile)">${nextPeriodText}</div>
          <div class="cycle-mini-label">Next Period</div>
        </div>
        <div class="cycle-mini-stat">
          <div class="cycle-mini-value" style="color:var(--color-foreground)">${avgCycleLength}d</div>
          <div class="cycle-mini-label">Avg. Cycle</div>
        </div>
      </div>
      <div class="cycle-mini-strip" aria-label="This month's cycle strip">${stripHtml}</div>
      <div style="margin-top:10px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
        <span style="display:flex;align-items:center;gap:5px;font-size:0.75rem;color:var(--color-muted-text);"><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:var(--color-period);"></span>Logged</span>
        <span style="display:flex;align-items:center;gap:5px;font-size:0.75rem;color:var(--color-muted-text);"><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:var(--color-period-light);border:1.5px solid var(--color-prediction);"></span>Predicted</span>
      </div>`;
  } catch (err) {
    console.error('Cycle overview error:', err);
    el.innerHTML = emptyState('cycle', 'Could not load cycle data', '');
  }
}

init();
