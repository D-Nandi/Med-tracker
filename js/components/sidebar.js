// =============================================
// MediTrack - Sidebar Component
// =============================================
import { auth } from "../firebase/init.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import toast from "./toast.js";

const NAV_ITEMS = {
  patient: [
    { id: 'dashboard',      label: 'Dashboard',       icon: 'home',          href: '/pages/patient/dashboard.html' },
    { id: 'prescriptions',  label: 'Prescriptions',   icon: 'file-text',     href: '/pages/patient/prescriptions.html' },
    { id: 'medicines',      label: 'Medicines',       icon: 'pill',          href: '/pages/patient/medicines.html' },
    { id: 'reports',        label: 'Reports',         icon: 'folder',        href: '/pages/patient/reports.html' },
    { id: 'appointments',   label: 'Appointments',    icon: 'calendar',      href: '/pages/patient/appointments.html' },
    { id: 'period-tracker', label: 'Period Tracker',  icon: 'cycle',         href: '/pages/patient/period-tracker.html' },
    { id: 'timeline',       label: 'Health Timeline', icon: 'clock',         href: '/pages/patient/timeline.html' },
    { id: 'settings',       label: 'Settings',        icon: 'settings',      href: '/pages/patient/settings.html' },
  ],
  doctor: [
    { id: 'dashboard', label: 'Dashboard', icon: 'home', href: '/pages/doctor/dashboard.html' },
    { id: 'patients', label: 'Patients', icon: 'users', href: '/pages/doctor/patients.html' },
    { id: 'prescriptions', label: 'Prescriptions', icon: 'file-text', href: '/pages/doctor/prescriptions.html' },
    { id: 'appointments', label: 'Appointments', icon: 'calendar', href: '/pages/doctor/appointments.html' },
  ],
  admin: [
    { id: 'dashboard', label: 'Dashboard', icon: 'home', href: '/pages/admin/dashboard.html' },
    { id: 'doctors', label: 'Doctors', icon: 'user-check', href: '/pages/admin/doctors.html' },
    { id: 'patients', label: 'Patients', icon: 'users', href: '/pages/admin/patients.html' },
    { id: 'reports', label: 'Reports', icon: 'bar-chart', href: '/pages/admin/reports.html' },
  ]
};

const SVG_ICONS = {
  home: `<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>`,
  'file-text': `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>`,
  pill: `<path d="M10.5 20H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3.5"/><path d="M20 10.5V6a2 2 0 0 0-2-2h-3.5"/><path d="m8 16 8-8"/><rect x="8" y="8" width="8" height="8" rx="2"/>`,
  folder: `<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>`,
  calendar: `<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>`,
  clock: `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`,
  settings: `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>`,
  users: `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
  'user-check': `<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/>`,
  'bar-chart': `<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>`,
  'log-out': `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>`,
  bell: `<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>`,
  search: `<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>`,
  menu: `<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>`,
  cross: `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`,
  heart: `<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>`,
  cycle: `<path d="M12 2a10 10 0 1 0 10 10" stroke-linecap="round"/><polyline points="22 2 22 8 16 8"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>`,
};

function svgIcon(name, size = 20) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${SVG_ICONS[name] || ''}</svg>`;
}

export function renderSidebar(userData, activeId) {
  const items = NAV_ITEMS[userData.role] || [];
  const currentPath = window.location.pathname;
  const initials = (userData.name || userData.email || 'U').slice(0, 2).toUpperCase();
  const roleLabel = { patient: 'Patient', doctor: 'Doctor', admin: 'Administrator' }[userData.role] || userData.role;

  const sidebarEl = document.getElementById('sidebar');
  if (!sidebarEl) return;

  sidebarEl.innerHTML = `
    <div class="sidebar-logo">
      <div class="sidebar-logo-icon">${svgIcon('heart', 20)}</div>
      <div class="sidebar-logo-text">Medi<span>Track</span></div>
    </div>
    <nav class="sidebar-nav" aria-label="Main navigation">
      <div class="nav-section-title">Navigation</div>
      ${items.map(item => `
        <button class="nav-item ${activeId === item.id ? 'active' : ''}" data-href="${item.href}" aria-label="${item.label}" aria-current="${activeId === item.id ? 'page' : 'false'}">
          ${svgIcon(item.icon)}
          ${item.label}
        </button>
      `).join('')}
      <div class="nav-section-title" style="margin-top:24px;">Account</div>
      <button class="nav-item" id="logout-btn" aria-label="Sign out">
        ${svgIcon('log-out')}
        Sign Out
      </button>
    </nav>
    <div class="sidebar-footer">
      <div class="user-card">
        <div class="user-avatar">${initials}</div>
        <div>
          <div class="user-name">${userData.name || 'User'}</div>
          <div class="user-role">${roleLabel}</div>
        </div>
      </div>
    </div>
  `;

  // Nav item click handlers
  sidebarEl.querySelectorAll('.nav-item[data-href]').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.href = btn.dataset.href;
    });
  });

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    try {
      await signOut(auth);
      window.location.href = '/index.html';
    } catch {
      toast.error('Failed to sign out. Please try again.');
    }
  });
}

export function renderTopbar(pageTitle, userData) {
  const topbar = document.getElementById('topbar');
  if (!topbar) return;
  
  topbar.innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;">
      <button class="menu-toggle" id="menu-toggle" aria-label="Toggle navigation" aria-expanded="false">
        ${svgIcon('menu')}
      </button>
      <h1 class="page-title">${pageTitle}</h1>
    </div>
    <div class="topbar-right">
      <div class="search-bar" role="search">
        ${svgIcon('search', 16)}
        <input type="search" placeholder="Search..." aria-label="Search" id="global-search"/>
      </div>
      <div style="position:relative;">
        <button class="notif-btn" id="notif-btn" aria-label="Notifications" aria-haspopup="true">
          ${svgIcon('bell')}
          <span class="notif-badge" id="notif-badge" style="display:none;"></span>
        </button>
      </div>
    </div>
  `;

  // Mobile toggle
  const toggle = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  
  toggle?.addEventListener('click', () => {
    const isOpen = sidebar?.classList.contains('open');
    sidebar?.classList.toggle('open');
    overlay?.classList.toggle('show');
    toggle.setAttribute('aria-expanded', !isOpen);
  });

  overlay?.addEventListener('click', () => {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('show');
  });
}

export { svgIcon, SVG_ICONS };
