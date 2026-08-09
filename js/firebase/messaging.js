// ============================================================
// firebase/messaging.js — Push notification setup (optional)
// ============================================================
// NOTE: FCM requires a Firebase project with Cloud Messaging enabled
// and a valid VAPID key. This module gracefully degrades if not configured.

import { db } from './init.js';

let messaging = null;

/**
 * Initialize Firebase Cloud Messaging (if available)
 * @param {string} vapidKey - The VAPID key from Firebase Console
 */
export async function initMessaging(vapidKey) {
  try {
    const { getMessaging, getToken, onMessage } = await import(
      'https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js'
    );
    const { app } = await import('./init.js');

    messaging = getMessaging(app);

    // Register service worker
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('[FCM] Service worker registered');
    }

    return messaging;
  } catch (e) {
    console.warn('[FCM] Messaging not available:', e.message);
    return null;
  }
}

/**
 * Request notification permission and get FCM token
 * @param {string} vapidKey - VAPID key
 * @returns {string|null} FCM token or null
 */
export async function requestNotificationPermission(vapidKey) {
  if (!messaging) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[FCM] Notification permission denied');
      return null;
    }

    const { getToken } = await import(
      'https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js'
    );
    const token = await getToken(messaging, { vapidKey });
    console.log('[FCM] Token:', token);
    return token;
  } catch (e) {
    console.warn('[FCM] Failed to get token:', e.message);
    return null;
  }
}

/**
 * Listen for foreground messages
 * @param {Function} callback - Called with message payload
 */
export function onForegroundMessage(callback) {
  if (!messaging) return;

  import('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js')
    .then(({ onMessage }) => {
      onMessage(messaging, payload => {
        console.log('[FCM] Foreground message:', payload);
        callback(payload);
      });
    });
}
