const API_URL = window.API_BASE_URL;

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
    const setStat = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setStat('totalGyms', '0');
    setStat('totalTickets', '0');
    setStat('totalRevenue', '₹0');
    setStat('totalAttendees', '0');
    setStat('activeSubs', '0'); // Supported in some layouts
    
    loadGyms();
    loadActivities();
}

// Load gyms from backend (cookie automatically sent)
async function loadGyms() {
    try {
        const container = document.getElementById('liveGyms');
        if (!container) return; // Silent return if element missing

        const response = await fetch(`${API_URL}/gyms/mine`, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const resData = await response.json();
        
        if (response.ok && resData.data && resData.data.length > 0) {
            const gyms = resData.data;
            const el = document.getElementById('totalGyms');
            if (el) el.textContent = gyms.length;
            
            // Calculate mock revenue or subs based on rules (0 subscribers as requested)
            const activeSubsEl = document.getElementById('activeSubs');
            if (activeSubsEl) activeSubsEl.textContent = '0';
            const totalRevenueEl = document.getElementById('totalRevenue');
            if (totalRevenueEl) totalRevenueEl.textContent = '₹0';
            
            // Render first 3 gyms
            container.innerHTML = gyms.slice(0, 3).map(gym => {
                let imgUrl = gym.images && gym.images.length > 0 ? gym.images[0] : 'https://placehold.co/400x300/1f113a/ffffff?text=Gym';
                return `
                    <div style="display: flex; gap: 15px; background: var(--bg-main); padding: 15px; border-radius: 12px; margin-bottom: 15px; border: 1px solid var(--border);">
                        <img src="${imgUrl}" alt="${gym.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">
                        <div style="flex: 1;">
                            <h4 style="margin: 0 0 5px 0; color: var(--text-main); font-size: 1.05rem;">${gym.name}</h4>
                            <p style="margin: 0 0 8px 0; color: var(--text-muted); font-size: 0.85rem;"><i class="fas fa-map-marker-alt"></i> ${gym.address}</p>
                            <span style="font-size: 0.75rem; font-weight: 700; padding: 4px 10px; border-radius: 20px; background: ${gym.status === 'published' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)'}; color: ${gym.status === 'published' ? '#10b981' : '#f59e0b'}; margin-right: 10px;">${gym.status.toUpperCase()}</span>
                            <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted);"><i class="fas fa-users"></i> 0 Subs</span>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            const el = document.getElementById('totalGyms');
            if (el) el.textContent = '0';
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">🎉</div>
                    <h3>No Gyms Yet</h3>
                    <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Create your first college gym!</p>
                    <a href="create-gym.html" class="btn-primary" style="display: inline-block; padding: 0.75rem 1.5rem; text-decoration: none;">
                        Create Gym
                    </a>
                </div>
            `;
        }
    } catch (err) {
        console.error('Failed to load gyms:', err);
    }
}

// Load activities
function loadActivities() {
    const container = document.getElementById('activityList');
    if (!container) return;

    container.innerHTML = `
        <div class="activity-item" style="justify-content: center; color: var(--text-muted);">
            No recent activity
        </div>
    `;
}

// Toggle Sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('active');
}

// Show Notifications
function showNotifications() {
    showToast('No new notifications');
}

// Share Modal
function showShareModal() {
    const modal = document.getElementById('shareModal');
    if (modal) modal.classList.add('active');
}

function closeShareModal() {
    const modal = document.getElementById('shareModal');
    if (modal) modal.classList.remove('active');
}

// Share To
function shareTo(platform) {
    const url = 'https://nexus.app/gym/techgym-2025';
    
    if (platform === 'whatsapp') {
        window.open(`https://wa.me/?text=Check out this gym! ${url}`);
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
    if (!toast) {
        console.log('Toast:', message);
        return;
    }
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Open Gym
function openGym(gymId) {
    sessionStorage.setItem('nexus_current_gym', gymId);
    showToast("Gym Details coming soon in Phase 2!");
}

// Close modal on outside click
const shareModal = document.getElementById('shareModal');
if (shareModal) {
    shareModal.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            closeShareModal();
        }
    });
}