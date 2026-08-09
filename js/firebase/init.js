// =============================================
// MediTrack - Firebase Initialization
// =============================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { getMessaging, isSupported } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";
import { firebaseConfig } from "./config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// FCM - only initialize if browser supports it
let messaging = null;
isSupported().then(supported => {
  if (supported) {
    messaging = getMessaging(app);
  }
}).catch(() => {});
export { messaging };

export default app;
