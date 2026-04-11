// Nexus Host Central Configuration
window.API_BASE_URL = 'https://nexus-host-backend.onrender.com/api';

// Firebase Configuration (for Compat/Namespaced SDKs)
const firebaseConfig = {
    apiKey: "AIzaSyBbgxg6QKLd3AGNKx5hNSksri05rMyYExA",
    authDomain: "nexus-host-b96e0.firebaseapp.com",
    projectId: "nexus-host-b96e0",
    storageBucket: "nexus-host-b96e0.firebasestorage.app",
    messagingSenderId: "906404829069",
    appId: "1:906404829069:web:7008b74e07b096087ecfc4"
};

// Initialize Firebase if the script is loaded
if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log('🔥 Firebase Initialized');
    }
}

console.log('✅ Nexus Config Loaded:', window.API_BASE_URL);
