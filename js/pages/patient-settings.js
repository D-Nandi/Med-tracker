/**
 * ============================================================
 *  MediTrack — Patient Settings
 * ============================================================
 *  Profile editing (name, phone, DOB, blood group, allergies)
 *  and password management.
 * ============================================================
 */

import { requireAuth } from '../components/auth-guard.js';
import { renderSidebar, renderTopbar } from '../components/sidebar.js';
import { auth, db } from '../firebase/init.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { updatePassword } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { updateUserProfile } from '../firebase/firestore.js';
import { getInitials } from '../utils/ui.js';
import toast from '../components/toast.js';

/* ── State ─────────────────────────────────────────────────── */
let userData = null;

/* ── DOM refs (lazy) ───────────────────────────────────────── */
const el = (id) => document.getElementById(id);

/* ── Bootstrap ─────────────────────────────────────────────── */
async function init() {
  try {
    userData = await requireAuth(['patient']);
    renderSidebar(userData, 'settings');
    renderTopbar('Settings', userData);
    await loadProfile(userData.uid);
    bindEvents();
  } catch (e) {
    /* auth-guard handles redirect */
  }
}

/* ── Load profile from Firestore ───────────────────────────── */
async function loadProfile(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));

    if (!snap.exists()) {
      toast.error('User profile not found.');
      return;
    }

    const data = snap.data();

    /* ── Avatar & header info ── */
    const avatar = el('profile-avatar');
    if (avatar) avatar.textContent = getInitials(data.name || '');

    const nameDisplay = el('profile-name');
    if (nameDisplay) nameDisplay.textContent = data.name || '';

    const emailDisplay = el('profile-email');
    if (emailDisplay) emailDisplay.textContent = data.email || '';

    /* ── Form fields ── */
    setVal('name',      data.name      || '');
    setVal('phone',     data.phone     || '');
    setVal('dob',       data.dob       || '');
    setVal('gender',    data.gender    || 'female');
    setVal('blood',     data.bloodGroup || '');
    setVal('allergies', data.allergies || '');

  } catch (err) {
    console.error('Load profile error:', err);
    toast.error('Failed to load profile.');
  }
}

/* ── Bind form events ──────────────────────────────────────── */
function bindEvents() {
  /* ── Profile form ── */
  const profileForm = el('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', handleProfileSave);
  }

  /* Also support dedicated save button outside the form */
  const saveBtn = el('save-profile-btn');
  if (saveBtn && !profileForm) {
    saveBtn.addEventListener('click', handleProfileSave);
  }

  /* ── Password form ── */
  const pwForm = el('pw-form');
  if (pwForm) {
    pwForm.addEventListener('submit', handlePasswordChange);
  }

  const pwBtn = el('change-pw-btn');
  if (pwBtn && !pwForm) {
    pwBtn.addEventListener('click', handlePasswordChange);
  }
}

/* ── Profile save handler ──────────────────────────────────── */
async function handleProfileSave(e) {
  e.preventDefault();

  const name       = getVal('name').trim();
  const phone      = getVal('phone').trim();
  const dob        = getVal('dob').trim();
  const gender     = getVal('gender') || 'female';
  const bloodGroup = getVal('blood');
  const allergies  = getVal('allergies').trim();

  /* ── Validation ── */
  if (!name) {
    toast.error('Name is required.');
    el('name')?.focus();
    return;
  }

  const saveBtn = el('save-profile-btn');

  try {
    /* Disable button while saving */
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';
    }

    await updateUserProfile(userData.uid, {
      name,
      phone,
      dob,
      gender,
      bloodGroup,
      allergies
    });

    /* Update cached display name */
    const nameDisplay = el('profile-name');
    if (nameDisplay) nameDisplay.textContent = name;

    const avatar = el('profile-avatar');
    if (avatar) avatar.textContent = getInitials(name);

    // Refresh sidebar in case gender changed
    userData.gender = gender;
    renderSidebar(userData, 'settings');

    toast.success('Profile updated successfully.');
  } catch (err) {
    console.error('Update profile error:', err);
    toast.error('Failed to update profile. Please try again.');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
    }
  }
}

/* ── Password change handler ───────────────────────────────── */
async function handlePasswordChange(e) {
  e.preventDefault();

  const newPw    = getVal('new-pw');
  const confirmPw = getVal('confirm-pw');

  /* ── Validation ── */
  if (!newPw || newPw.length < 8) {
    toast.error('Password must be at least 8 characters.');
    el('new-pw')?.focus();
    return;
  }

  if (newPw !== confirmPw) {
    toast.error('Passwords do not match.');
    el('confirm-pw')?.focus();
    return;
  }

  const pwBtn = el('change-pw-btn');

  try {
    if (pwBtn) {
      pwBtn.disabled = true;
      pwBtn.textContent = 'Updating…';
    }

    const user = auth.currentUser;
    if (!user) {
      toast.error('No authenticated user found. Please log in again.');
      return;
    }

    await updatePassword(user, newPw);

    /* Clear password fields */
    setVal('new-pw', '');
    setVal('confirm-pw', '');

    toast.success('Password updated!');
  } catch (err) {
    console.error('Password change error:', err);

    if (err.code === 'auth/requires-recent-login') {
      toast.error('Please log out and log back in before changing your password.');
    } else {
      toast.error('Failed to update password.');
    }
  } finally {
    if (pwBtn) {
      pwBtn.disabled = false;
      pwBtn.textContent = 'Change Password';
    }
  }
}

/* ── Tiny helpers ──────────────────────────────────────────── */
function getVal(id) {
  const input = el(id);
  return input ? input.value : '';
}

function setVal(id, val) {
  const input = el(id);
  if (input) input.value = val;
}

/* ── Start ─────────────────────────────────────────────────── */
init();
