const API_URL = 'https://nexus-host-backend.onrender.com/api';

// Check Auth & Load Real Data (cookie-based)
document.addEventListener('DOMContentLoaded', async () => {
    // ✅ Check session cookie instead of localStorage token
    try {
        const res = await fetch(`${API_URL}/auth/check`, {
            credentials: 'include', // ✅ Cookie sent
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!res.ok) {
            throw new Error('No session');
        }
        
        const checkData = await res.json();
        
        if (!checkData.exists) {
            throw new Error('Host not found');
        }
        
    } catch (err) {
        console.error('Auth error:', err);
        // Clear invalid session
        localStorage.removeItem('nexus_host');
        window.location.href = 'host-signup-login.html';
        return;
    }
    
    try {
        // Get fresh data from backend (cookie automatically sent)
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            credentials: 'include', // ✅ Cookie sent
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!res.ok) {
            throw new Error('Session expired');
        }
        
        const data = await res.json();
        
        // Update UI with real data
        updateUI(data.data);
        
        // Load dashboard stats
        loadStats(data.data);
        
    } catch (err) {
        console.error('Failed to load profile:', err);
        showToast('Failed to load dashboard');
    }
});

// Update UI with real host data
function updateUI(hostData) {
    const nameElement = document.getElementById('hostName');
    if (nameElement) {
        nameElement.textContent = hostData.full_name || hostData.email.split('@')[0];
    }
    
    const profileImg = document.getElementById('profileImg');
    if (profileImg && hostData.avatar_url) {
        profileImg.src = hostData.avatar_url;
    }
    
    const banner = document.getElementById('verificationBanner');
    if (banner && !hostData.is_active) {
        banner.style.display = 'flex';
    }
}

// Load stats (cookie automatically sent)
async function loadStats(hostData) {
    // TODO: Replace with real stats API call
    document.getElementById('totalPropertys').textContent = '0';
    document.getElementById('totalTickets').textContent = '0';
    document.getElementById('totalRevenue').textContent = '₹0';
    document.getElementById('totalAttendees').textContent = '0';
    
    loadPropertys();
    loadActivities();
}

// Load propertys from backend (cookie automatically sent)
async function loadPropertys() {
    try {
        // TODO: Replace with real endpoint when available
        // const res = await fetch(`${API_URL}/host/propertys`, {
        //     credentials: 'include', // ✅ Cookie sent
        //     headers: { 'Content-Type': 'application/json' }
        // });
        
        const container = document.getElementById('livePropertys');
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">🎉</div>
                <h3>No Propertys Yet</h3>
                <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Create your first college property!</p>
                <a href="create-property.html" class="btn-primary" style="display: inline-block; padding: 0.75rem 1.5rem; text-decoration: none;">
                    Create Property
                </a>
            </div>
        `;
        
    } catch (err) {
        console.error('Failed to load propertys:', err);
    }
}

// Load activities
function loadActivities() {
    const container = document.getElementById('activityList');
    container.innerHTML = `
        <div class="activity-item" style="justify-content: center; color: var(--text-muted);">
            No recent activity
        </div>
    `;
}

// Toggle Sidebar
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

// Show Notifications
function showNotifications() {
    showToast('No new notifications');
}

// Share Modal
function showShareModal() {
    document.getElementById('shareModal').classList.add('active');
}

function closeShareModal() {
    document.getElementById('shareModal').classList.remove('active');
}

// Share To
function shareTo(platform) {
    const url = 'https://nexus.app/property/techproperty-2025';
    
    if (platform === 'whatsapp') {
        window.open(`https://wa.me/?text=Check out this property! ${url}`);
    } else if (platform === 'copy') {
        navigator.clipboard.writeText(url);
        showToast('Link copied to clipboard!');
    } else {
        showToast(`Sharing to ${platform}...`);
    }
    
    closeShareModal();
}

// Check Status
function checkStatus() {
    showToast('Your account is active and verified!');
}

// ✅ UPDATED: Logout with backend call
async function logout() {
    try {
        // Call backend to clear cookie
        await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include', // ✅ Cookie sent
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        console.error('Logout error:', err);
    }
    
    // Clear localStorage
    localStorage.removeItem('nexus_host');
    sessionStorage.clear();
    window.location.href = 'host-signup-login.html';
}

// Toast
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Open Property
function openProperty(propertyId) {
    sessionStorage.setItem('nexus_current_property', propertyId);
    window.location.href = 'property-details.html?id=' + propertyId;
}

// Close modal on outside click
document.getElementById('shareModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        closeShareModal();
    }
});