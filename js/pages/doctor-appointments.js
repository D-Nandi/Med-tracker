// ============================================================
// pages/doctor-appointments.js — Doctor appointment management
// ============================================================

import { requireAuth } from '../components/auth-guard.js';
import { renderSidebar, renderTopbar, svgIcon } from '../components/sidebar.js';
import { getDoctorAppointments, createAppointment, updateAppointmentStatus, getAllPatients } from '../firebase/firestore.js';
import { formatDate, daysUntil, statusBadge } from '../utils/ui.js';
import toast from '../components/toast.js';
import { confirmDialog } from '../components/modal.js';

let userData = null;
let allAppointments = [];
let allPatientsList = [];
let selectedPatient = null;
let activeFilter = 'upcoming';

async function init() {
  try {
    userData = await requireAuth(['doctor']);
    renderSidebar(userData, 'appointments');
    renderTopbar('Appointments', userData);
    bindEvents();
    await loadAppointments(userData.uid);
  } catch (e) {}
}

function bindEvents() {
  document.getElementById('new-appt-btn')?.addEventListener('click', openModal);
  document.getElementById('close-appt-modal')?.addEventListener('click', closeModal);
  document.getElementById('cancel-appt')?.addEventListener('click', closeModal);
  document.getElementById('new-appt-modal')?.addEventListener('click', e => { if (e.target.id === 'new-appt-modal') closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  document.getElementById('appt-form')?.addEventListener('submit', handleSchedule);

  // Filter buttons
  document.querySelectorAll('.filter-btn[data-status]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn[data-status]').forEach(b => { b.classList.remove('btn-primary', 'active'); b.classList.add('btn-ghost'); });
      btn.classList.remove('btn-ghost'); btn.classList.add('btn-primary', 'active');
      activeFilter = btn.dataset.status;
      renderAppointments();
    });
  });

  // Patient search
  const searchInput = document.getElementById('appt-patient-search');
  if (searchInput) {
    searchInput.addEventListener('input', async () => {
      const q = searchInput.value.trim().toLowerCase();
      if (q.length < 2) { hidePatientResults(); return; }
      if (allPatientsList.length === 0) {
        try { allPatientsList = await getAllPatients(); } catch { return; }
      }
      const filtered = allPatientsList.filter(p => (p.name||'').toLowerCase().includes(q) || (p.email||'').toLowerCase().includes(q));
      showPatientResults(filtered);
    });
    searchInput.addEventListener('blur', () => setTimeout(hidePatientResults, 200));
  }
}

function showPatientResults(patients) {
  const el = document.getElementById('appt-patient-results');
  if (!patients.length) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  el.innerHTML = patients.slice(0, 8).map(p => `
    <div class="patient-result-item" data-id="${p.id}" data-name="${esc(p.name||'')}" style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--color-border);font-size:0.875rem;">
      <strong>${esc(p.name || 'Unknown')}</strong><br><span style="color:var(--color-muted-text);font-size:0.8rem;">${esc(p.email || '')}</span>
    </div>
  `).join('');
  el.querySelectorAll('.patient-result-item').forEach(item => {
    item.addEventListener('mouseenter', () => item.style.background = 'var(--color-muted)');
    item.addEventListener('mouseleave', () => item.style.background = '');
    item.addEventListener('click', () => {
      selectedPatient = { id: item.dataset.id, name: item.dataset.name };
      document.getElementById('appt-patient-id').value = item.dataset.id;
      document.getElementById('appt-patient-search').value = '';
      const sel = document.getElementById('appt-selected-patient');
      sel.textContent = `Selected: ${item.dataset.name}`;
      sel.style.display = 'block';
      hidePatientResults();
    });
  });
}

function hidePatientResults() { const el = document.getElementById('appt-patient-results'); if (el) el.style.display = 'none'; }

async function loadAppointments(doctorId) {
  const el = document.getElementById('appointments-list');
  el.innerHTML = Array.from({ length: 3 }, () => `
    <div class="appointment-item" style="margin-bottom:12px;">
      <div class="skeleton" style="width:56px;height:56px;border-radius:var(--radius-md);"></div>
      <div style="flex:1;"><div class="skeleton skeleton-text" style="width:60%;margin-bottom:6px;"></div><div class="skeleton skeleton-text" style="width:40%;"></div></div>
    </div>
  `).join('');

  try {
    allAppointments = await getDoctorAppointments(doctorId);
    renderAppointments();
  } catch (e) {
    toast.error('Failed to load appointments.', 'Error');
  }
}

function renderAppointments() {
  const el = document.getElementById('appointments-list');
  const filtered = activeFilter === 'all'
    ? allAppointments
    : allAppointments.filter(a => (a.status || 'upcoming') === activeFilter);

  if (filtered.length === 0) {
    const labels = { upcoming: 'upcoming', completed: 'completed', cancelled: 'cancelled', all: '' };
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${svgIcon('calendar', 36)}</div><h3>No ${labels[activeFilter]} appointments</h3><p>Schedule a follow-up with the button above.</p></div>`;
    return;
  }

  el.innerHTML = filtered.map(a => {
    const date = a.followUpDate?.toDate?.() || new Date(a.followUpDate || 0);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-IN', { month: 'short' });
    const isUpcoming = (a.status || 'upcoming') === 'upcoming';
    const dLeft = Math.ceil((date - new Date()) / 86400000);

    return `<div class="appointment-item" style="margin-bottom:12px;">
      <div class="appt-date-box"><div class="appt-day">${day}</div><div class="appt-month">${month}</div></div>
      <div class="appt-info">
        <div class="appt-title">Follow-Up with ${esc(a.patientName || 'Patient')}</div>
        <div class="appt-doctor" style="font-size:0.8rem;color:var(--color-muted-text);">${a.specialization || ''} ${date.getFullYear()}</div>
        ${a.notes ? `<div style="font-size:0.8rem;color:var(--color-muted-text);margin-top:2px;">${esc(a.notes)}</div>` : ''}
      </div>
      <div style="text-align:right;">
        ${statusBadge(a.status || 'upcoming')}
        ${dLeft > 0 ? `<div style="font-size:0.75rem;color:var(--color-muted-text);margin-top:4px;">${dLeft} day${dLeft > 1 ? 's' : ''} away</div>` : dLeft === 0 ? '<div style="font-size:0.75rem;color:var(--color-accent);font-weight:600;margin-top:4px;">Today</div>' : ''}
        ${isUpcoming ? `
          <div style="display:flex;gap:6px;margin-top:8px;justify-content:flex-end;">
            <button class="btn btn-accent btn-sm complete-btn" data-id="${a.id}">Complete</button>
            <button class="btn btn-danger btn-sm cancel-btn" data-id="${a.id}">Cancel</button>
          </div>
        ` : ''}
      </div>
    </div>`;
  }).join('');

  // Bind action buttons
  el.querySelectorAll('.complete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await updateAppointmentStatus(btn.dataset.id, 'completed');
        toast.success('Appointment marked as completed.');
        await loadAppointments(userData.uid);
      } catch { toast.error('Failed to update.'); }
    });
  });
  el.querySelectorAll('.cancel-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ok = await confirmDialog('Cancel this appointment?');
      if (!ok) return;
      try {
        await updateAppointmentStatus(btn.dataset.id, 'cancelled');
        toast.success('Appointment cancelled.');
        await loadAppointments(userData.uid);
      } catch { toast.error('Failed to cancel.'); }
    });
  });
}

async function handleSchedule(e) {
  e.preventDefault();
  if (!selectedPatient) { toast.error('Please select a patient.'); return; }
  const dateVal = document.getElementById('appt-date')?.value;
  if (!dateVal) { toast.error('Please select a date.'); return; }

  const btn = document.getElementById('save-appt-btn');
  btn.disabled = true; btn.textContent = 'Scheduling…';

  try {
    await createAppointment({
      patientId: selectedPatient.id,
      patientName: selectedPatient.name,
      doctorId: userData.uid,
      doctorName: userData.name || 'Doctor',
      followUpDate: new Date(dateVal),
      notes: document.getElementById('appt-notes')?.value.trim() || ''
    });
    toast.success('Appointment scheduled!');
    closeModal();
    document.getElementById('appt-form')?.reset();
    selectedPatient = null;
    document.getElementById('appt-selected-patient').style.display = 'none';
    await loadAppointments(userData.uid);
  } catch (err) {
    toast.error('Failed to schedule appointment.', 'Error');
  } finally {
    btn.disabled = false; btn.textContent = 'Schedule Appointment';
  }
}

function openModal() { document.getElementById('new-appt-modal').style.display = 'flex'; }
function closeModal() { document.getElementById('new-appt-modal').style.display = 'none'; }
function esc(str = '') { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

init();
