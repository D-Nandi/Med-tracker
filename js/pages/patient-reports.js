// ============================================================
// Patient Reports Page — Upload, View & Manage Medical Reports
// ============================================================

import { requireAuth } from '../components/auth-guard.js';
import { renderSidebar, renderTopbar, svgIcon } from '../components/sidebar.js';
import { db } from '../firebase/init.js';
import { getPatientReports, addReport, deleteReport } from '../firebase/firestore.js';
import { uploadReport, validateFile, deleteFile } from '../firebase/storage.js';
import { formatDate, fileSizeLabel, renderSkeletonCards } from '../utils/ui.js';
import toast from '../components/toast.js';
import { confirmDialog } from '../components/modal.js';

// ── State ───────────────────────────────────────────────────
let userData = null;
let allReports = [];
let selectedFile = null;

// ── DOM References ──────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);

// ── Initialisation ──────────────────────────────────────────
async function init() {
  try {
    userData = await requireAuth(['patient']);
    renderSidebar(userData, 'reports');
    renderTopbar('Reports', userData);

    bindUploadZone();
    bindUploadButton();
    bindSearch();

    await loadReports(userData.uid);
  } catch (e) {
    /* auth-guard handles redirect */
  }
}

// ── Load Reports ────────────────────────────────────────────
async function loadReports(patientId) {
  const grid = $('#reports-grid');
  if (!grid) return;

  // Show skeleton loaders while fetching
  grid.innerHTML = renderSkeletonCards(6);

  try {
    allReports = await getPatientReports(patientId);
    renderReports(allReports);
  } catch (err) {
    console.error('Failed to load reports:', err);
    toast.error('Could not load reports');
    grid.innerHTML = '';
  }
}

// ── Render Report Cards ─────────────────────────────────────
function renderReports(reports) {
  const grid = $('#reports-grid');
  if (!grid) return;

  // Empty state
  if (!reports || reports.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${svgIcon('folder', 48)}</div>
        <h3>No reports found</h3>
        <p>Upload your first medical report using the form above.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = reports.map((report) => {
    const data = report.data ? report.data : report;
    const id = report.id || '';
    const reportType = data.reportType || 'Other';
    const fileName = data.fileName || 'Untitled';
    const fileUrl = data.fileUrl || '#';
    const fileSize = data.fileSize ? fileSizeLabel(data.fileSize) : '—';
    const date = data.createdAt ? formatDate(data.createdAt) : '—';
    const storagePath = data.storagePath || data.filePath || '';

    return `
      <div class="report-card" data-id="${id}">
        <div class="report-icon">${svgIcon('folder', 28)}</div>
        <div class="report-name" title="${escapeAttr(fileName)}">${escapeAttr(reportType)}</div>
        <div class="report-date">${date}</div>
        <div class="report-meta">${escapeAttr(fileName)} · ${fileSize}</div>
        <div class="report-actions">
          <a href="${fileUrl}" target="_blank" rel="noopener" class="btn btn-sm btn-primary">
            View
          </a>
          <a href="${fileUrl}" download="${escapeAttr(fileName)}" class="btn btn-sm btn-secondary">
            Download
          </a>
          <button class="btn btn-sm btn-danger btn-delete-report"
                  data-id="${id}"
                  data-path="${escapeAttr(storagePath)}">
            Delete
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Bind delete buttons
  grid.querySelectorAll('.btn-delete-report').forEach((btn) => {
    btn.addEventListener('click', () => handleDelete(btn.dataset.id, btn.dataset.path));
  });
}

// ── Upload Zone (Drag & Drop + Click) ───────────────────────
function bindUploadZone() {
  const zone = $('#upload-zone');
  const fileInput = $('#file-input');
  if (!zone || !fileInput) return;

  // Click to open file picker
  zone.addEventListener('click', () => fileInput.click());

  // Drag events
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });

  zone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });

  zone.addEventListener('dragleave', () => {
    zone.classList.remove('drag-over');
  });

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  });

  // File input change
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handleFileSelection(fileInput.files[0]);
    }
  });
}

// ── Handle File Selection ───────────────────────────────────
function handleFileSelection(file) {
  // Validate file type & size
  const validation = validateFile(file);
  if (validation !== true) {
    toast.error(validation);
    selectedFile = null;
    updateFileDisplay(null);
    return;
  }

  selectedFile = file;
  updateFileDisplay(file);
}

function updateFileDisplay(file) {
  const filenameEl = $('#upload-filename');
  const zone = $('#upload-zone');

  if (file && filenameEl) {
    filenameEl.textContent = file.name;
  } else if (filenameEl) {
    filenameEl.textContent = '';
  }

  // Visual feedback on zone
  if (zone) {
    if (file) {
      zone.classList.add('file-selected');
    } else {
      zone.classList.remove('file-selected');
    }
  }
}

// ── Upload Button ───────────────────────────────────────────
function bindUploadButton() {
  const btn = $('#upload-btn');
  if (!btn) return;

  btn.addEventListener('click', handleUpload);
}

async function handleUpload() {
  const reportTypeSelect = $('#report-type');
  const reportType = reportTypeSelect ? reportTypeSelect.value : '';

  // Validate selections
  if (!selectedFile) {
    toast.error('Please select a file to upload');
    return;
  }

  if (!reportType) {
    toast.error('Please select a report type');
    return;
  }

  const uploadBtn = $('#upload-btn');
  const progressContainer = $('#upload-progress');
  const progressFill = $('#progress-fill');
  const pctText = $('#upload-pct');

  try {
    // Disable button during upload
    if (uploadBtn) uploadBtn.disabled = true;

    // Show progress bar
    if (progressContainer) progressContainer.style.display = 'block';

    // Progress callback
    const onProgress = (pct) => {
      const percent = Math.round(pct);
      if (progressFill) progressFill.style.width = `${percent}%`;
      if (pctText) pctText.textContent = `${percent}%`;
    };

    // Upload file to Storage
    const result = await uploadReport(selectedFile, userData.uid, onProgress);

    // Save metadata to Firestore
    await addReport({
      patientId: userData.uid,
      reportType: reportType,
      fileName: selectedFile.name,
      fileUrl: result.url,
      fileType: selectedFile.type,
      fileSize: selectedFile.size,
      storagePath: result.path || ''
    });

    toast.success('Report uploaded successfully!');

    // Reset form
    resetUploadForm();

    // Reload reports
    await loadReports(userData.uid);
  } catch (err) {
    console.error('Upload failed:', err);
    toast.error('Upload failed. Please try again.');
  } finally {
    if (uploadBtn) uploadBtn.disabled = false;
    if (progressContainer) progressContainer.style.display = 'none';
    if (progressFill) progressFill.style.width = '0%';
    if (pctText) pctText.textContent = '0%';
  }
}

function resetUploadForm() {
  selectedFile = null;
  updateFileDisplay(null);

  const fileInput = $('#file-input');
  const reportTypeSelect = $('#report-type');

  if (fileInput) fileInput.value = '';
  if (reportTypeSelect) reportTypeSelect.value = '';
}

// ── Delete Report ───────────────────────────────────────────
async function handleDelete(reportId, storagePath) {
  if (!reportId) return;

  const confirmed = await confirmDialog('Delete this report? This action cannot be undone.');
  if (!confirmed) return;

  try {
    // Delete file from Storage (if path exists)
    if (storagePath) {
      await deleteFile(storagePath);
    }

    // Delete metadata from Firestore
    await deleteReport(reportId);

    toast.success('Report deleted successfully');

    // Reload reports
    await loadReports(userData.uid);
  } catch (err) {
    console.error('Delete failed:', err);
    toast.error('Failed to delete report');
  }
}

// ── Search / Filter ─────────────────────────────────────────
function bindSearch() {
  const searchInput = $('#search-reports');
  if (!searchInput) return;

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();

    if (!query) {
      renderReports(allReports);
      return;
    }

    const filtered = allReports.filter((report) => {
      const data = report.data ? report.data : report;
      const reportType = (data.reportType || '').toLowerCase();
      const fileName = (data.fileName || '').toLowerCase();
      return reportType.includes(query) || fileName.includes(query);
    });

    renderReports(filtered);
  });
}

// ── Utility: Escape HTML attributes ─────────────────────────
function escapeAttr(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── Boot ────────────────────────────────────────────────────
init();
