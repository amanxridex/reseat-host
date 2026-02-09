const API_URL = 'https://nexus-host-backend.onrender.com/api';

// Check Auth & Load Real Data
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('nexus_token');
    const host = localStorage.getItem('nexus_host');
    
    if (!token || !host) {
        window.location.href = 'host-signup-login.html';
        return;
    }
    
    try {
        // Verify token & get fresh data from backend
        const res = await fetch(`${API_URL}/host/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
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
        console.error('Auth error:', err);
        // Clear invalid session
        localStorage.removeItem('nexus_token');
        localStorage.removeItem('nexus_host');
        window.location.href = 'host-signup-login.html';
    }
});

// Update UI with real host data
function updateUI(hostData) {
    // Update name
    const nameElement = document.getElementById('hostName');
    if (nameElement) {
        nameElement.textContent = hostData.full_name || hostData.email.split('@')[0];
    }
    
    // Update profile image if available
    const profileImg = document.getElementById('profileImg');
    if (profileImg && hostData.avatar_url) {
        profileImg.src = hostData.avatar_url;
    }
    
    // Show verification banner if needed
    const banner = document.getElementById('verificationBanner');
    if (banner && !hostData.is_active) {
        banner.style.display = 'flex';
    }
}

// Load stats (mock for now, replace with real API)
function loadStats(hostData) {
    // TODO: Replace with real stats API call
    document.getElementById('totalFests').textContent = '0';
    document.getElementById('totalTickets').textContent = '0';
    document.getElementById('totalRevenue').textContent = '₹0';
    document.getElementById('totalAttendees').textContent = '0';
    
    // Load fests from backend
    loadFests();
    
    // Load activities
    loadActivities();
}

// Load fests from backend
async function loadFests() {
    const token = localStorage.getItem('nexus_token');
    
    try {
        // TODO: Replace with real endpoint when available
        // const res = await fetch(`${API_URL}/host/fests`, {
        //     headers: { 'Authorization': `Bearer ${token}` }
        // });
        
        // For now, show empty state
        const container = document.getElementById('liveFests');
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">🎉</div>
                <h3>No Fests Yet</h3>
                <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Create your first college fest!</p>
                <a href="create-fest.html" class="btn-primary" style="display: inline-block; padding: 0.75rem 1.5rem; text-decoration: none;">
                    Create Fest
                </a>
            </div>
        `;
        
    } catch (err) {
        console.error('Failed to load fests:', err);
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
    const url = 'https://nexus.app/fest/techfest-2025';
    
    if (platform === 'whatsapp') {
        window.open(`https://wa.me/?text=Check out this fest! ${url}`);
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

// Logout
function logout() {
    localStorage.removeItem('nexus_token');
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

// Open Fest
function openFest(festId) {
    sessionStorage.setItem('nexus_current_fest', festId);
    window.location.href = 'fest-details.html?id=' + festId;
}

// Close modal on outside click
document.getElementById('shareModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        closeShareModal();
    }
});