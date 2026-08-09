// ============================================================
// pages/admin-doctors.js — Admin doctor management
// ============================================================

import { requireAuth } from '../components/auth-guard.js';
import { renderSidebar, renderTopbar, svgIcon } from '../components/sidebar.js';
import { getAllDoctors, updateUserProfile } from '../firebase/firestore.js';
import { db } from '../firebase/init.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { formatDate, getInitials, statusBadge } from '../utils/ui.js';
import toast from '../components/toast.js';

let userData = null;
let allDoctors = [];

async function init() {
  try {
    userData = await requireAuth(['admin']);
    renderSidebar(userData, 'doctors');
    renderTopbar('Manage Doctors', userData);
    bindEvents();
    await loadDoctors();
  } catch (e) {}
}

function bindEvents() {
  document.getElementById('add-doctor-btn')?.addEventListener('click', () => document.getElementById('add-doctor-modal').style.display = 'flex');
  document.getElementById('close-doc-modal')?.addEventListener('click', closeModal);
  document.getElementById('cancel-doc')?.addEventListener('click', closeModal);
  document.getElementById('add-doctor-modal')?.addEventListener('click', e => { if (e.target.id === 'add-doctor-modal') closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  document.getElementById('doc-form')?.addEventListener('submit', handleAddDoctor);

  document.getElementById('search-doctors')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    renderTable(allDoctors.filter(d => (d.name||'').toLowerCase().includes(q) || (d.email||'').toLowerCase().includes(q)));
  });
}

async function loadDoctors() {
  const el = document.getElementById('doctors-table');
  el.innerHTML = `<table style="width:100%;"><thead><tr><th>Doctor</th><th>Email</th><th>Specialization</th><th>Status</th><th>Actions</th></tr></thead><tbody>
    ${Array.from({length:4}, () => `<tr>${Array.from({length:5}, () => '<td><div class="skeleton skeleton-text"></div></td>').join('')}</tr>`).join('')}
  </tbody></table>`;

  try {
    allDoctors = await getAllDoctors();
    renderTable(allDoctors);
  } catch (e) {
    toast.error('Failed to load doctors.', 'Error');
  }
}

function renderTable(doctors) {
  const el = document.getElementById('doctors-table');
  if (doctors.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${svgIcon('user-check', 36)}</div><h3>No doctors found</h3><p>Add a doctor to get started.</p></div>`;
    return;
  }
  el.innerHTML = `<table style="width:100%;"><thead><tr><th>Doctor</th><th>Email</th><th>Specialization</th><th>Status</th><th>Actions</th></tr></thead><tbody>
    ${doctors.map(d => {
      const isActive = (d.status || 'active') === 'active';
      return `<tr>
        <td style="display:flex;align-items:center;gap:10px;">
          <div style="width:32px;height:32px;border-radius:50%;background:var(--color-accent-light, #d1fae5);color:var(--color-accent);display:flex;align-items:center;justify-content:center;font-weight:600;font-size:0.75rem;">${getInitials(d.name)}</div>
          Dr. ${esc(d.name || 'Unknown')}
        </td>
        <td style="color:var(--color-muted-text);">${esc(d.email || '—')}</td>
        <td>${esc(d.specialization || '—')}</td>
        <td>${isActive ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Inactive</span>'}</td>
        <td>
          <button class="btn btn-ghost btn-sm toggle-status" data-uid="${d.id}" data-action="${isActive ? 'deactivate' : 'activate'}">
            ${isActive ? 'Deactivate' : 'Activate'}
          </button>
        </td>
      </tr>`;
    }).join('')}
  </tbody></table>`;

  el.querySelectorAll('.toggle-status').forEach(btn => {
    btn.addEventListener('click', async () => {
      const newStatus = btn.dataset.action === 'deactivate' ? 'inactive' : 'active';
      try {
        await updateUserProfile(btn.dataset.uid, { status: newStatus });
        toast.success(`Doctor ${newStatus === 'active' ? 'activated' : 'deactivated'}.`);
        await loadDoctors();
      } catch { toast.error('Failed to update status.'); }
    });
  });
}

async function handleAddDoctor(e) {
  e.preventDefault();
  const name = document.getElementById('doc-name')?.value.trim();
  const email = document.getElementById('doc-email')?.value.trim();
  if (!name || !email) { toast.error('Name and email are required.'); return; }

  const btn = document.getElementById('save-doctor-btn');
  btn.disabled = true; btn.textContent = 'Adding…';

  try {
    await addDoc(collection(db, 'users'), {
      name,
      email,
      specialization: document.getElementById('doc-spec')?.value.trim() || '',
      phone: document.getElementById('doc-phone')?.value.trim() || '',
      role: 'doctor',
      status: 'active',
      createdAt: serverTimestamp()
    });
    toast.success('Doctor added! They can now sign up with this email.');
    closeModal();
    document.getElementById('doc-form')?.reset();
    await loadDoctors();
  } catch (err) {
    toast.error('Failed to add doctor.', 'Error');
  } finally {
    btn.disabled = false; btn.textContent = 'Add Doctor';
  }
}

function closeModal() { document.getElementById('add-doctor-modal').style.display = 'none'; }
function esc(str = '') { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

init();
