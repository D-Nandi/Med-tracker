// ============================================================
// firebase-messaging-sw.js — Service worker for FCM
// ============================================================
// This file must live at the root of the hosting directory (public/)

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize with your Firebase config
// NOTE: Replace with your actual config from Firebase Console
firebase.initializeApp({
  apiKey: "AIzaSyDpijlkW9Fpn-xZRQScMvffbB67K0035DE",
  authDomain: "meditrack-1b87d.firebaseapp.com",
  projectId: "meditrack-1b87d",
  storageBucket: "meditrack-1b87d.firebasestorage.app",
  messagingSenderId: "928230496777",
  appId: "1:928230496777:web:466426e1ac6e077507b6d8"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(payload => {
  console.log('[SW] Background message:', payload);

  const title = payload.notification?.title || 'MediTrack Notification';
  const options = {
    body: payload.notification?.body || '',
    icon: '/assets/icon-192.png',
    badge: '/assets/badge-72.png',
    data: payload.data || {}
  };

  self.registration.showNotification(title, options);
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
