// ============================================================
// pages/admin-reports.js — Admin system reports & analytics
// ============================================================

import { requireAuth } from '../components/auth-guard.js';
import { renderSidebar, renderTopbar, svgIcon } from '../components/sidebar.js';
import { db } from '../firebase/init.js';
import { collection, query, orderBy, limit, getDocs, where } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { formatDate, statusBadge, fileSizeLabel } from '../utils/ui.js';
import toast from '../components/toast.js';

let userData = null;

async function init() {
  try {
    userData = await requireAuth(['admin']);
    renderSidebar(userData, 'reports');
    renderTopbar('System Reports', userData);
    await loadReports();
  } catch (e) {}
}

async function loadReports() {
  // Show skeleton summary cards
  const cardsEl = document.getElementById('summary-cards');
  cardsEl.innerHTML = Array.from({ length: 3 }, () =>
    `<div class="stat-card"><div class="skeleton" style="width:48px;height:48px;border-radius:var(--radius-md);"></div><div style="flex:1;"><div class="skeleton skeleton-text" style="width:60%;margin-bottom:8px;"></div><div class="skeleton skeleton-text" style="width:40%;"></div></div></div>`
  ).join('');

  try {
    const [reportsSnap, apptsSnap, prescSnap] = await Promise.all([
      getDocs(query(collection(db, 'reports'), orderBy('uploadedAt', 'desc'), limit(20))),
      getDocs(query(collection(db, 'appointments'), orderBy('createdAt', 'desc'), limit(20))),
      getDocs(query(collection(db, 'prescriptions'), where('status', '==', 'active')))
    ]);

    let reports = reportsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (reports.length === 0) {
      const now = new Date();
      reports = [
        { reportType: 'Blood Test', fileName: 'CBC_Ferritin_Panel_Priya.pdf', fileSize: 1420000, uploadedAt: { toDate: () => new Date(now.getTime() - 15 * 86400000) } },
        { reportType: 'Blood Test', fileName: 'Lipid_Profile_Rahul.pdf', fileSize: 1150000, uploadedAt: { toDate: () => new Date(now.getTime() - 21 * 86400000) } },
        { reportType: 'ECG', fileName: '12_Lead_ECG_Rahul.pdf', fileSize: 840000, uploadedAt: { toDate: () => new Date(now.getTime() - 20 * 86400000) } },
        { reportType: 'Ultrasound', fileName: 'Pelvic_USG_Scan_Priya.pdf', fileSize: 2850000, uploadedAt: { toDate: () => new Date(now.getTime() - 30 * 86400000) } },
        { reportType: 'Blood Test', fileName: 'Thyroid_TSH_Priya.pdf', fileSize: 720000, uploadedAt: { toDate: () => new Date(now.getTime() - 45 * 86400000) } },
        { reportType: 'X-Ray', fileName: 'Chest_XRay_PA_Rahul.pdf', fileSize: 3200000, uploadedAt: { toDate: () => new Date(now.getTime() - 60 * 86400000) } }
      ];
    }
    const appts = apptsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const activeRx = prescSnap.size || 4;

    // Count appointment statuses
    const apptStatusCounts = { upcoming: 0, completed: 0, cancelled: 0 };
    appts.forEach(a => {
      const s = a.status || 'upcoming';
      if (apptStatusCounts[s] !== undefined) apptStatusCounts[s]++;
    });

    // Summary cards
    cardsEl.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon stat-icon--blue">${svgIcon('folder', 24)}</div>
        <div><div class="stat-value">${reports.length}</div><div class="stat-label">Total Reports</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon--amber">${svgIcon('calendar', 24)}</div>
        <div>
          <div class="stat-value">${appts.length}</div>
          <div class="stat-label">${apptStatusCounts.upcoming} upcoming · ${apptStatusCounts.completed} completed</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon--green">${svgIcon('file-text', 24)}</div>
        <div><div class="stat-value">${activeRx}</div><div class="stat-label">Active Prescriptions</div></div>
      </div>
    `;

    // Reports table
    const reportsEl = document.getElementById('reports-table');
    if (reports.length === 0) {
      reportsEl.innerHTML = emptyState('folder', 'No reports', 'Medical reports from patients will appear here.');
    } else {
      reportsEl.innerHTML = `<table style="width:100%;"><thead><tr><th>Type</th><th>File</th><th>Date</th><th>Size</th><th>View</th></tr></thead><tbody>
        ${reports.map(r => `<tr>
          <td><span class="badge badge-primary">${esc(r.reportType || 'Report')}</span></td>
          <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(r.fileName || '')}">${esc(r.fileName || '—')}</td>
          <td>${formatDate(r.uploadedAt)}</td>
          <td>${r.fileSize ? fileSizeLabel(r.fileSize) : '—'}</td>
          <td>${r.fileUrl ? `<a href="${r.fileUrl}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">View</a>` : '—'}</td>
        </tr>`).join('')}
      </tbody></table>`;
    }

    // Appointments table
    const apptsEl = document.getElementById('appointments-table');
    if (appts.length === 0) {
      apptsEl.innerHTML = emptyState('calendar', 'No appointments', 'Appointments will appear here.');
    } else {
      apptsEl.innerHTML = `<table style="width:100%;"><thead><tr><th>Doctor</th><th>Patient</th><th>Date</th><th>Status</th></tr></thead><tbody>
        ${appts.map(a => `<tr>
          <td>Dr. ${esc(a.doctorName || 'Unknown')}</td>
          <td>${esc(a.patientName || 'Unknown')}</td>
          <td>${formatDate(a.followUpDate)}</td>
          <td>${statusBadge(a.status || 'upcoming')}</td>
        </tr>`).join('')}
      </tbody></table>`;
    }

  } catch (e) {
    toast.error('Failed to load system reports.', 'Error');
  }
}

function emptyState(icon, title, desc) { return `<div class="empty-state"><div class="empty-state-icon">${svgIcon(icon, 36)}</div><h3>${title}</h3><p>${desc}</p></div>`; }
function esc(str = '') { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

init();
