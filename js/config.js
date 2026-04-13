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

// ✅ NEW: Centralized Universal Logout Function
window.nexusLogout = async function() {
    try {
        // Destroy Backend Secure HTTP Session Cookie
        await fetch(`${window.API_BASE_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        console.error('Backend logout failed:', e);
    }
    
    // Purge local artifacts natively
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_host');
    sessionStorage.clear();
    
    // Destroy Firebase Auth Object if loaded
    if (typeof firebase !== 'undefined' && firebase.auth) {
        try { await firebase.auth().signOut(); } catch(e) {}
    }
    
    // Redirect to login explicitly purging history
    window.location.replace('host-signup-login.html');
};
