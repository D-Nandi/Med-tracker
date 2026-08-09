// ============================================================
// pages/doctor-patients.js — Doctor's patient list
// ============================================================

import { requireAuth } from '../components/auth-guard.js';
import { renderSidebar, renderTopbar, svgIcon } from '../components/sidebar.js';
import { getDoctorPrescriptions, getUserById, getPatientPrescriptions, getPatientReports, getPatientAppointments } from '../firebase/firestore.js';
import { formatDate, statusBadge, getInitials } from '../utils/ui.js';
import toast from '../components/toast.js';

let userData = null;
let allPatients = [];

async function init() {
  try {
    userData = await requireAuth(['doctor']);
    renderSidebar(userData, 'patients');
    renderTopbar('My Patients', userData);
    bindEvents();
    await loadPatients(userData.uid);
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

async function loadPatients(doctorId) {
  const tableEl = document.getElementById('patients-table');
  tableEl.innerHTML = `<table style="width:100%;"><thead><tr><th>Patient</th><th>Email</th><th>Last Visit</th><th>Prescriptions</th><th>Actions</th></tr></thead><tbody>
    ${Array.from({length:5}, () => `<tr>${Array.from({length:5}, () => '<td><div class="skeleton skeleton-text"></div></td>').join('')}</tr>`).join('')}
  </tbody></table>`;

  try {
    const prescriptions = await getDoctorPrescriptions(doctorId);
    const patientIds = [...new Set(prescriptions.map(p => p.patientId).filter(Boolean))];
    const patients = [];

    await Promise.all(patientIds.map(async pid => {
      const profile = await getUserById(pid);
      if (profile) {
        const patientRxs = prescriptions.filter(rx => rx.patientId === pid);
        const lastRx = patientRxs[0];
        patients.push({
          ...profile,
          rxCount: patientRxs.length,
          lastVisit: lastRx?.createdAt
        });
      }
    }));

    allPatients = patients;
    renderTable(patients);
  } catch (e) {
    toast.error('Failed to load patients.', 'Error');
    tableEl.innerHTML = emptyState('users', 'Could not load patients', 'Please try again.');
  }
}

function renderTable(patients) {
  const tableEl = document.getElementById('patients-table');
  if (patients.length === 0) {
    tableEl.innerHTML = emptyState('users', 'No patients found', 'Patients will appear here after you create prescriptions for them.');
    return;
  }
  tableEl.innerHTML = `<table style="width:100%;"><thead><tr><th>Patient</th><th>Email</th><th>Last Visit</th><th>Prescriptions</th><th>Actions</th></tr></thead><tbody>
    ${patients.map(p => `<tr>
      <td style="display:flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;border-radius:50%;background:var(--color-primary-light);color:var(--color-primary);display:flex;align-items:center;justify-content:center;font-weight:600;font-size:0.75rem;">${getInitials(p.name)}</div>
        ${esc(p.name || 'Unknown')}
      </td>
      <td style="color:var(--color-muted-text);">${esc(p.email || '—')}</td>
      <td>${formatDate(p.lastVisit)}</td>
      <td><span class="badge badge-primary">${p.rxCount}</span></td>
      <td><button class="btn btn-ghost btn-sm view-patient" data-uid="${p.id || p.uid}">View</button></td>
    </tr>`).join('')}
  </tbody></table>`;

  tableEl.querySelectorAll('.view-patient').forEach(btn => {
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
          ${profile.bloodGroup ? `<span class="badge badge-warning" style="margin-top:4px;">${esc(profile.bloodGroup)}</span>` : ''}
          ${profile.allergies ? `<div style="font-size:0.8rem;color:var(--color-destructive);margin-top:4px;">Allergies: ${esc(profile.allergies)}</div>` : ''}
        </div>
      </div>

      <h3 style="font-size:1rem;font-weight:700;margin-bottom:12px;">Prescriptions (${prescriptions.length})</h3>
      ${prescriptions.length ? prescriptions.slice(0, 5).map(rx => `
        <div style="padding:12px;border:1px solid var(--color-border);border-radius:var(--radius-md);margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;"><strong>${esc(rx.diagnosis || 'General')}</strong><span style="font-size:0.8rem;color:var(--color-muted-text);">${formatDate(rx.createdAt)}</span></div>
          <div style="font-size:0.8rem;color:var(--color-muted-text);margin-top:4px;">${(rx.medicines||[]).length} medicine(s)</div>
        </div>
      `).join('') : '<p style="color:var(--color-muted-text);font-size:0.875rem;">No prescriptions yet.</p>'}

      <h3 style="font-size:1rem;font-weight:700;margin:20px 0 12px;">Appointments (${appointments.length})</h3>
      ${appointments.length ? appointments.slice(0, 5).map(a => `
        <div style="display:flex;justify-content:space-between;padding:10px 12px;border:1px solid var(--color-border);border-radius:var(--radius-md);margin-bottom:8px;">
          <span>${formatDate(a.followUpDate)}</span>
          ${statusBadge(a.status)}
        </div>
      `).join('') : '<p style="color:var(--color-muted-text);font-size:0.875rem;">No appointments.</p>'}
    `;
  } catch (e) {
    content.innerHTML = '<p>Failed to load patient details.</p>';
    toast.error('Error loading patient details.');
  }
}

function closeModal() { document.getElementById('patient-modal').style.display = 'none'; }
function emptyState(icon, title, desc) { return `<div class="empty-state"><div class="empty-state-icon">${svgIcon(icon, 36)}</div><h3>${title}</h3><p>${desc}</p></div>`; }
function esc(str = '') { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

init();
