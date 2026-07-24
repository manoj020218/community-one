// Firebase Cloud Messaging background handler.
// Must live at the site root (fixed path, not build-processed) and be
// registered by name — see src/lib/firebase.ts. The values below are the
// public Firebase Web SDK config (not secret; same as src/lib/firebase.ts),
// duplicated here because service workers can't read Vite's import.meta.env.
importScripts('https://www.gstatic.com/firebasejs/11.2.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.2.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBZhQHs47TOH1mvDOgsn2KXgkavnXpqK40',
  authDomain: 'community-dbf00.firebaseapp.com',
  projectId: 'community-dbf00',
  storageBucket: 'community-dbf00.firebasestorage.app',
  messagingSenderId: '856381822476',
  appId: '1:856381822476:web:8f09da2b836f6d7ddc0029',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || 'Jenix Society One', {
    body: body || '',
    icon: '/pwa-192x192.png',
    data: payload.data,
  });
});
