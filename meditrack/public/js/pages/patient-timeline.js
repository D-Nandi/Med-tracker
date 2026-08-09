/**
 * ============================================================
 *  MediTrack — Patient Health Timeline
 * ============================================================
 *  Aggregates prescriptions, reports, appointments & medicines
 *  into a single chronological feed grouped by month.
 * ============================================================
 */

import { requireAuth } from '../components/auth-guard.js';
import { renderSidebar, renderTopbar, svgIcon } from '../components/sidebar.js';
import { db } from '../firebase/init.js';
import { collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { formatDate } from '../utils/ui.js';
import toast from '../components/toast.js';

/* ── State ─────────────────────────────────────────────────── */
let userData = null;

/* ── DOM refs ──────────────────────────────────────────────── */
const timelineContent = () => document.getElementById('timeline-content');

/* ── Bootstrap ─────────────────────────────────────────────── */
async function init() {
  try {
    userData = await requireAuth(['patient']);
    renderSidebar(userData, 'timeline');
    renderTopbar('Health Timeline', userData);
    await loadTimeline(userData.uid);
  } catch (e) {
    /* auth-guard handles redirect */
  }
}

/* ── Skeleton loader ───────────────────────────────────────── */
function showSkeleton() {
  const container = timelineContent();
  if (!container) return;

  let html = '';
  for (let i = 0; i < 6; i++) {
    html += `
      <div class="timeline-item" style="opacity:.55">
        <div class="timeline-dot"></div>
        <div class="timeline-date"><span class="skeleton" style="width:80px;height:14px;display:inline-block"></span></div>
        <div class="timeline-content">
          <div class="timeline-title"><span class="skeleton" style="width:200px;height:16px;display:inline-block"></span></div>
          <div class="timeline-desc"><span class="skeleton" style="width:140px;height:14px;display:inline-block"></span></div>
        </div>
      </div>`;
  }

  container.innerHTML = `<div class="timeline">${html}</div>`;
}

/* ── Data loading ──────────────────────────────────────────── */
async function loadTimeline(uid) {
  showSkeleton();

  try {
    /* ---- Parallel Firestore queries ---- */
    const [prescSnap, reportSnap, apptSnap, medSnap] = await Promise.all([
      getDocs(query(collection(db, 'prescriptions'), where('patientId', '==', uid))),
      getDocs(query(collection(db, 'reports'),       where('patientId', '==', uid))),
      getDocs(query(collection(db, 'appointments'),  where('patientId', '==', uid))),
      getDocs(query(collection(db, 'medicines'),     where('patientId', '==', uid)))
    ]);

    const events = [];

    /* ---- Prescriptions ---- */
    prescSnap.forEach(d => {
      const data = d.data();
      const medicineCount = Array.isArray(data.medicines) ? data.medicines.length : 0;
      events.push({
        type:     'prescription',
        icon:     'file-text',
        title:    `Prescription: ${data.diagnosis || 'N/A'}`,
        desc:     `Dr. ${data.doctorName || 'Unknown'} • ${medicineCount} medicine(s)`,
        dotClass: '',
        date:     data.createdAt
      });
    });

    /* ---- Reports ---- */
    reportSnap.forEach(d => {
      const data = d.data();
      events.push({
        type:     'report',
        icon:     'folder',
        title:    `${data.reportType || 'Report'} Uploaded`,
        desc:     data.fileName || 'File',
        dotClass: 'timeline-dot--green',
        date:     data.uploadedAt
      });
    });

    /* ---- Appointments ---- */
    apptSnap.forEach(d => {
      const data = d.data();
      events.push({
        type:     'appointment',
        icon:     'calendar',
        title:    `Follow-Up with Dr. ${data.doctorName || 'Unknown'}`,
        desc:     data.status || 'Scheduled',
        dotClass: 'timeline-dot--amber',
        date:     data.followUpDate
      });
    });

    /* ---- Medicines ---- */
    medSnap.forEach(d => {
      const data = d.data();
      events.push({
        type:     'medicine',
        icon:     'pill',
        title:    `Medicine Added: ${data.medicineName || 'Unknown'}`,
        desc:     `${data.dosage || ''} • ${data.frequency || ''}`,
        dotClass: '',
        date:     data.createdAt
      });
    });

    renderTimeline(events);
  } catch (err) {
    console.error('Timeline load error:', err);
    toast.error('Failed to load timeline.');
  }
}

/* ── Rendering ─────────────────────────────────────────────── */

/**
 * Safely convert a Firestore Timestamp (or string / number) to a Date.
 */
function toDate(val) {
  return val?.toDate?.() || new Date(val || 0);
}

/**
 * Group label for a Date object → "June 2026"
 */
function monthLabel(date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function renderTimeline(events) {
  const container = timelineContent();
  if (!container) return;

  /* ── Empty state ── */
  if (events.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${svgIcon('clock', 48)}</div>
        <h3>No health activity recorded yet</h3>
        <p>Your prescriptions, reports, appointments and medicines will appear here.</p>
      </div>`;
    return;
  }

  /* ── Sort descending by date ── */
  events.sort((a, b) => toDate(b.date) - toDate(a.date));

  /* ── Group by month ── */
  const grouped = new Map();
  events.forEach(evt => {
    const d   = toDate(evt.date);
    const key = monthLabel(d);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push({ ...evt, _date: d });
  });

  /* ── Build HTML ── */
  let html = '';

  grouped.forEach((items, month) => {
    html += `<h3 class="timeline-month-heading" style="
      margin: 24px 0 12px;
      font-family: var(--font-primary);
      font-size: 1.05rem;
      color: var(--color-muted-text);
    ">${month}</h3>`;

    html += '<div class="timeline">';

    items.forEach(evt => {
      const dotModifier = evt.dotClass ? ` ${evt.dotClass}` : '';
      html += `
        <div class="timeline-item">
          <div class="timeline-dot${dotModifier}"></div>
          <div class="timeline-date">${formatDate(evt.date)}</div>
          <div class="timeline-content">
            <div class="timeline-title">${svgIcon(evt.icon, 16)} ${escapeText(evt.title)}</div>
            <div class="timeline-desc">${escapeText(evt.desc)}</div>
          </div>
        </div>`;
    });

    html += '</div>';
  });

  container.innerHTML = html;
}

/* ── Helpers ────────────────────────────────────────────────── */
function escapeText(str) {
  const el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}

/* ── Start ─────────────────────────────────────────────────── */
init();
