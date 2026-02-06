// Sample Data
let fests = [
    {
        id: 'fest_001',
        name: 'TechFest 2025',
        date: 'Mar 15-17, 2025',
        image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400',
        status: 'live',
        ticketsSold: 456,
        revenue: 45600,
        scans: 234
    },
    {
        id: 'fest_002',
        name: 'Cultural Night - Annual Fest',
        date: 'Apr 5, 2025',
        image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400',
        status: 'upcoming',
        ticketsSold: 128,
        revenue: 12800,
        scans: 0
    },
    {
        id: 'fest_003',
        name: 'Sports Meet 2025',
        date: 'Feb 20-22, 2025',
        image: 'https://images.unsplash.com/photo-1461896836934- voices?w=400',
        status: 'completed',
        ticketsSold: 312,
        revenue: 15600,
        scans: 298
    },
    {
        id: 'fest_004',
        name: 'Literary Fest - Wordsmith',
        date: 'May 10-12, 2025',
        image: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400',
        status: 'pending',
        ticketsSold: 0,
        revenue: 0,
        scans: 0
    },
    {
        id: 'fest_005',
        name: 'Management Summit',
        date: 'Jan 15, 2025',
        image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400',
        status: 'rejected',
        ticketsSold: 0,
        revenue: 0,
        scans: 0
    }
];

let currentFilter = 'all';
let selectedFestId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadFests();
    updateStats();
    renderFests();
});

// Check Auth
function checkAuth() {
    const host = sessionStorage.getItem('nexus_host');
    if (!host) {
        window.location.href = 'host-signup-login.html';
    }
}

// Load Fests from storage
function loadFests() {
    const pending = JSON.parse(sessionStorage.getItem('nexus_pending_fests') || '[]');
    if (pending.length > 0) {
        fests = [...pending, ...fests];
        sessionStorage.removeItem('nexus_pending_fests');
    }
}

// Update Stats
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

// Filter Fests
function filterFests(status) {
    currentFilter = status;
    
    // Update tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    renderFests();
}

// Search Fests
function searchFests() {
    renderFests();
}

// Render Fests
function renderFests() {
    const container = document.getElementById('festsContainer');
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    let filtered = fests;
    
    // Apply status filter
    if (currentFilter !== 'all') {
        filtered = filtered.filter(f => f.status === currentFilter);
    }
    
    // Apply search
    if (searchTerm) {
        filtered = filtered.filter(f => 
            f.name.toLowerCase().includes(searchTerm) ||
            f.date.toLowerCase().includes(searchTerm)
        );
    }
    
    // Show empty state
    if (filtered.length === 0) {
        container.style.display = 'none';
        document.getElementById('emptyState').style.display = 'block';
        return;
    }
    
    container.style.display = 'grid';
    document.getElementById('emptyState').style.display = 'none';
    
    // Render cards
    let html = '';
    filtered.forEach(fest => {
        const badgeClass = `badge-${fest.status}`;
        const badgeText = fest.status.toUpperCase();
        
        // Different buttons based on status
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

// Open Actions Modal
function openActions(festId) {
    selectedFestId = festId;
    const fest = fests.find(f => f.id === festId);
    
    const actionsList = document.getElementById('actionsList');
    let actions = '';
    
    // Common actions
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
    
    // Status-specific actions
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

// Close Modal
function closeModal() {
    document.getElementById('actionsModal').classList.remove('active');
    selectedFestId = null;
}

// View Fest
function viewFest(id) {
    closeModal();
    sessionStorage.setItem('nexus_current_fest', id);
    window.location.href = 'fest-details.html?id=' + id;
}

// Edit Fest
function editFest(id) {
    closeModal();
    showToast('Opening fest editor...');
}

// Open Scanner
function openScanner(id) {
    sessionStorage.setItem('nexus_scan_fest', id);
    window.location.href = 'qr-scanner.html?fest=' + id;
}

// View Analytics
function viewAnalytics(id) {
    sessionStorage.setItem('nexus_analytics_fest', id);
    window.location.href = 'analytics.html?fest=' + id;
}

// Share Fest
function shareFest(id) {
    closeModal();
    const fest = fests.find(f => f.id === id);
    const link = `https://nexus.app/fest/${fest.id}`;
    
    document.getElementById('shareLink').value = link;
    document.getElementById('shareModal').classList.add('active');
}

// Close Share Modal
function closeShareModal() {
    document.getElementById('shareModal').classList.remove('active');
}

// Copy Link
function copyLink() {
    const input = document.getElementById('shareLink');
    input.select();
    navigator.clipboard.writeText(input.value);
    showToast('Link copied to clipboard!');
}

// Share To
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

// View Status
function viewStatus(id) {
    showToast('Your fest is under review. Expected approval: 24 hours');
}

// View Report
function viewReport(id) {
    showToast('Generating event report...');
}

// Duplicate Fest
function duplicateFest(id) {
    showToast('Duplicating fest...');
}

// View Reason (for rejected)
function viewReason(id) {
    showToast('Reason: Incomplete venue information provided');
}

// Delete Fest
function deleteFest(id) {
    closeModal();
    selectedFestId = id;
    document.getElementById('deleteModal').classList.add('active');
}

// Close Delete Modal
function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
    selectedFestId = null;
}

// Confirm Delete
function confirmDelete() {
    if (selectedFestId) {
        fests = fests.filter(f => f.id !== selectedFestId);
        renderFests();
        updateStats();
        showToast('Fest deleted successfully');
    }
    closeDeleteModal();
}

// Toggle Sidebar
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

// Logout
function logout() {
    sessionStorage.removeItem('nexus_host');
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

// Close modals on outside click
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});