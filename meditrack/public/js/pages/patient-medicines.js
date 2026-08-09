// ============================================================
// pages/patient-medicines.js — Medicine schedule management
// ============================================================

import { requireAuth } from '../components/auth-guard.js';
import { renderSidebar, renderTopbar, svgIcon } from '../components/sidebar.js';
import { db } from '../firebase/init.js';
import { getPatientMedicines, updateMedicineStatus } from '../firebase/firestore.js';
import {
  collection, addDoc, deleteDoc, doc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { formatDate, statusBadge } from '../utils/ui.js';
import toast from '../components/toast.js';
import { confirmDialog } from '../components/modal.js';

let userData = null;
let allMedicines = [];
let activeFilter = 'all';

// ── Initialise ─────────────────────────────────────────────────
async function init() {
  try {
    userData = await requireAuth(['patient']);
    renderSidebar(userData, 'medicines');
    renderTopbar('Medicines', userData);
    bindEvents();
    await loadMedicines(userData.uid);
  } catch (e) { /* auth-guard handles redirect */ }
}

// ── Event bindings ─────────────────────────────────────────────
function bindEvents() {
  // Add medicine button
  const addBtn = document.getElementById('add-med-btn');
  if (addBtn) addBtn.addEventListener('click', openModal);

  // Close / cancel modal
  const closeBtn = document.getElementById('close-med-modal');
  const cancelBtn = document.getElementById('cancel-med');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  // Modal overlay click
  const modal = document.getElementById('add-med-modal');
  if (modal) modal.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });

  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  // Form submit
  const form = document.getElementById('add-med-form');
  if (form) form.addEventListener('submit', handleAddMedicine);

  // Filter buttons
  document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn[data-filter]').forEach(b => {
        b.classList.remove('btn-primary');
        b.classList.add('btn-ghost');
      });
      btn.classList.remove('btn-ghost');
      btn.classList.add('btn-primary');
      activeFilter = btn.dataset.filter;
      renderMedicines();
    });
  });

  // Event delegation for card actions
  const grid = document.getElementById('medicines-grid');
  if (grid) grid.addEventListener('click', handleCardAction);
}

// ── Load medicines ─────────────────────────────────────────────
async function loadMedicines(uid) {
  const grid = document.getElementById('medicines-grid');
  if (!grid) return;

  // Show skeleton
  grid.innerHTML = Array.from({ length: 4 }, () => `
    <div class="card" style="padding:20px;">
      <div class="skeleton skeleton-text" style="width:60%;height:20px;margin-bottom:12px;"></div>
      <div class="skeleton skeleton-text" style="width:40%;height:14px;margin-bottom:8px;"></div>
      <div class="skeleton skeleton-text" style="width:80%;height:14px;margin-bottom:8px;"></div>
      <div class="skeleton skeleton-text" style="width:50%;height:14px;"></div>
    </div>
  `).join('');

  try {
    allMedicines = await getPatientMedicines(uid);
    renderMedicines();
  } catch (e) {
    console.error('Failed to load medicines:', e);
    toast.error('Failed to load medicines.', 'Error');
    grid.innerHTML = emptyState('pill', 'Could not load medicines', 'Please try refreshing the page.');
  }
}

// ── Render medicines (with filter) ─────────────────────────────
function renderMedicines() {
  const grid = document.getElementById('medicines-grid');
  if (!grid) return;

  const filtered = activeFilter === 'all'
    ? allMedicines
    : allMedicines.filter(m => m.status === activeFilter);

  if (filtered.length === 0) {
    const filterLabels = { all: '', pending: 'pending ', taken: 'taken ', missed: 'missed ' };
    grid.innerHTML = emptyState(
      'pill',
      `No ${filterLabels[activeFilter]}medicines`,
      activeFilter === 'all'
        ? 'Add your first medicine to start tracking your schedule.'
        : `You have no ${filterLabels[activeFilter]}medicines.`,
      activeFilter === 'all'
    );
    const emptyAddBtn = document.getElementById('empty-add-btn');
    if (emptyAddBtn) emptyAddBtn.addEventListener('click', openModal);
    return;
  }

  grid.innerHTML = filtered.map(med => {
    const d = med;
    const isPending = d.status === 'pending' || d.status === 'active';
    return `
      <div class="medicine-card card" data-id="${med.id}" data-status="${d.status}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
          <h3 class="medicine-name">${esc(d.medicineName || d.name || 'Unnamed')}</h3>
          ${statusBadge(d.status)}
        </div>
        ${d.dosage ? `<p class="medicine-dosage">${esc(d.dosage)}</p>` : ''}
        ${d.time ? `<p class="medicine-time">${svgIcon('clock', 14)} ${esc(d.time)}</p>` : ''}
        ${d.frequency ? `<p style="font-size:0.85rem;color:var(--color-muted-text);margin-bottom:4px;">${esc(d.frequency)}</p>` : ''}
        ${d.duration ? `<p style="font-size:0.85rem;color:var(--color-muted-text);margin-bottom:4px;">${esc(d.duration)}</p>` : ''}
        ${d.instructions ? `<p style="font-size:0.85rem;font-style:italic;color:var(--color-muted-text);margin-bottom:8px;">${esc(d.instructions)}</p>` : ''}
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
          ${isPending ? `
            <button class="btn btn-sm btn-accent take-btn" data-id="${med.id}">Mark as Taken</button>
            <button class="btn btn-sm btn-ghost missed-btn" data-id="${med.id}">Missed</button>
          ` : ''}
          <button class="btn btn-sm btn-danger delete-btn" data-id="${med.id}">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

// ── Card action handler (event delegation) ─────────────────────
async function handleCardAction(e) {
  const takeBtn = e.target.closest('.take-btn');
  const missedBtn = e.target.closest('.missed-btn');
  const deleteBtn = e.target.closest('.delete-btn');

  if (takeBtn) {
    const id = takeBtn.dataset.id;
    try {
      await updateMedicineStatus(id, 'taken');
      toast.success('Medicine marked as taken!');
      await loadMedicines(userData.uid);
    } catch (err) {
      toast.error('Failed to update status.', 'Error');
    }
  } else if (missedBtn) {
    const id = missedBtn.dataset.id;
    try {
      await updateMedicineStatus(id, 'missed');
      toast.warning('Medicine marked as missed.');
      await loadMedicines(userData.uid);
    } catch (err) {
      toast.error('Failed to update status.', 'Error');
    }
  } else if (deleteBtn) {
    const id = deleteBtn.dataset.id;
    const confirmed = await confirmDialog('Are you sure you want to delete this medicine?');
    if (!confirmed) return;
    try {
      await deleteDoc(doc(db, 'medicines', id));
      toast.success('Medicine deleted.');
      await loadMedicines(userData.uid);
    } catch (err) {
      toast.error('Failed to delete medicine.', 'Error');
    }
  }
}

// ── Add medicine ───────────────────────────────────────────────
async function handleAddMedicine(e) {
  e.preventDefault();

  const name = document.getElementById('med-name')?.value.trim();
  const dosage = document.getElementById('med-dosage')?.value.trim();
  const frequency = document.getElementById('med-freq')?.value;
  const time = document.getElementById('med-time')?.value;
  const duration = document.getElementById('med-duration')?.value.trim();
  const instructions = document.getElementById('med-instructions')?.value.trim();

  if (!name) { toast.error('Medicine name is required.'); return; }
  if (!frequency) { toast.error('Frequency is required.'); return; }
  if (!time) { toast.error('Time is required.'); return; }

  const saveBtn = document.getElementById('save-med-btn');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }

  try {
    await addDoc(collection(db, 'medicines'), {
      patientId: userData.uid,
      medicineName: name,
      dosage,
      frequency,
      time,
      duration,
      instructions,
      status: 'pending',
      createdAt: serverTimestamp()
    });
    toast.success('Medicine added!');
    closeModal();
    document.getElementById('add-med-form')?.reset();
    await loadMedicines(userData.uid);
  } catch (err) {
    toast.error('Failed to add medicine.', 'Error');
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Medicine'; }
  }
}

// ── Modal helpers ──────────────────────────────────────────────
function openModal() {
  const modal = document.getElementById('add-med-modal');
  if (modal) modal.style.display = 'flex';
}

function closeModal() {
  const modal = document.getElementById('add-med-modal');
  if (modal) modal.style.display = 'none';
}

// ── Empty state helper ─────────────────────────────────────────
function emptyState(icon, title, desc, showAdd = false) {
  return `
    <div class="empty-state" style="grid-column:1/-1;">
      <div class="empty-state-icon">${svgIcon(icon, 40)}</div>
      <h3>${title}</h3>
      <p>${desc}</p>
      ${showAdd ? '<button id="empty-add-btn" class="btn btn-primary" style="margin-top:12px;">Add Medicine</button>' : ''}
    </div>
  `;
}

// ── Escape HTML ────────────────────────────────────────────────
function esc(str = '') {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

init();
