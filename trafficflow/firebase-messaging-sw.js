// ✅ Use v9.6.1 to match index.html (version consistency is critical)
importScripts("https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js");

firebase.initializeApp({
    apiKey: "AIzaSyAKGbbt_ARGWep8ggPuk_iE6R1xALkmJM8",
    authDomain: "trafficiq-3ef14.firebaseapp.com",        // ✅ Fixed: removed stray "N"
    projectId: "trafficiq-3ef14",
    storageBucket: "trafficiq-3ef14.firebasestorage.app",
    messagingSenderId: "97313655693",
    appId: "1:97313655693:web:fee4304d7815bdceaf0bc4"     // ✅ Fixed: was "P1:..."
});

const messaging = firebase.messaging();

// Handles notifications when the app is in the BACKGROUND or CLOSED
messaging.onBackgroundMessage(function(payload) {
    console.log('[SW] Background message received:', payload);

    const title = payload.notification?.title || "Traffic IQ Alert";
    const body  = payload.notification?.body  || "There is a traffic update near you.";

    self.registration.showNotification(title, {
        body:    body,
        icon:    "/icon.png",
        badge:   "/icon.png",
        vibrate: [200, 100, 200],
        data:    payload.data || {}
    });
});