// API URL
const API_URL = 'https://nexus-host-backend.onrender.com/api';

// Firebase Config
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js';
import { 
    getAuth, 
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js';

const firebaseConfig = {
    apiKey: "AIzaSyBbgxg6QKLd3AGNKx5hNSksri05rMyYExA",
    authDomain: "nexus-host-b96e0.firebaseapp.com",
    projectId: "nexus-host-b96e0",
    storageBucket: "nexus-host-b96e0.firebasestorage.app",
    messagingSenderId: "906404829069",
    appId: "1:906404829069:web:7008b74e07b096087ecfc4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Check if logged in
const host = localStorage.getItem('nexus_host');
if (host) {
    window.location.href = 'host-dashboard.html';
}

// Switch tabs
window.switchTab = (tab) => {
    document.querySelectorAll('.toggle-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.form-section').forEach(f => f.classList.remove('active'));
    
    if (tab === 'login') {
        document.getElementById('loginForm').classList.add('active');
        document.querySelectorAll('.toggle-tab')[0].classList.add('active');
    } else {
        document.getElementById('signupForm').classList.add('active');
        document.querySelectorAll('.toggle-tab')[1].classList.add('active');
    }
};

// Show toast
const showToast = (msg) => {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
};

// Login
window.handleLogin = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    btn.innerHTML = '<div class="spinner"></div> Logging in...';
    btn.disabled = true;

    try {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        // Firebase login
        const result = await signInWithEmailAndPassword(auth, email, password);
        const token = await result.user.getIdToken();

        // Get host from backend
        const res = await fetch(`${API_URL}/host/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Login failed');
        }

        // Save to localStorage
        localStorage.setItem('nexus_host', JSON.stringify(data.data));
        localStorage.setItem('nexus_token', token);

        showToast('Login successful!');
        setTimeout(() => {
            window.location.href = 'host-dashboard.html';
        }, 1000);

    } catch (err) {
        showToast(err.message);
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login to Dashboard';
        btn.disabled = false;
    }
};

// Signup
window.handleSignup = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('signupBtn');
    btn.innerHTML = '<div class="spinner"></div> Creating...';
    btn.disabled = true;

    try {
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const phone = document.getElementById('signupPhone').value;
        const college = document.getElementById('signupCollege').value;
        const reg = document.getElementById('signupReg').value;
        const password = document.getElementById('signupPassword').value;
        const confirm = document.getElementById('signupConfirm').value;

        if (password !== confirm) {
            throw new Error('Passwords do not match');
        }

        // Create Firebase user
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const token = await result.user.getIdToken();

        // Save temp data for profile completion
        sessionStorage.setItem('host_temp_data', JSON.stringify({
            uid: result.user.uid,
            token: token,
            email: email,
            name: name,
            phone: phone,
            college: college,
            reg: reg
        }));

        // Redirect to complete profile
        window.location.href = 'host-complete-profile.html';

    } catch (err) {
        showToast(err.message);
        btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
        btn.disabled = false;
    }
};

// Google Login
window.googleLogin = async () => {
    try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const token = await result.user.getIdToken();

        // Check if host exists
        const res = await fetch(`${API_URL}/host/check`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await res.json();

        if (data.exists) {
            // Existing user - login
            localStorage.setItem('nexus_host', JSON.stringify(data.host));
            localStorage.setItem('nexus_token', token);
            window.location.href = 'host-dashboard.html';
        } else {
            // New user - complete profile
            sessionStorage.setItem('host_temp_data', JSON.stringify({
                uid: result.user.uid,
                token: token,
                email: result.user.email,
                name: result.user.displayName || '',
                photo: result.user.photoURL
            }));
            window.location.href = 'host-complete-profile.html';
        }

    } catch (err) {
        showToast(err.message);
    }
};

// Forgot password
window.showForgotPassword = async () => {
    const email = prompt('Enter your email:');
    if (!email) return;
    
    try {
        await sendPasswordResetEmail(auth, email);
        showToast('Reset email sent!');
    } catch (err) {
        showToast(err.message);
    }
};