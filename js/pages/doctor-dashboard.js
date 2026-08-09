// ============================================================
// pages/doctor-dashboard.js — Doctor dashboard logic
// ============================================================

import { requireAuth } from '../components/auth-guard.js';
import { renderSidebar, renderTopbar, svgIcon } from '../components/sidebar.js';
import { getDoctorPrescriptions, getDoctorAppointments, getUserById } from '../firebase/firestore.js';
import { formatDate, statusBadge, getInitials } from '../utils/ui.js';
import toast from '../components/toast.js';

let userData = null;

async function init() {
  try {
    userData = await requireAuth(['doctor']);
    renderSidebar(userData, 'dashboard');
    renderTopbar('Dashboard', userData);
    document.getElementById('welcome-msg').textContent = `Welcome, Dr. ${userData.name || 'Doctor'}`;
    await loadDashboardData(userData.uid);
  } catch (e) { /* auth-guard handles redirect */ }
}

async function loadDashboardData(uid) {
  // Show skeleton stats
  const statsGrid = document.getElementById('stats-grid');
  statsGrid.innerHTML = Array.from({ length: 4 }, () =>
    `<div class="stat-card"><div class="skeleton" style="width:48px;height:48px;border-radius:var(--radius-md);"></div><div style="flex:1;"><div class="skeleton skeleton-text" style="width:60%;margin-bottom:8px;"></div><div class="skeleton skeleton-text" style="width:40%;"></div></div></div>`
  ).join('');

  try {
    const [prescriptions, appointments] = await Promise.all([
      getDoctorPrescriptions(uid),
      getDoctorAppointments(uid)
    ]);

    // Get unique patients
    const patientIds = [...new Set(prescriptions.map(p => p.patientId).filter(Boolean))];
    const patientProfiles = {};
    await Promise.all(patientIds.map(async id => {
      const profile = await getUserById(id);
      if (profile) patientProfiles[id] = profile;
    }));

    const now = new Date();
    const todayStr = now.toDateString();
    const upcoming = appointments.filter(a => a.status === 'upcoming');
    const completedToday = appointments.filter(a => {
      const d = a.followUpDate?.toDate?.() || new Date(a.followUpDate || 0);
      return a.status === 'completed' && d.toDateString() === todayStr;
    });

    // Render stats
    statsGrid.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon stat-icon--blue">${svgIcon('users', 24)}</div>
        <div><div class="stat-value">${patientIds.length}</div><div class="stat-label">Total Patients</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon--green">${svgIcon('file-text', 24)}</div>
        <div><div class="stat-value">${prescriptions.length}</div><div class="stat-label">Prescriptions</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon--amber">${svgIcon('calendar', 24)}</div>
        <div><div class="stat-value">${upcoming.length}</div><div class="stat-label">Upcoming Appointments</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon--red">${svgIcon('heart', 24)}</div>
        <div><div class="stat-value">${completedToday.length}</div><div class="stat-label">Completed Today</div></div>
      </div>
    `;

    // Recent patients (last 5 unique)
    const recentEl = document.getElementById('recent-patients');
    if (patientIds.length === 0) {
      recentEl.innerHTML = emptyState('users', 'No patients yet', 'Patients will appear here after you create prescriptions.');
    } else {
      const recent = patientIds.slice(0, 5);
      recentEl.innerHTML = `<table style="width:100%;"><thead><tr><th>Patient</th><th>Email</th><th>Last Prescription</th></tr></thead><tbody>
        ${recent.map(pid => {
          const p = patientProfiles[pid] || {};
          const lastRx = prescriptions.find(rx => rx.patientId === pid);
          const date = lastRx ? formatDate(lastRx.createdAt) : '—';
          return `<tr>
            <td style="display:flex;align-items:center;gap:10px;">
              <div style="width:32px;height:32px;border-radius:50%;background:var(--color-primary-light);color:var(--color-primary);display:flex;align-items:center;justify-content:center;font-weight:600;font-size:0.75rem;">${getInitials(p.name)}</div>
              ${esc(p.name || 'Unknown')}
            </td>
            <td style="color:var(--color-muted-text);">${esc(p.email || '—')}</td>
            <td>${date}</td>
          </tr>`;
        }).join('')}
      </tbody></table>`;
    }

    // Today's appointments
    const apptEl = document.getElementById('today-appointments');
    const todayAppts = appointments.filter(a => {
      const d = a.followUpDate?.toDate?.() || new Date(a.followUpDate || 0);
      return d.toDateString() === todayStr;
    });

    if (todayAppts.length === 0) {
      apptEl.innerHTML = emptyState('calendar', 'No appointments today', 'Your scheduled appointments for today will appear here.');
    } else {
      apptEl.innerHTML = todayAppts.map(a => {
        const d = a.followUpDate?.toDate?.() || new Date(a.followUpDate || 0);
        const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        return `<div class="appointment-item" style="margin-bottom:12px;">
          <div class="appt-date-box"><div class="appt-day">${d.getDate()}</div><div class="appt-month">${d.toLocaleDateString('en-IN',{month:'short'})}</div></div>
          <div class="appt-info">
            <div class="appt-title">${esc(a.patientName || 'Patient')}</div>
            <div class="appt-doctor" style="font-size:0.8rem;color:var(--color-muted-text);">${time}${a.notes ? ' • ' + esc(a.notes) : ''}</div>
          </div>
          <div>${statusBadge(a.status)}</div>
        </div>`;
      }).join('');
    }

  } catch (e) {
    toast.error('Failed to load dashboard data.', 'Error');
  }
}

function emptyState(icon, title, desc) {
  return `<div class="empty-state"><div class="empty-state-icon">${svgIcon(icon, 36)}</div><h3>${title}</h3><p>${desc}</p></div>`;
}

function esc(str = '') { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

init();
