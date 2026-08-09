// =============================================
// MediTrack - Auth Guard
// Protects pages based on user role
// =============================================
import { auth } from "../firebase/init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "../firebase/init.js";

export function requireAuth(allowedRoles = []) {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (!user) {
        window.location.href = '/pages/login.html';
        return reject(new Error('Not authenticated'));
      }
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
          window.location.href = '/pages/login.html';
          return reject(new Error('User not found'));
        }
        const userData = { uid: user.uid, email: user.email, ...userDoc.data() };
        if (allowedRoles.length > 0 && !allowedRoles.includes(userData.role)) {
          // Redirect to appropriate dashboard
          if (userData.role === 'patient') window.location.href = '/pages/patient/dashboard.html';
          else if (userData.role === 'doctor') window.location.href = '/pages/doctor/dashboard.html';
          else if (userData.role === 'admin') window.location.href = '/pages/admin/dashboard.html';
          return reject(new Error('Unauthorized role'));
        }
        resolve(userData);
      } catch (err) {
        window.location.href = '/pages/login.html';
        reject(err);
      }
    });
  });
}

export function redirectIfLoggedIn() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (!user) return resolve(null);
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const role = userDoc.data().role;
          if (role === 'patient') window.location.href = '/pages/patient/dashboard.html';
          else if (role === 'doctor') window.location.href = '/pages/doctor/dashboard.html';
          else if (role === 'admin') window.location.href = '/pages/admin/dashboard.html';
        }
      } catch {}
      resolve(null);
    });
  });
}
