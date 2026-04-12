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
    if (profileImg) {
        if (hostData.avatar_url) {
            profileImg.src = hostData.avatar_url;
        } else {
            const initial = (hostData.full_name || hostData.email || 'H').charAt(0).toUpperCase();
            profileImg.src = `https://placehold.co/100x100/0066ff/ffffff?text=${initial}`;
        }
    }
    
    const banner = document.getElementById('verificationBanner');
    if (banner && !hostData.is_active) {
        banner.style.display = 'flex';
    }
}

// Global fetch cache to avoid double calling
let cachedFests = null;

// Load stats (cookie automatically sent)
async function loadStats(hostData) {
    await fetchAndRenderFests();
}

// Load fests from backend (cookie automatically sent)
async function fetchAndRenderFests() {
    try {
        const res = await fetch(`${API_URL}/fest/my-fests`, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();
        
        if (data.success) {
            cachedFests = data.fests || [];
            
            // Calculate aggregations
            let totalRev = 0;
            let totalTix = 0;
            
            cachedFests.forEach(f => {
                totalRev += (f.fest_analytics?.total_revenue || 0);
                totalTix += (f.fest_analytics?.total_tickets_sold || 0);
            });
            
            // Populate Featured/Global Tags
            const tFests = document.getElementById('totalFests');
            const tTix = document.getElementById('totalTickets');
            const tRev = document.getElementById('totalRevenue');
            const tAtt = document.getElementById('totalAttendees'); // Often equals tickets sold
            
            if (tFests) tFests.textContent = cachedFests.length;
            if (tTix) tTix.textContent = totalTix;
            if (tAtt) tAtt.textContent = totalTix;
            
            // Indian Rupee Format
            if (tRev) {
                tRev.textContent = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalRev);
            }
            
            // Render the NFT UI Layout Cards
            const container = document.getElementById('liveFests');
            if (!cachedFests.length) {
                container.innerHTML = `
                    <div class="empty-state" style="grid-column: 1/-1; text-align: left; padding: 3rem;">
                        <h3 style="margin-bottom:1rem; color:var(--text-muted)">No Active Events</h3>
                        <a href="create-fest.html" class="nft-add-btn" style="display:inline-flex; width:auto;">Initialize your first portal 🚀</a>
                    </div>
                `;
            } else {
                let cardsHTML = '';
                const themeColors = ['var(--card-purple)', 'var(--card-yellow)', 'var(--card-green)'];
                
                cachedFests.slice(0, 5).forEach((fest, index) => {
                    const bg = themeColors[index % themeColors.length];
                    const offset = index * 140;
                    const z = 50 - index;
                    const scale = 1 - (index * 0.05);
                    const y = index * 10;
                    
                    // Small timer logic placeholder based on start_date
                    const targetDate = new Date(fest.start_date);
                    const diffDays = Math.ceil((targetDate - new Date()) / (1000 * 60 * 60 * 24)) || 0;
                    
                    cardsHTML += `
                    <div class="nft-card" onclick="openFest('${fest.id}')" style="left:${offset}px; z-index:${z}; transform: scale(${scale}) translateY(${y}px); background: ${bg}">
                        <div class="card-top">
                            <div class="card-top-left" style="overflow:hidden; text-wrap:nowrap; max-width:120px;">
                                <span style="font-size: 0.8rem;">${fest.fest_name}</span>
                            </div>
                            <div class="card-lock" title="${fest.fest_type}"><i class="fas fa-bolt"></i></div>
                        </div>
                        
                        <div class="card-timer">
                            <div class="timer-pill">${diffDays >= 0 ? diffDays : 0}<span>DAYS</span></div>
                        </div>
                        
                        <div class="card-bottom">
                            <div class="card-price-pill"><i class="fas fa-ticket-alt"></i> <span>${fest.fest_analytics?.total_tickets_sold || 0}</span></div>
                            <div class="card-lock" style="background: rgba(0,0,0,0.1);"><i class="fas fa-arrow-right" style="color: black"></i></div>
                        </div>
                    </div>
                    `;
                });
                
                container.innerHTML = cardsHTML;
                
                // Inject the most premium fest into the giant right-side hero section if it exists
                updateFeaturedHero(cachedFests[0]);
            }
            
            // Also generate the history table if possible
            loadActivities();
        }
        
    } catch (err) {
        console.error('Failed to fetch fests API:', err);
    }
}

function updateFeaturedHero(fest) {
    if (!fest) return;
    
    // Attempting to safely update the DOM if the featured elements exist
    const heroImg = document.querySelector('.featured-image');
    if (heroImg) {
        heroImg.src = fest.banner_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
    }
    
    const titleH2 = document.querySelector('.featured-info h2');
    if (titleH2) titleH2.textContent = fest.fest_name;
    
    const typeH3 = document.querySelector('.featured-info h3');
    if (typeH3) typeH3.textContent = `#${fest.fest_type.toUpperCase()}`;
}

// Load activities (Mapped to Recent Fests for visual demo)
function loadActivities() {
    const container = document.getElementById('activityList');
    
    if (!cachedFests || cachedFests.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; color: var(--text-muted); padding: 20px;">
                    No recent activity
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    cachedFests.slice(0, 5).forEach(fest => {
        const dDate = new Date(fest.created_at || fest.start_date);
        const formatStr = dDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
        const rev = fest.fest_analytics?.total_revenue || 0;
        const revStr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(rev);
        const tix = fest.fest_analytics?.total_tickets_sold || 0;
        
        html += `
        <tr>
            <td>${fest.fest_name}</td>
            <td class="history-row-users">
                <img src="${fest.banner_url || 'https://placehold.co/50'}" style="object-fit:cover;"> <i class="fas fa-arrow-right history-arrow"></i>
            </td>
            <td>${tix}</td>
            <td>${revStr}</td>
            <td style="color: var(--nft-text-muted)">${formatStr || '--/--'}</td>
        </tr>
        `;
    });
    
    container.innerHTML = html;
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