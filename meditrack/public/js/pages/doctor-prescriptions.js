// ============================================================
// pages/doctor-prescriptions.js — Doctor prescription management
// ============================================================

import { requireAuth } from '../components/auth-guard.js';
import { renderSidebar, renderTopbar, svgIcon } from '../components/sidebar.js';
import { getDoctorPrescriptions, createPrescription, addMedicine, getAllPatients } from '../firebase/firestore.js';
import { formatDate } from '../utils/ui.js';
import toast from '../components/toast.js';

let userData = null;
let allPatientsList = [];
let selectedPatient = null;

async function init() {
  try {
    userData = await requireAuth(['doctor']);
    renderSidebar(userData, 'prescriptions');
    renderTopbar('Prescriptions', userData);
    bindEvents();
    addMedicineRow(); // start with one empty row
    await loadPrescriptions(userData.uid);
  } catch (e) {}
}

function bindEvents() {
  document.getElementById('new-rx-btn')?.addEventListener('click', openModal);
  document.getElementById('close-rx-modal')?.addEventListener('click', closeModal);
  document.getElementById('cancel-rx')?.addEventListener('click', closeModal);
  document.getElementById('new-rx-modal')?.addEventListener('click', e => { if (e.target.id === 'new-rx-modal') closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  document.getElementById('rx-form')?.addEventListener('submit', handleSave);
  document.getElementById('add-medicine-row')?.addEventListener('click', addMedicineRow);

  // Patient search
  const searchInput = document.getElementById('patient-search');
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
  const el = document.getElementById('patient-results');
  if (!patients.length) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  el.innerHTML = patients.slice(0, 8).map(p => `
    <div class="patient-result-item" data-id="${p.id}" data-name="${esc(p.name||'')}" style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--color-border);font-size:0.875rem;transition:background var(--transition);">
      <strong>${esc(p.name || 'Unknown')}</strong><br><span style="color:var(--color-muted-text);font-size:0.8rem;">${esc(p.email || '')}</span>
    </div>
  `).join('');
  el.querySelectorAll('.patient-result-item').forEach(item => {
    item.addEventListener('mouseenter', () => item.style.background = 'var(--color-muted)');
    item.addEventListener('mouseleave', () => item.style.background = '');
    item.addEventListener('click', () => selectPatient(item.dataset.id, item.dataset.name));
  });
}

function selectPatient(id, name) {
  selectedPatient = { id, name };
  document.getElementById('selected-patient-id').value = id;
  document.getElementById('patient-search').value = '';
  const sel = document.getElementById('selected-patient');
  sel.textContent = `Selected: ${name}`;
  sel.style.display = 'block';
  hidePatientResults();
}

function hidePatientResults() { const el = document.getElementById('patient-results'); if (el) el.style.display = 'none'; }

function addMedicineRow() {
  const container = document.getElementById('medicines-rows');
  const row = document.createElement('div');
  row.className = 'form-row';
  row.style.cssText = 'align-items:flex-end;gap:8px;margin-bottom:8px;';
  row.innerHTML = `
    <div class="form-group" style="flex:2;"><input class="form-control med-name" placeholder="Medicine name *"/></div>
    <div class="form-group" style="flex:1;"><input class="form-control med-dosage" placeholder="Dosage"/></div>
    <div class="form-group" style="flex:1.5;">
      <select class="form-control med-freq">
        <option value="Once daily">Once daily</option>
        <option value="Twice daily">Twice daily</option>
        <option value="Three times daily">Three times daily</option>
        <option value="Every 6 hours">Every 6 hours</option>
        <option value="As needed">As needed</option>
      </select>
    </div>
    <div class="form-group" style="flex:1;"><input class="form-control med-duration" placeholder="Duration"/></div>
    <button type="button" class="btn btn-danger btn-sm btn-icon remove-med-row" aria-label="Remove" style="margin-bottom:16px;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;
  row.querySelector('.remove-med-row').addEventListener('click', () => {
    if (container.children.length > 1) row.remove();
    else toast.warning('At least one medicine is required.');
  });
  container.appendChild(row);
}

async function loadPrescriptions(doctorId) {
  const el = document.getElementById('prescriptions-list');
  el.innerHTML = Array.from({ length: 3 }, () =>
    `<div class="prescription-card card" style="margin-bottom:12px;padding:20px;">
      <div class="skeleton skeleton-text" style="width:50%;height:18px;margin-bottom:10px;"></div>
      <div class="skeleton skeleton-text" style="width:70%;height:14px;margin-bottom:6px;"></div>
      <div class="skeleton skeleton-text" style="width:30%;height:14px;"></div>
    </div>`
  ).join('');

  try {
    const prescriptions = await getDoctorPrescriptions(doctorId);
    if (prescriptions.length === 0) {
      el.innerHTML = emptyState('file-text', 'No prescriptions yet', 'Click "New Prescription" to create your first one.');
      return;
    }
    el.innerHTML = prescriptions.map(rx => {
      const meds = rx.medicines || [];
      return `<div class="prescription-card card" style="margin-bottom:12px;cursor:default;">
        <div class="prescription-header">
          <span class="prescription-date">${formatDate(rx.createdAt)}</span>
          <span class="badge badge-primary">${esc(rx.patientName || 'Patient')}</span>
        </div>
        <div class="prescription-diagnosis">${esc(rx.diagnosis || 'General Prescription')}</div>
        <div class="prescription-meds">${meds.slice(0, 4).map(m => `<span class="med-chip">${esc(m.name || m.medicineName || m)}</span>`).join('')}${meds.length > 4 ? `<span class="med-chip">+${meds.length - 4} more</span>` : ''}</div>
        ${rx.notes ? `<p style="margin-top:10px;font-size:0.85rem;color:var(--color-muted-text);">${esc(rx.notes)}</p>` : ''}
      </div>`;
    }).join('');
  } catch (e) {
    toast.error('Failed to load prescriptions.', 'Error');
  }
}

async function handleSave(e) {
  e.preventDefault();
  if (!selectedPatient) { toast.error('Please select a patient.'); return; }
  const diagnosis = document.getElementById('rx-diagnosis')?.value.trim();
  if (!diagnosis) { toast.error('Diagnosis is required.'); return; }

  // Collect medicines
  const rows = document.querySelectorAll('#medicines-rows .form-row');
  const medicines = [];
  for (const row of rows) {
    const name = row.querySelector('.med-name')?.value.trim();
    if (!name) continue;
    medicines.push({
      name,
      dosage: row.querySelector('.med-dosage')?.value.trim() || '',
      frequency: row.querySelector('.med-freq')?.value || 'Once daily',
      duration: row.querySelector('.med-duration')?.value.trim() || ''
    });
  }
  if (medicines.length === 0) { toast.error('Add at least one medicine.'); return; }

  const btn = document.getElementById('save-rx-btn');
  btn.disabled = true; btn.textContent = 'Creating…';

  try {
    const notes = document.getElementById('rx-instructions')?.value.trim() || '';
    const rxId = await createPrescription({
      patientId: selectedPatient.id,
      patientName: selectedPatient.name,
      doctorId: userData.uid,
      doctorName: userData.name || 'Doctor',
      diagnosis,
      medicines,
      notes
    });

    // Also create individual medicine docs for patient tracking
    await Promise.all(medicines.map(med =>
      addMedicine(rxId, {
        patientId: selectedPatient.id,
        medicineName: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        status: 'pending'
      })
    ));

    toast.success('Prescription created successfully!');
    closeModal();
    resetForm();
    await loadPrescriptions(userData.uid);
  } catch (err) {
    toast.error('Failed to create prescription.', 'Error');
  } finally {
    btn.disabled = false; btn.textContent = 'Create Prescription';
  }
}

function openModal() { document.getElementById('new-rx-modal').style.display = 'flex'; }
function closeModal() { document.getElementById('new-rx-modal').style.display = 'none'; }
function resetForm() {
  document.getElementById('rx-form')?.reset();
  selectedPatient = null;
  document.getElementById('selected-patient').style.display = 'none';
  document.getElementById('selected-patient-id').value = '';
  const rows = document.getElementById('medicines-rows');
  rows.innerHTML = '';
  addMedicineRow();
}

function emptyState(icon, title, desc) { return `<div class="empty-state"><div class="empty-state-icon">${svgIcon(icon, 36)}</div><h3>${title}</h3><p>${desc}</p></div>`; }
function esc(str = '') { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

init();
