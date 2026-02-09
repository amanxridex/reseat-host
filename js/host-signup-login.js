// API Base URL
const API_URL = 'https://nexus-host-backend.onrender.com/api';

// Firebase Config (Host)
const firebaseConfig = {
  apiKey: "AIzaSyBbgxg6QKLd3AGNKx5hNSksri05rMyYExA",
  authDomain: "nexus-host-b96e0.firebaseapp.com",
  projectId: "nexus-host-b96e0",
  storageBucket: "nexus-host-b96e0.firebasestorage.app",
  messagingSenderId: "906404829069",
  appId: "1:906404829069:web:7008b74e07b096087ecfc4"
};

// Initialize Firebase
let auth;
document.addEventListener('DOMContentLoaded', async () => {
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js');
  const { getAuth } = await import('https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js');
  
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  
  // Check if already logged in
  const host = sessionStorage.getItem('nexus_host');
  if (host) {
    window.location.href = 'host-dashboard.html';
  }
});

// Switch between Login and Signup
function switchTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const successMessage = document.getElementById('successMessage');
  const tabs = document.querySelectorAll('.toggle-tab');

  tabs.forEach(t => t.classList.remove('active'));
  
  if (tab === 'login') {
    loginForm.classList.add('active');
    signupForm.classList.remove('active');
    successMessage.classList.remove('show');
    tabs[0].classList.add('active');
  } else {
    signupForm.classList.add('active');
    loginForm.classList.remove('active');
    successMessage.classList.remove('show');
    tabs[1].classList.add('active');
  }
}

// Handle File Upload
function handleFileUpload(input) {
  const file = input.files[0];
  if (file) {
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      showToast('File too large. Max 5MB allowed.');
      input.value = '';
      return;
    }
    
    const preview = document.getElementById('filePreview');
    const fileName = document.getElementById('fileName');
    fileName.textContent = file.name;
    preview.classList.add('show');
    
    // Store file for later upload
    window.idCardFile = file;
  }
}

// Handle Login
async function handleLogin(e) {
  e.preventDefault();
  const btn = e.target.querySelector('.btn-primary');
  const originalContent = btn.innerHTML;
  
  btn.innerHTML = '<div class="spinner"></div> Logging in...';
  btn.disabled = true;

  try {
    const { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } = 
      await import('https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js');
    
    const email = e.target.querySelector('input[type="email"]').value;
    const password = e.target.querySelector('input[type="password"]').value;
    
    // Firebase Auth
    const result = await signInWithEmailAndPassword(auth, email, password);
    const token = await result.user.getIdToken();
    
    // Check host status in backend
    const response = await fetch(`${API_URL}/auth/check`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    // Store auth data
    sessionStorage.setItem('nexus_host_token', token);
    sessionStorage.setItem('nexus_host_uid', result.user.uid);
    
    if (!data.exists) {
      // New user, redirect to complete profile
      showToast('Please complete your profile');
      setTimeout(() => {
        window.location.href = 'host-profile.html';
      }, 1000);
      return;
    }
    
    if (data.status === 'pending' || data.status === 'under_review') {
      showToast('Your account is pending verification');
      btn.innerHTML = originalContent;
      btn.disabled = false;
      return;
    }
    
    if (data.status === 'rejected') {
      showToast('Account verification rejected. Contact support.');
      btn.innerHTML = originalContent;
      btn.disabled = false;
      return;
    }
    
    // Get full profile
    const profileRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const profileData = await profileRes.json();
    sessionStorage.setItem('nexus_host', JSON.stringify(profileData.data));
    
    // Redirect to dashboard
    window.location.href = 'host-dashboard.html';
    
  } catch (err) {
    console.error('Login error:', err);
    showToast(err.message || 'Login failed');
    btn.innerHTML = originalContent;
    btn.disabled = false;
  }
}

// Handle Signup
async function handleSignup(e) {
  e.preventDefault();
  const btn = document.getElementById('signupBtn');
  const originalContent = btn.innerHTML;
  
  btn.innerHTML = '<div class="spinner"></div> Submitting...';
  btn.disabled = true;

  try {
    const { createUserWithEmailAndPassword, updateProfile } = 
      await import('https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js');
    
    // Get form values
    const name = e.target.querySelector('input[type="text"]').value;
    const email = e.target.querySelector('input[type="email"]').value;
    const phone = e.target.querySelector('input[type="tel"]').value;
    const college = e.target.querySelectorAll('input[type="text"]')[1].value;
    const regNumber = e.target.querySelectorAll('input[type="text"]')[2].value;
    const password = e.target.querySelectorAll('input[type="password"]')[0].value;
    const confirmPassword = e.target.querySelectorAll('input[type="password"]')[1].value;
    
    // Validate passwords match
    if (password !== confirmPassword) {
      showToast('Passwords do not match');
      btn.innerHTML = originalContent;
      btn.disabled = false;
      return;
    }
    
    // Create Firebase user
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    
    const token = await result.user.getIdToken();
    
    // Upload ID card if provided
    let idCardUrl = null;
    if (window.idCardFile) {
      const formData = new FormData();
      formData.append('file', window.idCardFile);
      
      const uploadRes = await fetch(`${API_URL}/upload/id-card`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const uploadData = await uploadRes.json();
      if (uploadData.success) {
        idCardUrl = uploadData.url;
      }
    }
    
    // Create host profile
    const hostData = {
      full_name: name,
      phone: phone,
      college_name: college,
      registration_number: regNumber,
      id_card_url: idCardUrl
    };
    
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(hostData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Signup failed');
    }
    
    // Show success
    document.getElementById('signupForm').classList.remove('active');
    document.getElementById('successMessage').classList.add('show');
    
  } catch (err) {
    console.error('Signup error:', err);
    showToast(err.message || 'Signup failed');
    btn.innerHTML = originalContent;
    btn.disabled = false;
  }
}

// Social Login
async function socialLogin(provider) {
  try {
    const { GoogleAuthProvider, OAuthProvider, signInWithPopup } = 
      await import('https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js');
    
    let providerObj;
    if (provider === 'google') {
      providerObj = new GoogleAuthProvider();
    } else if (provider === 'microsoft') {
      providerObj = new OAuthProvider('microsoft.com');
    }
    
    const result = await signInWithPopup(auth, providerObj);
    const token = await result.user.getIdToken();
    
    // Check if host exists
    const response = await fetch(`${API_URL}/auth/check`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    sessionStorage.setItem('nexus_host_token', token);
    sessionStorage.setItem('nexus_host_uid', result.user.uid);
    
    if (!data.exists) {
      // Pre-fill profile with social data
      sessionStorage.setItem('nexus_social_data', JSON.stringify({
        name: result.user.displayName,
        email: result.user.email,
        photo: result.user.photoURL
      }));
      window.location.href = 'host-profile.html';
    } else {
      window.location.href = 'host-dashboard.html';
    }
    
  } catch (err) {
    console.error('Social login error:', err);
    showToast(err.message || 'Social login failed');
  }
}

// Forgot Password
async function showForgotPassword() {
  const email = prompt('Enter your email:');
  if (!email) return;
  
  try {
    const { sendPasswordResetEmail } = 
      await import('https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js');
    
    await sendPasswordResetEmail(auth, email);
    showToast('Password reset email sent!');
  } catch (err) {
    showToast(err.message);
  }
}

// Toast Notification
function showToast(message) {
  // Remove existing toast
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}