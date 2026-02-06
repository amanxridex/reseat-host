// Host Data
let hostData = {
    name: 'Alex Kumar',
    email: 'alex@college.edu',
    college: 'Delhi University',
    isVerified: true,
    fests: [
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
            name: 'Cultural Night',
            date: 'Apr 5, 2025',
            image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400',
            status: 'upcoming',
            ticketsSold: 128,
            revenue: 12800,
            scans: 0
        },
        {
            id: 'fest_003',
            name: 'Sports Meet',
            date: 'Feb 20-22, 2025',
            image: 'https://images.unsplash.com/photo-1461896836934- voices?w=400',
            status: 'live',
            ticketsSold: 312,
            revenue: 15600,
            scans: 189
        }
    ],
    activities: [
        { type: 'ticket', title: 'New ticket booked', desc: 'Rahul Sharma booked 2 tickets for TechFest', time: '2 min ago' },
        { type: 'money', title: 'Revenue update', desc: '₹1,200 added to your wallet', time: '15 min ago' },
        { type: 'scan', title: 'Entry scanned', desc: 'Ticket #1234 scanned at gate', time: '1 hour ago' },
        { type: 'ticket', title: 'New ticket booked', desc: 'Priya Verma booked 1 ticket', time: '2 hours ago' }
    ]
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadHostData();
    renderFests();
    renderActivities();
    updateStats();
    
    // Check verification status
    if (!hostData.isVerified) {
        document.getElementById('verificationBanner').style.display = 'flex';
    }
});

// Check Auth
function checkAuth() {
    const host = sessionStorage.getItem('nexus_host');
    if (!host) {
        window.location.href = 'host-signup-login.html';
        return;
    }
    
    const data = JSON.parse(host);
    document.getElementById('hostName').textContent = data.email.split('@')[0];
}

// Load Host Data
function loadHostData() {
    const saved = sessionStorage.getItem('nexus_host_data');
    if (saved) {
        hostData = JSON.parse(saved);
    }
}

// Update Stats
function updateStats() {
    const totalFests = hostData.fests.length;
    const totalTickets = hostData.fests.reduce((sum, f) => sum + f.ticketsSold, 0);
    const totalRevenue = hostData.fests.reduce((sum, f) => sum + f.revenue, 0);
    const totalAttendees = hostData.fests.reduce((sum, f) => sum + f.scans, 0);
    
    document.getElementById('totalFests').textContent = totalFests;
    document.getElementById('totalTickets').textContent = totalTickets.toLocaleString();
    document.getElementById('totalRevenue').textContent = '₹' + (totalRevenue / 1000).toFixed(1) + 'K';
    document.getElementById('totalAttendees').textContent = totalAttendees.toLocaleString();
}

// Render Fests
function renderFests() {
    const container = document.getElementById('liveFests');
    
    let html = '';
    hostData.fests.forEach(fest => {
        const statusClass = fest.status === 'live' ? 'status-live' : 'status-upcoming';
        const statusText = fest.status === 'live' ? 'LIVE' : 'UPCOMING';
        
        html += `
            <div class="fest-card" onclick="openFest('${fest.id}')">
                <div class="fest-image">
                    <img src="${fest.image}" alt="${fest.name}">
                    <span class="fest-status ${statusClass}">${statusText}</span>
                </div>
                <div class="fest-info">
                    <h3>${fest.name}</h3>
                    <div class="fest-date">
                        <i class="fas fa-calendar"></i>
                        ${fest.date}
                    </div>
                    <div class="fest-stats">
                        <div class="fest-stat">
                            <span>${fest.ticketsSold}</span>
                            <span>Tickets</span>
                        </div>
                        <div class="fest-stat">
                            <span>₹${(fest.revenue / 1000).toFixed(1)}K</span>
                            <span>Revenue</span>
                        </div>
                        <div class="fest-stat">
                            <span>${fest.scans}</span>
                            <span>Scans</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Render Activities
function renderActivities() {
    const container = document.getElementById('activityList');
    
    let html = '';
    hostData.activities.forEach(activity => {
        const iconClass = activity.type;
        const icon = activity.type === 'ticket' ? 'fa-ticket-alt' : 
                    activity.type === 'money' ? 'fa-rupee-sign' : 'fa-qrcode';
        
        html += `
            <div class="activity-item">
                <div class="activity-icon ${iconClass}">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="activity-info">
                    <h4>${activity.title}</h4>
                    <p>${activity.desc}</p>
                </div>
                <span class="activity-time">${activity.time}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Toggle Sidebar
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

// Open Fest
function openFest(festId) {
    sessionStorage.setItem('nexus_current_fest', festId);
    window.location.href = 'fest-details.html?id=' + festId;
}

// Show Notifications
function showNotifications() {
    showToast('3 new notifications');
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
    showToast('Your application is under review. Expected approval: 24 hours');
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

// Close modal on outside click
document.getElementById('shareModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        closeShareModal();
    }
});