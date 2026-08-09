// ============================================================
// firebase/auth.js — Authentication service
// ============================================================

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  doc, setDoc, getDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { auth, db } from "./init.js";

// ── Register a new patient ─────────────────────────────────────
export async function registerPatient({ name, email, password, phone }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });

  await setDoc(doc(db, "users", cred.user.uid), {
    uid:       cred.user.uid,
    name,
    email,
    phone:     phone || "",
    role:      "patient",
    createdAt: serverTimestamp(),
    avatar:    ""
  });

  return cred.user;
}

// ── Login ──────────────────────────────────────────────────────
export async function loginUser(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

// ── Get user role and profile from Firestore ───────────────────
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) throw new Error("User profile not found");
  return snap.data();
}

// ── Logout ─────────────────────────────────────────────────────
export async function logoutUser() {
  await signOut(auth);
}

// ── Password reset ─────────────────────────────────────────────
export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

// ── Auth state observer ────────────────────────────────────────
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// ── Redirect based on role ─────────────────────────────────────
export function redirectByRole(role) {
  const routes = {
    patient: "/pages/patient/dashboard.html",
    doctor:  "/pages/doctor/dashboard.html",
    admin:   "/pages/admin/dashboard.html"
  };
  const path = routes[role] || "/";
  window.location.href = path;
}

// ── Guard: require auth + optional role check ──────────────────
export async function requireAuth(allowedRoles = []) {
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, async user => {
      unsub();
      if (!user) {
        window.location.href = "/pages/login.html";
        return reject("Not authenticated");
      }
      try {
        const profile = await getUserProfile(user.uid);
        if (allowedRoles.length && !allowedRoles.includes(profile.role)) {
          redirectByRole(profile.role);
          return reject("Unauthorized role");
        }
        resolve({ user, profile });
      } catch (e) {
        window.location.href = "/pages/login.html";
        reject(e);
      }
    });
  });
}
