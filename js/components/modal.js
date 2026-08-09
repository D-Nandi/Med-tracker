// =============================================
// MediTrack - Modal Component
// =============================================

export function createModal({ title, content, footer, size = '', onClose }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'modal-title');

  overlay.innerHTML = `
    <div class="modal ${size ? 'modal--' + size : ''}">
      <div class="modal-header">
        <h2 class="modal-title" id="modal-title">${title}</h2>
        <button class="modal-close" aria-label="Close dialog">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="modal-body">${content}</div>
      ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
    </div>
  `;

  const closeBtn = overlay.querySelector('.modal-close');
  
  function close() {
    overlay.classList.add('fade-out');
    setTimeout(() => {
      overlay.remove();
      if (onClose) onClose();
    }, 200);
  }

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', function handler(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', handler); }
  });

  document.body.appendChild(overlay);
  
  // Focus trap
  const focusable = overlay.querySelectorAll('button, input, select, textarea, a[href]');
  if (focusable.length) focusable[0].focus();

  return { overlay, close };
}

export function confirmDialog(message, title = 'Confirm') {
  return new Promise((resolve) => {
    const { overlay, close } = createModal({
      title,
      content: `<p style="color:var(--color-text-secondary);line-height:1.6;">${message}</p>`,
      footer: `
        <button class="btn btn-ghost" id="confirm-cancel">Cancel</button>
        <button class="btn btn-danger" id="confirm-ok">Confirm</button>
      `,
      onClose: () => resolve(false)
    });

    overlay.querySelector('#confirm-cancel').addEventListener('click', () => { close(); resolve(false); });
    overlay.querySelector('#confirm-ok').addEventListener('click', () => { close(); resolve(true); });
  });
}
