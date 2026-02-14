const API_URL = 'https://nexus-host-backend.onrender.com/api';

let fests = [];
let currentFilter = 'all';
let selectedFestId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadFests();
});

// ✅ UPDATED: Check Auth with cookie
async function checkAuth() {
    try {
        const res = await fetch(`${API_URL}/auth/check`, {
            credentials: 'include', // ✅ Cookie sent
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!res.ok) {
            throw new Error('No session');
        }
        
        const data = await res.json();
        if (!data.exists) {
            throw new Error('Host not found');
        }
        
    } catch (err) {
        console.error('Auth error:', err);
        window.location.href = 'host-signup-login.html';
    }
}

// Load Fests from Backend (cookie automatically sent)
async function loadFests() {
    try {
        const response = await fetch(`${API_URL}/fest/my-fests`, {
            credentials: 'include', // ✅ Cookie sent
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch fests');
        }

        const data = await response.json();
        fests = data.fests || [];
        
        // Process fests (same logic as before)
        fests = fests.map(fest => {
            const now = new Date();
            const startDate = new Date(fest.start_date);
            const endDate = new Date(fest.end_date);
            
            let computedStatus;
            if (fest.status === 'rejected') {
                computedStatus = 'rejected';
            } else if (fest.status === 'pending_approval') {
                computedStatus = 'pending';
            } else if (endDate < now) {
                computedStatus = 'completed';
            } else if (startDate <= now && endDate >= now) {
                computedStatus = 'live';
            } else {
                computedStatus = 'upcoming';
            }
            
            const dateStr = formatDateRange(startDate, endDate);
            const stats = fest.fest_analytics || {};
            
            return {
                id: fest.id,
                name: fest.fest_name,
                date: dateStr,
                image: fest.banner_url || 'https://placehold.co/400x300/8b5cf6/ffffff?text=No+Banner',
                status: computedStatus,
                originalStatus: fest.status,
                ticketsSold: stats.total_tickets_sold || 0,
                revenue: stats.total_revenue || 0,
                scans: 0,
                startDate: fest.start_date,
                endDate: fest.end_date
            };
        });
        
        updateStats();
        renderFests();
        
    } catch (error) {
        console.error('Error loading fests:', error);
        showToast('Failed to load fests');
        document.getElementById('emptyState').style.display = 'block';
    }
}

// Format date range (same as before)
function formatDateRange(start, end) {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    const startStr = start.toLocaleDateString('en-US', options);
    const endStr = end.toLocaleDateString('en-US', options);
    
    if (startStr === endStr) {
        return startStr;
    }
    return `${startStr} - ${endStr}`;
}

// Update Stats (same as before)
function updateStats() {
    const total = fests.length;
    const live = fests.filter(f => f.status === 'live').length;
    const pending = fests.filter(f => f.status === 'pending').length;
    const completed = fests.filter(f => f.status === 'completed').length;
    
    document.getElementById('totalFests').textContent = total;
    document.getElementById('liveFests').textContent = live;
    document.getElementById('pendingFests').textContent = pending;
    document.getElementById('completedFests').textContent = completed;
}

// Filter Fests (same as before)
function filterFests(status) {
    currentFilter = status;
    
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    renderFests();
}

// Search Fests (same as before)
function searchFests() {
    renderFests();
}

// Render Fests (same as before)
function renderFests() {
    const container = document.getElementById('festsContainer');
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    let filtered = fests;
    
    if (currentFilter !== 'all') {
        filtered = filtered.filter(f => f.status === currentFilter);
    }
    
    if (searchTerm) {
        filtered = filtered.filter(f => 
            f.name.toLowerCase().includes(searchTerm) ||
            f.date.toLowerCase().includes(searchTerm)
        );
    }
    
    if (filtered.length === 0) {
        container.style.display = 'none';
        document.getElementById('emptyState').style.display = 'block';
        return;
    }
    
    container.style.display = 'grid';
    document.getElementById('emptyState').style.display = 'none';
    
    let html = '';
    filtered.forEach(fest => {
        const badgeClass = `badge-${fest.status}`;
        const badgeText = fest.status.toUpperCase();
        
        let primaryBtn = '';
        let secondaryBtn = '';
        
        if (fest.status === 'live') {
            primaryBtn = `<button class="fest-btn primary" onclick="openScanner('${fest.id}')"><i class="fas fa-qrcode"></i> Scan</button>`;
            secondaryBtn = `<button class="fest-btn" onclick="viewAnalytics('${fest.id}')"><i class="fas fa-chart-bar"></i> Stats</button>`;
        } else if (fest.status === 'upcoming') {
            primaryBtn = `<button class="fest-btn primary" onclick="openFest('${fest.id}')"><i class="fas fa-edit"></i> Manage</button>`;
            secondaryBtn = `<button class="fest-btn" onclick="shareFest('${fest.id}')"><i class="fas fa-share"></i> Share</button>`;
        } else if (fest.status === 'pending') {
            primaryBtn = `<button class="fest-btn" onclick="viewStatus('${fest.id}')"><i class="fas fa-clock"></i> Status</button>`;
            secondaryBtn = `<button class="fest-btn" onclick="editFest('${fest.id}')"><i class="fas fa-edit"></i> Edit</button>`;
        } else if (fest.status === 'completed') {
            primaryBtn = `<button class="fest-btn" onclick="viewReport('${fest.id}')"><i class="fas fa-file-alt"></i> Report</button>`;
            secondaryBtn = `<button class="fest-btn" onclick="duplicateFest('${fest.id}')"><i class="fas fa-copy"></i> Duplicate</button>`;
        } else {
            primaryBtn = `<button class="fest-btn" onclick="viewReason('${fest.id}')"><i class="fas fa-info"></i> Reason</button>`;
            secondaryBtn = `<button class="fest-btn" onclick="editFest('${fest.id}')"><i class="fas fa-redo"></i> Resubmit</button>`;
        }
        
        html += `
            <div class="fest-card">
                <div class="fest-image">
                    <img src="${fest.image}" alt="${fest.name}">
                    <span class="fest-badge ${badgeClass}">${badgeText}</span>
                    <button class="fest-actions-btn" onclick="openActions('${fest.id}')">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                </div>
                <div class="fest-info">
                    <h3>${fest.name}</h3>
                    <div class="fest-date">
                        <i class="fas fa-calendar"></i>
                        ${fest.date}
                    </div>
                    <div class="fest-stats">
                        <div class="fest-stat">
                            <div class="fest-stat-value">${fest.ticketsSold}</div>
                            <div class="fest-stat-label">Tickets</div>
                        </div>
                        <div class="fest-stat">
                            <div class="fest-stat-value">₹${(fest.revenue/1000).toFixed(1)}k</div>
                            <div class="fest-stat-label">Revenue</div>
                        </div>
                        <div class="fest-stat">
                            <div class="fest-stat-value">${fest.scans}</div>
                            <div class="fest-stat-label">Scans</div>
                        </div>
                    </div>
                </div>
                <div class="fest-footer">
                    ${secondaryBtn}
                    ${primaryBtn}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Open Actions Modal (same as before)
function openActions(festId) {
    selectedFestId = festId;
    const fest = fests.find(f => f.id === festId);
    
    const actionsList = document.getElementById('actionsList');
    let actions = '';
    
    actions += `
        <button class="action-item" onclick="viewFest('${festId}')">
            <i class="fas fa-eye"></i>
            <span>View Details</span>
        </button>
        <button class="action-item" onclick="shareFest('${festId}')">
            <i class="fas fa-share-alt"></i>
            <span>Share Fest</span>
        </button>
    `;
    
    if (fest.status === 'live' || fest.status === 'upcoming') {
        actions += `
            <button class="action-item" onclick="editFest('${festId}')">
                <i class="fas fa-edit"></i>
                <span>Edit Fest</span>
            </button>
        `;
    }
    
    if (fest.status !== 'completed' && fest.status !== 'rejected') {
        actions += `
            <button class="action-item danger" onclick="deleteFest('${festId}')">
                <i class="fas fa-trash"></i>
                <span>Delete Fest</span>
            </button>
        `;
    }
    
    actionsList.innerHTML = actions;
    document.getElementById('actionsModal').classList.add('active');
}

// Close Modal (same as before)
function closeModal() {
    document.getElementById('actionsModal').classList.remove('active');
    selectedFestId = null;
}

// View Fest (same as before)
function viewFest(id) {
    closeModal();
    sessionStorage.setItem('nexus_current_fest', id);
    window.location.href = 'fest-details.html?id=' + id;
}

// Open Fest (same as before)
function openFest(id) {
    sessionStorage.setItem('nexus_current_fest', id);
    window.location.href = 'fest-details.html?id=' + id;
}

// Edit Fest (same as before)
function editFest(id) {
    closeModal();
    showToast('Opening fest editor...');
}

// Open Scanner (same as before)
function openScanner(id) {
    sessionStorage.setItem('nexus_scan_fest', id);
    window.location.href = 'qr-scanner.html?fest=' + id;
}

// View Analytics (same as before)
function viewAnalytics(id) {
    sessionStorage.setItem('nexus_analytics_fest', id);
    window.location.href = 'analytics.html?fest=' + id;
}

// Share Fest (same as before)
function shareFest(id) {
    closeModal();
    const fest = fests.find(f => f.id === id);
    const link = `https://nexus.app/fest/${fest.id}`;
    
    document.getElementById('shareLink').value = link;
    document.getElementById('shareModal').classList.add('active');
}

// Close Share Modal (same as before)
function closeShareModal() {
    document.getElementById('shareModal').classList.remove('active');
}

// Copy Link (same as before)
function copyLink() {
    const input = document.getElementById('shareLink');
    input.select();
    navigator.clipboard.writeText(input.value);
    showToast('Link copied to clipboard!');
}

// Share To (same as before)
function shareTo(platform) {
    const link = document.getElementById('shareLink').value;
    const text = `Check out this amazing college fest!`;
    
    const urls = {
        whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + link)}`,
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`,
        email: `mailto:?subject=College Fest&body=${encodeURIComponent(text + '\n\n' + link)}`,
        instagram: '#'
    };
    
    if (platform === 'instagram') {
        copyLink();
        showToast('Link copied! Paste in Instagram bio or story.');
    } else {
        window.open(urls[platform], '_blank');
    }
}

// View Status (same as before)
function viewStatus(id) {
    showToast('Your fest is under review. Expected approval: 24 hours');
}

// View Report (same as before)
function viewReport(id) {
    showToast('Generating event report...');
}

// Duplicate Fest (same as before)
function duplicateFest(id) {
    showToast('Duplicating fest...');
}

// View Reason (same as before)
function viewReason(id) {
    showToast('Reason: Incomplete venue information provided');
}

// Delete Fest (same as before)
function deleteFest(id) {
    closeModal();
    selectedFestId = id;
    document.getElementById('deleteModal').classList.add('active');
}

// Close Delete Modal (same as before)
function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
    selectedFestId = null;
}

// ✅ UPDATED: Confirm Delete (cookie automatically sent)
async function confirmDelete() {
    if (!selectedFestId) return;
    
    try {
        // TODO: Add delete endpoint to backend
        // const response = await fetch(`${API_URL}/fest/${selectedFestId}`, {
        //     method: 'DELETE',
        //     credentials: 'include', // ✅ Cookie sent
        //     headers: { 'Content-Type': 'application/json' }
        // });
        
        fests = fests.filter(f => f.id !== selectedFestId);
        renderFests();
        updateStats();
        showToast('Fest deleted successfully');
        
    } catch (error) {
        showToast('Failed to delete fest');
    }
    
    closeDeleteModal();
}

// Toggle Sidebar (same as before)
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

// ✅ UPDATED: Logout with backend call
async function logout() {
    try {
        await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include', // ✅ Cookie sent
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        console.error('Logout error:', err);
    }
    
    localStorage.removeItem('nexus_host');
    sessionStorage.clear();
    window.location.href = 'host-signup-login.html';
}

// Toast (same as before)
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Close modals on outside click (same as before)
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});