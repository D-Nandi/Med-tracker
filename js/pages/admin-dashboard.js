// ============================================================
// pages/admin-dashboard.js — Admin dashboard logic
// ============================================================

import { requireAuth } from '../components/auth-guard.js';
import { renderSidebar, renderTopbar, svgIcon } from '../components/sidebar.js';
import { getAdminStats, getUserById } from '../firebase/firestore.js';
import { db } from '../firebase/init.js';
import { collection, query, orderBy, limit, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { formatDate, statusBadge } from '../utils/ui.js';
import toast from '../components/toast.js';

let userData = null;

async function init() {
  try {
    userData = await requireAuth(['admin']);
    renderSidebar(userData, 'dashboard');
    renderTopbar('Admin Dashboard', userData);
    await loadDashboardData();
  } catch (e) {}
}

async function loadDashboardData() {
  const statsGrid = document.getElementById('stats-grid');
  statsGrid.innerHTML = Array.from({ length: 4 }, () =>
    `<div class="stat-card"><div class="skeleton" style="width:48px;height:48px;border-radius:var(--radius-md);"></div><div style="flex:1;"><div class="skeleton skeleton-text" style="width:60%;margin-bottom:8px;"></div><div class="skeleton skeleton-text" style="width:40%;"></div></div></div>`
  ).join('');

  try {
    const [stats, recentRxSnap] = await Promise.all([
      getAdminStats(),
      getDocs(query(collection(db, 'prescriptions'), orderBy('createdAt', 'desc'), limit(10)))
    ]);

    // Render stats
    statsGrid.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon stat-icon--blue">${svgIcon('users', 24)}</div>
        <div><div class="stat-value">${stats.totalPatients}</div><div class="stat-label">Total Patients</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon--green">${svgIcon('user-check', 24)}</div>
        <div><div class="stat-value">${stats.totalDoctors}</div><div class="stat-label">Total Doctors</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon--amber">${svgIcon('file-text', 24)}</div>
        <div><div class="stat-value">${stats.totalPrescriptions}</div><div class="stat-label">Prescriptions</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon--red">${svgIcon('calendar', 24)}</div>
        <div><div class="stat-value">${stats.upcomingAppts}</div><div class="stat-label">Upcoming Appts</div></div>
      </div>
    `;

    // Recent activity
    const activityEl = document.getElementById('recent-activity');
    const rxDocs = recentRxSnap.docs;
    if (rxDocs.length === 0) {
      activityEl.innerHTML = emptyState('clock', 'No recent activity', 'Activity will appear here as the system is used.');
      return;
    }

    activityEl.innerHTML = `<table style="width:100%;"><thead><tr><th>Date</th><th>Doctor</th><th>Patient</th><th>Diagnosis</th></tr></thead><tbody>
      ${rxDocs.map(d => {
        const dt = d.data();
        return `<tr>
          <td>${formatDate(dt.createdAt)}</td>
          <td>Dr. ${esc(dt.doctorName || 'Unknown')}</td>
          <td>${esc(dt.patientName || 'Unknown')}</td>
          <td>${esc(dt.diagnosis || '—')}</td>
        </tr>`;
      }).join('')}
    </tbody></table>`;

  } catch (e) {
    toast.error('Failed to load dashboard data.', 'Error');
  }
}

function emptyState(icon, title, desc) { return `<div class="empty-state"><div class="empty-state-icon">${svgIcon(icon, 36)}</div><h3>${title}</h3><p>${desc}</p></div>`; }
function esc(str = '') { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

init();
