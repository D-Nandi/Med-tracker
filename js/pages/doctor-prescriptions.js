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
    await Promise.all([
      loadPrescriptions(userData.uid),
      preloadPatients()
    ]);
  } catch (e) {
    console.error("Prescriptions init error:", e);
  }
}

async function preloadPatients() {
  try {
    allPatientsList = await getAllPatients();
  } catch (err) {
    console.error("Failed to preload patients:", err);
  }
}

function bindEvents() {
  document.getElementById('new-rx-btn')?.addEventListener('click', openModal);
  document.getElementById('close-rx-modal')?.addEventListener('click', closeModal);
  document.getElementById('cancel-rx')?.addEventListener('click', closeModal);
  document.getElementById('new-rx-modal')?.addEventListener('click', e => { if (e.target.id === 'new-rx-modal') closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  document.getElementById('rx-form')?.addEventListener('submit', handleSave);
  document.getElementById('add-medicine-row')?.addEventListener('click', addMedicineRow);

  // Clear selected patient
  document.getElementById('clear-patient-btn')?.addEventListener('click', () => {
    selectedPatient = null;
    document.getElementById('selected-patient-id').value = '';
    const selBox = document.getElementById('selected-patient');
    if (selBox) selBox.style.display = 'none';
    const searchInput = document.getElementById('patient-search');
    if (searchInput) {
      searchInput.style.display = 'block';
      searchInput.value = '';
      searchInput.focus();
    }
  });

  // Patient search & instant dropdown
  const searchInput = document.getElementById('patient-search');
  if (searchInput) {
    const triggerSearch = async () => {
      if (allPatientsList.length === 0) {
        await preloadPatients();
      }
      const q = searchInput.value.trim().toLowerCase();
      const filtered = q
        ? allPatientsList.filter(p => (p.name || '').toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q))
        : allPatientsList;
      showPatientResults(filtered);
    };

    searchInput.addEventListener('input', triggerSearch);
    searchInput.addEventListener('focus', triggerSearch);
    searchInput.addEventListener('click', triggerSearch);
    
    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#patient-search') && !e.target.closest('#patient-results')) {
        hidePatientResults();
      }
    });
  }
}

function showPatientResults(patients) {
  const el = document.getElementById('patient-results');
  if (!el) return;
  if (!patients.length) {
    el.style.display = 'block';
    el.innerHTML = `<div style="padding:12px;font-size:0.875rem;color:var(--color-muted-text);text-align:center;">No patients found</div>`;
    return;
  }
  el.style.display = 'block';
  el.innerHTML = patients.slice(0, 10).map(p => `
    <div class="patient-result-item" data-id="${p.id}" data-name="${esc(p.name || p.email || 'Patient')}" style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--color-border);font-size:0.875rem;transition:background 0.15s ease;">
      <div style="font-weight:600;color:var(--color-foreground);">${esc(p.name || 'Unnamed Patient')}</div>
      <div style="color:var(--color-muted-text);font-size:0.8rem;margin-top:2px;">${esc(p.email || '')} ${p.phone ? '• ' + esc(p.phone) : ''}</div>
    </div>
  `).join('');

  el.querySelectorAll('.patient-result-item').forEach(item => {
    item.addEventListener('mouseenter', () => item.style.background = 'var(--color-primary-light)');
    item.addEventListener('mouseleave', () => item.style.background = '');
    item.addEventListener('click', () => selectPatient(item.dataset.id, item.dataset.name));
  });
}

function selectPatient(id, name) {
  selectedPatient = { id, name };
  document.getElementById('selected-patient-id').value = id;
  const searchInput = document.getElementById('patient-search');
  if (searchInput) {
    searchInput.value = '';
    searchInput.style.display = 'none';
  }
  const sel = document.getElementById('selected-patient');
  const selText = document.getElementById('selected-patient-text');
  if (sel && selText) {
    selText.textContent = `Patient: ${name}`;
    sel.style.display = 'flex';
  }
  hidePatientResults();
}

function hidePatientResults() {
  const el = document.getElementById('patient-results');
  if (el) el.style.display = 'none';
}

function addMedicineRow() {
  const container = document.getElementById('medicines-rows');
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'medicine-form-row';
  row.style.cssText = 'display:grid;grid-template-columns:2.5fr 1.5fr 2fr 1.5fr 40px;gap:8px;align-items:center;margin-bottom:8px;';
  row.innerHTML = `
    <div><input class="form-control med-name" placeholder="e.g. Paracetamol" required style="min-height:40px;padding:6px 12px;"/></div>
    <div><input class="form-control med-dosage" placeholder="e.g. 500mg" style="min-height:40px;padding:6px 12px;"/></div>
    <div>
      <select class="form-control med-freq" style="min-height:40px;padding:6px 12px;">
        <option value="Once daily">Once daily</option>
        <option value="Twice daily">Twice daily</option>
        <option value="Three times daily">Three times daily</option>
        <option value="Every 6 hours">Every 6 hours</option>
        <option value="As needed">As needed</option>
      </select>
    </div>
    <div><input class="form-control med-duration" placeholder="e.g. 5 days" style="min-height:40px;padding:6px 12px;"/></div>
    <button type="button" class="btn btn-ghost btn-sm remove-med-row" aria-label="Remove medicine" style="padding:0;min-height:38px;height:38px;width:38px;display:flex;align-items:center;justify-content:center;color:var(--color-destructive);border-radius:var(--radius-md);" title="Remove">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;
  row.querySelector('.remove-med-row').addEventListener('click', () => {
    if (container.children.length > 1) {
      row.remove();
    } else {
      toast.warning('At least one medicine row is required.');
    }
  });
  container.appendChild(row);
}

async function loadPrescriptions(doctorId) {
  const el = document.getElementById('prescriptions-list');
  if (!el) return;
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
      el.innerHTML = emptyState('file-text', 'No prescriptions yet', 'Click "New Prescription" above to write your first prescription.');
      return;
    }
    el.innerHTML = prescriptions.map(rx => {
      const meds = rx.medicines || [];
      return `<div class="prescription-card card" style="margin-bottom:14px;cursor:default;">
        <div class="prescription-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div>
            <span class="badge badge-primary" style="font-size:0.8125rem;padding:4px 10px;">${esc(rx.patientName || 'Patient')}</span>
            <span class="prescription-date" style="margin-left:10px;font-size:0.8125rem;color:var(--color-muted-text);">${formatDate(rx.createdAt)}</span>
          </div>
          <span class="badge badge-success">Rx Active</span>
        </div>
        <div class="prescription-diagnosis" style="font-size:1.0625rem;font-weight:600;margin-bottom:10px;color:var(--color-foreground);">${esc(rx.diagnosis || 'General Prescription')}</div>
        <div class="prescription-meds" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">${meds.map(m => `<span class="med-chip" style="background:var(--color-muted);padding:4px 10px;border-radius:var(--radius-sm);font-size:0.8125rem;font-weight:500;">💊 ${esc(m.name || m.medicineName || m)} ${m.dosage ? `(${esc(m.dosage)})` : ''} — ${esc(m.frequency || '')}</span>`).join('')}</div>
        ${rx.notes ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--color-border);font-size:0.85rem;color:var(--color-muted-text);"><strong>Notes:</strong> ${esc(rx.notes)}</div>` : ''}
      </div>`;
    }).join('');
  } catch (e) {
    toast.error('Failed to load prescriptions.', 'Error');
    console.error(e);
  }
}

async function handleSave(e) {
  e.preventDefault();
  if (!selectedPatient) {
    toast.error('Please select a patient from the list.');
    const searchInput = document.getElementById('patient-search');
    if (searchInput) {
      searchInput.style.display = 'block';
      searchInput.focus();
    }
    return;
  }
  const diagnosis = document.getElementById('rx-diagnosis')?.value.trim();
  if (!diagnosis) {
    toast.error('Diagnosis is required.');
    document.getElementById('rx-diagnosis')?.focus();
    return;
  }

  // Collect medicines
  const rows = document.querySelectorAll('#medicines-rows .medicine-form-row');
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
  if (medicines.length === 0) {
    toast.error('Please add at least one medicine with a name.');
    return;
  }

  const btn = document.getElementById('save-rx-btn');
  btn.disabled = true;
  btn.textContent = 'Creating…';

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
    console.error(err);
    toast.error('Failed to create prescription: ' + (err.message || err), 'Error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Prescription';
  }
}

function openModal() {
  document.getElementById('new-rx-modal').style.display = 'flex';
  if (allPatientsList.length === 0) preloadPatients();
}
function closeModal() {
  document.getElementById('new-rx-modal').style.display = 'none';
}
function resetForm() {
  document.getElementById('rx-form')?.reset();
  selectedPatient = null;
  const sel = document.getElementById('selected-patient');
  if (sel) sel.style.display = 'none';
  document.getElementById('selected-patient-id').value = '';
  const searchInput = document.getElementById('patient-search');
  if (searchInput) {
    searchInput.style.display = 'block';
    searchInput.value = '';
  }
  const rows = document.getElementById('medicines-rows');
  if (rows) rows.innerHTML = '';
  addMedicineRow();
}

function emptyState(icon, title, desc) { return `<div class="empty-state"><div class="empty-state-icon">${svgIcon(icon, 36)}</div><h3>${title}</h3><p>${desc}</p></div>`; }
function esc(str = '') { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

init();

