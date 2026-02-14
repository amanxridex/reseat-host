const API_URL = 'https://nexus-host-backend.onrender.com/api';

let currentFest = null;
let festId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth().then(valid => {
        if (valid) {
            loadFestDetails();
        }
    });
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
        
        return true;
    } catch (err) {
        console.error('Auth error:', err);
        window.location.href = 'host-signup-login.html';
        return false;
    }
}

// Load Fest Details
async function loadFestDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    festId = urlParams.get('id');
    
    if (!festId) {
        showError('No fest ID provided');
        return;
    }
    
    try {
        // ✅ Cookie automatically sent
        const response = await fetch(`${API_URL}/fest/${festId}`, {
            credentials: 'include', // ✅ Cookie sent
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Fest not found');
            }
            throw new Error('Failed to load fest');
        }
        
        const data = await response.json();
        currentFest = data.fest;
        
        renderFestDetails();
        
    } catch (error) {
        console.error('Error loading fest:', error);
        showError(error.message);
    }
}

// Render Fest Details (same as before)
function renderFestDetails() {
    if (!currentFest) return;
    
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('content').style.display = 'block';
    
    const now = new Date();
    const startDate = new Date(currentFest.start_date);
    const endDate = new Date(currentFest.end_date);
    
    let status = currentFest.status;
    let statusClass = '';
    let statusText = '';
    
    if (status === 'rejected') {
        statusClass = 'rejected';
        statusText = 'Rejected';
    } else if (endDate < now) {
        statusClass = 'completed';
        statusText = 'Completed';
    } else if (startDate <= now && endDate >= now) {
        statusClass = 'live';
        statusText = 'Live';
    } else {
        statusClass = 'upcoming';
        statusText = 'Upcoming';
    }
    
    const bannerUrl = currentFest.banner_url || 'https://placehold.co/1200x400/8b5cf6/ffffff?text=No+Banner';
    document.getElementById('festBanner').src = bannerUrl;
    
    const badge = document.getElementById('festStatus');
    badge.className = `status-badge ${statusClass}`;
    badge.textContent = statusText;
    
    document.getElementById('festName').textContent = currentFest.fest_name;
    document.getElementById('festType').textContent = `${currentFest.fest_type} Fest`;
    
    const dateStr = formatDateRange(startDate, endDate);
    document.getElementById('festDate').textContent = dateStr;
    
    document.getElementById('festVenue').textContent = currentFest.venue;
    
    document.getElementById('festAttendance').textContent = 
        `${currentFest.expected_attendance} attendees`;
    
    const ticketType = currentFest.is_paid ? 
        `₹${currentFest.ticket_price}` : 'Free';
    document.getElementById('ticketType').textContent = ticketType;
    
    const stats = currentFest.fest_analytics || {};
    document.getElementById('statTickets').textContent = 
        stats.total_tickets_sold || 0;
    document.getElementById('statRevenue').textContent = 
        `₹${(stats.total_revenue || 0).toLocaleString()}`;
    document.getElementById('statViews').textContent = 
        stats.total_views || 0;
    document.getElementById('statScans').textContent = '0';
    
    document.getElementById('festDescription').textContent = 
        currentFest.description || 'No description provided';
    
    document.getElementById('coordinatorName').textContent = 
        currentFest.coordinator_name;
    document.getElementById('contactPhone').textContent = 
        currentFest.contact_phone;
    document.getElementById('contactEmail').textContent = 
        currentFest.contact_email;
    
    document.title = `${currentFest.fest_name} | Nexus Host`;
}

// Format date range (same)
function formatDateRange(start, end) {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    const startStr = start.toLocaleDateString('en-US', options);
    const endStr = end.toLocaleDateString('en-US', options);
    
    if (startStr === endStr) {
        return startStr;
    }
    return `${startStr} - ${endStr}`;
}

// Show Error (same)
function showError(message) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('content').style.display = 'none';
    document.getElementById('errorState').style.display = 'flex';
    document.getElementById('errorMessage').textContent = message;
}

// Go Back (same)
function goBack() {
    window.location.href = 'my-fests.html';
}

// Edit Fest (same)
function editFest() {
    showToast('Edit feature coming soon!');
}

// Open Scanner (same)
function openScanner() {
    window.location.href = `qr-scanner.html?fest=${festId}`;
}

// View Analytics (same)
function viewAnalytics() {
    window.location.href = `analytics.html?fest=${festId}`;
}

// Share Fest (same)
function shareFest() {
    const link = `https://nexus.app/fest/${festId}`;
    document.getElementById('shareLink').value = link;
    document.getElementById('shareModal').classList.add('active');
}

// Close Share Modal (same)
function closeShareModal() {
    document.getElementById('shareModal').classList.remove('active');
}

// Copy Link (same)
function copyLink() {
    const input = document.getElementById('shareLink');
    input.select();
    navigator.clipboard.writeText(input.value);
    showToast('Link copied to clipboard!');
}

// Share To (same)
function shareTo(platform) {
    const link = document.getElementById('shareLink').value;
    const text = `Check out ${currentFest?.fest_name || 'this amazing college fest'}!`;
    
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

// Download Report (same)
function downloadReport() {
    showToast('Generating report...');
}

// Toggle Sidebar (same)
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
    } catch (e) {
        console.log('Logout API call failed');
    }
    
    localStorage.removeItem('nexus_host');
    sessionStorage.clear();
    window.location.href = 'host-signup-login.html';
}

// Toast (same)
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Close modal on outside click (same)
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});