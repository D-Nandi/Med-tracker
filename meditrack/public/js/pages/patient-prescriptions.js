// =============================================
// MediTrack — Patient Prescriptions Page
// =============================================

import { requireAuth } from '../components/auth-guard.js';
import { renderSidebar, renderTopbar, svgIcon } from '../components/sidebar.js';
import { getPatientPrescriptions } from '../firebase/firestore.js';
import { formatDate, renderSkeletonCards, escapeHtml } from '../utils/ui.js';
import toast from '../components/toast.js';

// ── State ──────────────────────────────────────────────────────
let userData = null;
let prescriptions = []; // { id, ...data } objects

// ── DOM References ─────────────────────────────────────────────
const listEl      = () => document.getElementById('prescriptions-list');
const searchInput = () => document.getElementById('search-input');
const modalEl     = () => document.getElementById('rx-modal');
const modalContent = () => document.getElementById('rx-modal-content');
const closeBtn    = () => document.getElementById('close-rx-modal');

// ── Initialisation ─────────────────────────────────────────────
async function init() {
  try {
    userData = await requireAuth(['patient']);
    renderSidebar(userData, 'prescriptions');
    renderTopbar('Prescriptions', userData);
    await loadPrescriptions(userData.uid);
    bindEvents();
  } catch (e) { /* auth-guard handles redirect */ }
}

// ── Load Prescriptions ─────────────────────────────────────────
async function loadPrescriptions(uid) {
  // Show skeleton loaders while fetching
  renderSkeletonCards(4, listEl());

  try {
    prescriptions = await getPatientPrescriptions(uid);
    renderCards(prescriptions);
  } catch (err) {
    console.error('Failed to load prescriptions:', err);
    toast.error('Could not load prescriptions. Please try again.');
    listEl().innerHTML = '';
  }
}

// ── Render Prescription Cards ──────────────────────────────────
function renderCards(items) {
  const container = listEl();
  if (!container) return;

  // Empty state
  if (!items.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${svgIcon('file-text', 36)}</div>
        <h3>No prescriptions yet</h3>
        <p>Prescriptions from your doctor will appear here once they create one for you.</p>
      </div>`;
    return;
  }

  container.innerHTML = items.map(rx => {
    const date  = formatDate(rx.createdAt || rx.date);
    const meds  = rx.medicines || [];
    const notes = rx.notes || '';

    // Medicine chips — show max 4, then '+N more'
    const chipLimit = 4;
    const visibleMeds = meds.slice(0, chipLimit);
    const extraCount  = meds.length - chipLimit;

    return `
      <div class="prescription-card" data-id="${rx.id}" tabindex="0" role="button" aria-label="View prescription: ${escapeHtml(rx.diagnosis || 'General Prescription')}">
        <div class="prescription-header">
          <span class="prescription-date">${date}</span>
          <span class="badge badge-primary">Dr. ${escapeHtml(rx.doctorName || 'Doctor')}</span>
        </div>
        <div class="prescription-diagnosis">${escapeHtml(rx.diagnosis || 'General Prescription')}</div>
        <div class="prescription-meds">
          ${visibleMeds.map(m => `<span class="med-chip">${escapeHtml(m.name || m)}</span>`).join('')}
          ${extraCount > 0 ? `<span class="med-chip">+${extraCount} more</span>` : ''}
        </div>
        ${notes ? `<p style="margin-top:10px;font-size:0.875rem;color:var(--color-muted-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(notes)}</p>` : ''}
      </div>`;
  }).join('');
}

// ── Search / Filter ────────────────────────────────────────────
function handleSearch(e) {
  const term = e.target.value.trim().toLowerCase();
  if (!term) {
    renderCards(prescriptions);
    return;
  }
  const filtered = prescriptions.filter(rx => {
    const diagnosis  = (rx.diagnosis  || '').toLowerCase();
    const doctorName = (rx.doctorName || '').toLowerCase();
    return diagnosis.includes(term) || doctorName.includes(term);
  });
  renderCards(filtered);
}

// ── Show Prescription Detail Modal ─────────────────────────────
function showDetail(rx) {
  const modal   = modalEl();
  const content = modalContent();
  if (!modal || !content) return;

  const date = formatDate(rx.createdAt || rx.date);
  const meds = rx.medicines || [];

  content.innerHTML = `
    <!-- Summary card -->
    <div style="background:var(--color-muted);border-radius:var(--radius-md);padding:16px;margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="font-weight:600;color:var(--color-foreground);">Date</span>
        <span>${date}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="font-weight:600;color:var(--color-foreground);">Doctor</span>
        <span>Dr. ${escapeHtml(rx.doctorName || 'N/A')}</span>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span style="font-weight:600;color:var(--color-foreground);">Diagnosis</span>
        <span>${escapeHtml(rx.diagnosis || 'N/A')}</span>
      </div>
    </div>

    <!-- Medicines list -->
    ${meds.length ? `
      <h3 style="font-size:1rem;font-weight:700;margin-bottom:14px;font-family:var(--font-primary);">Prescribed Medicines</h3>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${meds.map(m => `
          <div style="background:var(--color-background);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <div style="font-weight:600;font-size:0.9375rem;">${escapeHtml(m.name || m)}</div>
              ${m.duration ? `<span class="badge badge-muted">${escapeHtml(m.duration)}</span>` : ''}
            </div>
            <div style="display:flex;gap:16px;font-size:0.8125rem;color:var(--color-muted-text);">
              ${m.dosage    ? `<span>Dosage: <strong>${escapeHtml(m.dosage)}</strong></span>` : ''}
              ${m.frequency ? `<span>Freq: <strong>${escapeHtml(m.frequency)}</strong></span>` : ''}
            </div>
          </div>`).join('')}
      </div>` : ''}

    <!-- Doctor's notes -->
    ${rx.notes ? `
      <div style="margin-top:20px;padding:14px;background:var(--color-warning-light, #fffbeb);border-radius:var(--radius-md);border-left:4px solid var(--color-warning);">
        <div style="font-weight:600;margin-bottom:4px;font-family:var(--font-primary);">Doctor's Notes</div>
        <p style="font-size:0.9375rem;color:var(--color-text-secondary);line-height:1.6;margin:0;">${escapeHtml(rx.notes)}</p>
      </div>` : ''}
  `;

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

// ── Close Modal ────────────────────────────────────────────────
function closeModal() {
  const modal = modalEl();
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
}

// ── Event Bindings ─────────────────────────────────────────────
function bindEvents() {
  // Search input — real-time filtering
  searchInput()?.addEventListener('input', handleSearch);

  // Card clicks (event delegation on list container)
  listEl()?.addEventListener('click', (e) => {
    const card = e.target.closest('.prescription-card');
    if (!card) return;
    const rx = prescriptions.find(p => p.id === card.dataset.id);
    if (rx) showDetail(rx);
  });

  // Keyboard enter on focused card
  listEl()?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const card = e.target.closest('.prescription-card');
      if (!card) return;
      const rx = prescriptions.find(p => p.id === card.dataset.id);
      if (rx) showDetail(rx);
    }
  });

  // Close modal — button
  closeBtn()?.addEventListener('click', closeModal);

  // Close modal — overlay click
  modalEl()?.addEventListener('click', (e) => {
    if (e.target === modalEl()) closeModal();
  });

  // Close modal — Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalEl()?.style.display !== 'none') {
      closeModal();
    }
  });
}

// ── Boot ───────────────────────────────────────────────────────
init();
