// ============================================================
// pages/admin-patients.js — Admin patient management
// ============================================================

import { requireAuth } from '../components/auth-guard.js';
import { renderSidebar, renderTopbar, svgIcon } from '../components/sidebar.js';
import { getAllPatients, getUserById, getPatientPrescriptions, getPatientReports, getPatientAppointments } from '../firebase/firestore.js';
import { formatDate, getInitials, statusBadge } from '../utils/ui.js';
import toast from '../components/toast.js';

let userData = null;
let allPatients = [];

async function init() {
  try {
    userData = await requireAuth(['admin']);
    renderSidebar(userData, 'patients');
    renderTopbar('All Patients', userData);
    bindEvents();
    await loadPatients();
  } catch (e) {}
}

function bindEvents() {
  document.getElementById('search-patients')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    renderTable(allPatients.filter(p => (p.name||'').toLowerCase().includes(q) || (p.email||'').toLowerCase().includes(q)));
  });
  document.getElementById('close-patient-modal')?.addEventListener('click', closeModal);
  document.getElementById('patient-modal')?.addEventListener('click', e => { if (e.target.id === 'patient-modal') closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

async function loadPatients() {
  const el = document.getElementById('patients-table');
  el.innerHTML = `<table style="width:100%;"><thead><tr><th>Patient</th><th>Email</th><th>Phone</th><th>Joined</th><th>Actions</th></tr></thead><tbody>
    ${Array.from({length:5}, () => `<tr>${Array.from({length:5}, () => '<td><div class="skeleton skeleton-text"></div></td>').join('')}</tr>`).join('')}
  </tbody></table>`;

  try {
    allPatients = await getAllPatients();
    renderTable(allPatients);
  } catch (e) {
    toast.error('Failed to load patients.', 'Error');
  }
}

function renderTable(patients) {
  const el = document.getElementById('patients-table');
  if (patients.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${svgIcon('users', 36)}</div><h3>No patients found</h3><p>Patients will appear here after they register.</p></div>`;
    return;
  }
  el.innerHTML = `<table style="width:100%;"><thead><tr><th>Patient</th><th>Email</th><th>Phone</th><th>Joined</th><th>Actions</th></tr></thead><tbody>
    ${patients.map(p => `<tr>
      <td style="display:flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;border-radius:50%;background:var(--color-primary-light);color:var(--color-primary);display:flex;align-items:center;justify-content:center;font-weight:600;font-size:0.75rem;">${getInitials(p.name)}</div>
        ${esc(p.name || 'Unknown')}
      </td>
      <td style="color:var(--color-muted-text);">${esc(p.email || '—')}</td>
      <td>${esc(p.phone || '—')}</td>
      <td>${formatDate(p.createdAt)}</td>
      <td><button class="btn btn-ghost btn-sm view-patient" data-uid="${p.id}">View</button></td>
    </tr>`).join('')}
  </tbody></table>`;

  el.querySelectorAll('.view-patient').forEach(btn => {
    btn.addEventListener('click', () => showPatientDetail(btn.dataset.uid));
  });
}

async function showPatientDetail(patientId) {
  const content = document.getElementById('patient-modal-content');
  content.innerHTML = '<div class="spinner" style="margin:40px auto;"></div>';
  document.getElementById('patient-modal').style.display = 'flex';

  try {
    const [profile, prescriptions, reports, appointments] = await Promise.all([
      getUserById(patientId),
      getPatientPrescriptions(patientId),
      getPatientReports(patientId),
      getPatientAppointments(patientId)
    ]);

    if (!profile) { content.innerHTML = '<p>Patient not found.</p>'; return; }

    content.innerHTML = `
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;padding:16px;background:var(--color-muted);border-radius:var(--radius-md);">
        <div style="width:56px;height:56px;border-radius:50%;background:var(--color-primary);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.25rem;">${getInitials(profile.name)}</div>
        <div>
          <div style="font-weight:700;font-size:1.125rem;">${esc(profile.name || 'Unknown')}</div>
          <div style="font-size:0.875rem;color:var(--color-muted-text);">${esc(profile.email || '')}${profile.phone ? ' • ' + esc(profile.phone) : ''}</div>
          <div style="display:flex;gap:6px;margin-top:6px;">
            ${profile.bloodGroup ? `<span class="badge badge-warning">${esc(profile.bloodGroup)}</span>` : ''}
            ${profile.dob ? `<span class="badge badge-muted">DOB: ${esc(profile.dob)}</span>` : ''}
          </div>
          ${profile.allergies ? `<div style="font-size:0.8rem;color:var(--color-destructive);margin-top:4px;">Allergies: ${esc(profile.allergies)}</div>` : ''}
        </div>
      </div>

      <h3 style="font-size:1rem;font-weight:700;margin-bottom:12px;">Prescriptions (${prescriptions.length})</h3>
      ${prescriptions.length ? prescriptions.slice(0, 10).map(rx => `
        <div style="padding:10px 12px;border:1px solid var(--color-border);border-radius:var(--radius-md);margin-bottom:6px;display:flex;justify-content:space-between;">
          <div><strong>${esc(rx.diagnosis || 'General')}</strong><span style="font-size:0.8rem;color:var(--color-muted-text);margin-left:8px;">Dr. ${esc(rx.doctorName || 'Unknown')}</span></div>
          <span style="font-size:0.8rem;color:var(--color-muted-text);">${formatDate(rx.createdAt)}</span>
        </div>
      `).join('') : '<p style="color:var(--color-muted-text);font-size:0.875rem;">No prescriptions.</p>'}

      <h3 style="font-size:1rem;font-weight:700;margin:20px 0 12px;">Reports (${reports.length})</h3>
      ${reports.length ? reports.slice(0, 5).map(r => `
        <div style="padding:10px 12px;border:1px solid var(--color-border);border-radius:var(--radius-md);margin-bottom:6px;display:flex;justify-content:space-between;">
          <span>${esc(r.reportType || 'Report')}</span>
          <span style="font-size:0.8rem;color:var(--color-muted-text);">${formatDate(r.uploadedAt)}</span>
        </div>
      `).join('') : '<p style="color:var(--color-muted-text);font-size:0.875rem;">No reports.</p>'}

      <h3 style="font-size:1rem;font-weight:700;margin:20px 0 12px;">Appointments (${appointments.length})</h3>
      ${appointments.length ? appointments.slice(0, 5).map(a => `
        <div style="display:flex;justify-content:space-between;padding:10px 12px;border:1px solid var(--color-border);border-radius:var(--radius-md);margin-bottom:6px;">
          <span>${formatDate(a.followUpDate)} — Dr. ${esc(a.doctorName || 'Unknown')}</span>
          ${statusBadge(a.status)}
        </div>
      `).join('') : '<p style="color:var(--color-muted-text);font-size:0.875rem;">No appointments.</p>'}
    `;
  } catch (e) {
    content.innerHTML = '<p>Failed to load patient details.</p>';
    toast.error('Error loading details.');
  }
}

function closeModal() { document.getElementById('patient-modal').style.display = 'none'; }
function esc(str = '') { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

init();
