// =============================================
// MediTrack - Toast Notification Component
// =============================================

const ICONS = {
  success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 13.01 9 10.01"/></svg>`,
  error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
};

let container = null;

function getContainer() {
  if (!container) {
    container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
  }
  return container;
}

export function showToast(message, type = 'info', title = '', duration = 4000) {
  const c = getContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');
  
  const toastTitle = title || { success: 'Success', error: 'Error', warning: 'Warning', info: 'Info' }[type];
  
  toast.innerHTML = `
    <div class="toast-icon toast-icon--${type}">${ICONS[type] || ICONS.info}</div>
    <div class="toast-body">
      <div class="toast-title">${toastTitle}</div>
      <div class="toast-message">${message}</div>
    </div>
  `;
  
  c.appendChild(toast);
  
  // Remove on click
  toast.addEventListener('click', () => removeToast(toast));
  
  // Auto remove
  const timer = setTimeout(() => removeToast(toast), duration);
  toast._timer = timer;
}

function removeToast(toast) {
  if (toast._timer) clearTimeout(toast._timer);
  toast.classList.add('fade-out');
  setTimeout(() => toast.remove(), 300);
}

export const toast = {
  success: (msg, title) => showToast(msg, 'success', title),
  error: (msg, title) => showToast(msg, 'error', title),
  warning: (msg, title) => showToast(msg, 'warning', title),
  info: (msg, title) => showToast(msg, 'info', title),
};

export default toast;
