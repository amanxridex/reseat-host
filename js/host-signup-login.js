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
        const preview = document.getElementById('filePreview');
        const fileName = document.getElementById('fileName');
        fileName.textContent = file.name;
        preview.classList.add('show');
    }
}

// Handle Login
function handleLogin(e) {
    e.preventDefault();
    const btn = e.target.querySelector('.btn-primary');
    const originalContent = btn.innerHTML;
    
    btn.innerHTML = '<div class="spinner"></div> Logging in...';
    btn.disabled = true;

    setTimeout(() => {
        const hostData = {
            email: e.target.querySelector('input[type="email"]').value,
            isHost: true,
            loginTime: new Date().toISOString()
        };
        sessionStorage.setItem('nexus_host', JSON.stringify(hostData));
        
        window.location.href = 'host-dashboard.html';
    }, 1500);
}

// Handle Signup
function handleSignup(e) {
    e.preventDefault();
    const btn = document.getElementById('signupBtn');
    const originalContent = btn.innerHTML;
    
    btn.innerHTML = '<div class="spinner"></div> Submitting...';
    btn.disabled = true;

    const formData = {
        name: e.target.querySelector('input[type="text"]').value,
        email: e.target.querySelectorAll('input[type="email"]')[0].value,
        phone: e.target.querySelector('input[type="tel"]').value,
        college: e.target.querySelectorAll('input[type="text"]')[1].value,
        regNumber: e.target.querySelectorAll('input[type="text"]')[2].value,
        status: 'pending_verification',
        submittedAt: new Date().toISOString()
    };

    sessionStorage.setItem('nexus_host_application', JSON.stringify(formData));

    setTimeout(() => {
        document.getElementById('signupForm').classList.remove('active');
        document.getElementById('successMessage').classList.add('show');
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }, 2000);
}

// Social Login
function socialLogin(provider) {
    showToast(`${provider} login coming soon!`);
}

// Forgot Password
function showForgotPassword() {
    showToast('Password reset link sent to your email!');
}

// Toast Notification
function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--card-bg);
        border: 1px solid var(--border);
        padding: 1rem 2rem;
        border-radius: 12px;
        color: white;
        font-family: 'Space Grotesk', sans-serif;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Check if already logged in
document.addEventListener('DOMContentLoaded', () => {
    const host = sessionStorage.getItem('nexus_host');
    if (host) {
        window.location.href = 'host-dashboard.html';
    }
});