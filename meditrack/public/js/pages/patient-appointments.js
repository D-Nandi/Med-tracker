// ============================================================
// Patient Appointments Page — Read-Only Appointment Viewer
// ============================================================

import { requireAuth } from '../components/auth-guard.js';
import { renderSidebar, renderTopbar, svgIcon } from '../components/sidebar.js';
import { getPatientAppointments } from '../firebase/firestore.js';
import { formatDate, daysUntil, statusBadge } from '../utils/ui.js';
import toast from '../components/toast.js';

// ── State ───────────────────────────────────────────────────
let userData = null;
let allAppointments = [];
let activeFilter = 'upcoming';

// ── DOM helper ──────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);

// ── Initialisation ──────────────────────────────────────────
async function init() {
  try {
    userData = await requireAuth(['patient']);
    renderSidebar(userData, 'appointments');
    renderTopbar('Appointments', userData);

    bindFilterButtons();

    await loadAppointments(userData.uid);
  } catch (e) {
    /* auth-guard handles redirect */
  }
}

// ── Load Appointments ───────────────────────────────────────
async function loadAppointments(patientId) {
  const list = $('#appointments-list');
  if (!list) return;

  // Show skeleton loaders
  list.innerHTML = renderSkeletonItems(4);

  try {
    allAppointments = await getPatientAppointments(patientId);
    applyFilter(activeFilter);
  } catch (err) {
    console.error('Failed to load appointments:', err);
    toast.error('Could not load appointments');
    list.innerHTML = '';
  }
}

// ── Render Appointments ─────────────────────────────────────
function renderAppointments(appointments) {
  const list = $('#appointments-list');
  if (!list) return;

  // Empty state
  if (!appointments || appointments.length === 0) {
    const filterLabel = activeFilter === 'all' ? '' : activeFilter;
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${svgIcon('calendar', 48)}</div>
        <h3>No ${filterLabel} appointments</h3>
        <p>${getEmptyMessage(activeFilter)}</p>
      </div>
    `;
    return;
  }

  list.innerHTML = appointments.map((appt) => {
    const data = appt.data ? appt.data : appt;
    const id = appt.id || '';

    // Parse followUpDate — handle Firestore Timestamp or string
    const followUpDate = parseDate(data.followUpDate);
    const day = followUpDate.getDate();
    const month = followUpDate.toLocaleString('en-US', { month: 'short' });
    const year = followUpDate.getFullYear();

    const doctorName = data.doctorName || 'Unknown';
    const specialization = data.specialization || '';
    const notes = data.notes || '';
    const status = data.status || 'upcoming';

    // Format the date string for daysUntil
    const dateStr = followUpDate.toISOString().split('T')[0];
    const daysUntilText = daysUntil(dateStr);

    return `
      <div class="appointment-item" data-id="${id}" data-status="${status}">
        <div class="appt-date-box">
          <span class="appt-day">${day}</span>
          <span class="appt-month">${month}</span>
        </div>
        <div class="appt-info">
          <div class="appt-title">Follow-Up with Dr. ${escapeHtml(doctorName)}</div>
          <div class="appt-meta">${escapeHtml(specialization)}${specialization && year ? ' · ' : ''}${year}</div>
          ${notes ? `<div class="appt-notes">${escapeHtml(notes)}</div>` : ''}
        </div>
        <div class="appt-status">
          ${statusBadge(status)}
          <span class="appt-days-until">${daysUntilText}</span>
        </div>
      </div>
    `;
  }).join('');
}

// ── Filter Buttons ──────────────────────────────────────────
function bindFilterButtons() {
  const buttons = document.querySelectorAll('.filter-btn[data-status]');
  if (!buttons.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const status = btn.dataset.status;

      // Update active state on buttons
      buttons.forEach((b) => {
        b.classList.remove('btn-primary');
        b.classList.add('btn-ghost');
      });
      btn.classList.remove('btn-ghost');
      btn.classList.add('btn-primary');

      activeFilter = status;
      applyFilter(status);
    });
  });
}

function applyFilter(status) {
  if (status === 'all') {
    renderAppointments(allAppointments);
    return;
  }

  const filtered = allAppointments.filter((appt) => {
    const data = appt.data ? appt.data : appt;
    return (data.status || 'upcoming') === status;
  });

  renderAppointments(filtered);
}

// ── Empty-State Messages ────────────────────────────────────
function getEmptyMessage(filter) {
  switch (filter) {
    case 'upcoming':
      return 'You have no upcoming appointments scheduled.';
    case 'completed':
      return 'No completed appointments to show.';
    case 'cancelled':
      return 'No cancelled appointments.';
    default:
      return 'No appointments found.';
  }
}

// ── Parse Firestore Timestamp or Date String ────────────────
function parseDate(value) {
  if (!value) return new Date();
  // Firestore Timestamp with toDate()
  if (typeof value.toDate === 'function') return value.toDate();
  // Already a Date
  if (value instanceof Date) return value;
  // String / number fallback
  return new Date(value);
}

// ── Skeleton Loader ─────────────────────────────────────────
function renderSkeletonItems(count) {
  return Array.from({ length: count }, () => `
    <div class="appointment-item skeleton-item">
      <div class="appt-date-box">
        <div class="skeleton" style="width:32px;height:28px;margin-bottom:4px"></div>
        <div class="skeleton" style="width:28px;height:14px"></div>
      </div>
      <div class="appt-info" style="flex:1">
        <div class="skeleton skeleton-text" style="width:60%;height:16px;margin-bottom:8px"></div>
        <div class="skeleton skeleton-text" style="width:40%;height:12px"></div>
      </div>
      <div class="appt-status">
        <div class="skeleton" style="width:72px;height:24px;border-radius:var(--radius-full)"></div>
      </div>
    </div>
  `).join('');
}

// ── Utility: Escape HTML ────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Boot ────────────────────────────────────────────────────
init();
