// qr-scanner.js - Complete Functional QR Scanner

// ✅ FIXED: Removed trailing space
const API_BASE_URL = 'https://nexus-host-backend.onrender.com/api';

// Get fest ID from URL
const urlParams = new URLSearchParams(window.location.search);
const festId = urlParams.get('fest') || urlParams.get('festId');

if (!festId) {
    alert('No fest selected. Please select a fest first.');
    window.location.href = 'my-fests.html';
}

// Global variables
let video = null;
let canvas = null;
let canvasContext = null;
let scanning = false;
let scanInterval = null;
let currentTicket = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    video = document.getElementById('camera-feed');
    canvas = document.getElementById('camera-canvas');
    canvasContext = canvas.getContext('2d');
    
    loadFestDetails();
    loadStats();
    loadRecentScans();
    initCamera();
});

// Get Firebase token
function getAuthToken() {
    try {
        return localStorage.getItem('nexus_token');
    } catch (e) {
        console.error('Error getting auth:', e);
    }
    return null;
}

// Redirect to login
function redirectToLogin() {
    window.location.href = 'host-signup-login.html';
}

// Load fest details
async function loadFestDetails() {
    const token = getAuthToken();
    if (!token) {
        redirectToLogin();
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/fests/${festId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load fest');

        const data = await response.json();
        document.getElementById('fest-name').textContent = data.name || 'Event';
        
    } catch (error) {
        console.error('Error loading fest:', error);
        document.getElementById('fest-name').textContent = 'Unknown Event';
    }
}

// Load stats
async function loadStats() {
    const token = getAuthToken();
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE_URL}/scan/fest-stats/${festId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        
        if (data.success) {
            const validScans = data.scans?.valid || 0;
            document.getElementById('scanned-count').textContent = validScans;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load recent scans
async function loadRecentScans() {
    const token = getAuthToken();
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE_URL}/scan/recent-scans/${festId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        
        if (data.success && data.scans?.length > 0) {
            renderRecentScans(data.scans);
        }
    } catch (error) {
        console.error('Error loading recent scans:', error);
    }
}

// Render recent scans
function renderRecentScans(scans) {
    const container = document.getElementById('scans-list');
    
    container.innerHTML = scans.map(scan => `
        <div class="scan-item">
            <div class="scan-info">
                <div class="scan-avatar">${(scan.attendee_name || 'G').charAt(0).toUpperCase()}</div>
                <div class="scan-details">
                    <h4>${scan.attendee_name || 'Guest'}</h4>
                    <p>${new Date(scan.scanned_at).toLocaleTimeString()}</p>
                </div>
            </div>
            <span class="scan-status ${scan.status === 'valid' ? 'allowed' : 'denied'}">
                ${scan.status === 'valid' ? 'Allowed' : 'Denied'}
            </span>
        </div>
    `).join('');
}

// Initialize camera
// Initialize camera - FORCE BACK CAMERA
async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { 
                facingMode: { exact: "environment" }  // Back camera only
            }
        });
        
        video.srcObject = stream;
        video.play();
        
        scanning = true;
        document.getElementById('camera-error').classList.add('hidden');
        scanInterval = setInterval(scanQRCode, 200);
        
    } catch (error) {
        console.error('Back camera failed:', error);
        
        // Fallback to any available camera
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true
            });
            video.srcObject = stream;
            video.play();
            scanning = true;
            document.getElementById('camera-error').classList.add('hidden');
            scanInterval = setInterval(scanQRCode, 200);
            showToast('Using front camera - please switch');
        } catch (fallbackError) {
            console.error('Camera error:', fallbackError);
            document.getElementById('camera-error').classList.remove('hidden');
            scanning = false;
        }
    }
}

// Handle scanned QR
async function handleQRCode(qrData) {
    showLoading(true);
    
    try {
        let ticketData;
        try {
            ticketData = JSON.parse(qrData);
        } catch (e) {
            ticketData = { ticketId: qrData };
        }
        
        const ticketId = ticketData.ticketId || ticketData.ticket_id || qrData;
        await verifyTicket(ticketId);
        
    } catch (error) {
        console.error('QR processing error:', error);
        showTicketResult('error', 'Invalid QR Code', 'Could not read ticket data');
    } finally {
        showLoading(false);
    }
}

// ✅ FIXED: Verify ticket with proper error handling
async function verifyTicket(ticketId) {
    const token = getAuthToken();
    if (!token) {
        redirectToLogin();
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/scan/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ ticketId, festId })
        });

        const data = await response.json();
        console.log('Verify response:', data);

        // ✅ FIXED: Proper error handling
        if (!data.success || !data.valid) {
            const errorMsg = data.error || 'Invalid ticket';
            showTicketResult('error', 'Invalid Ticket', errorMsg);
            return;
        }
        
        // Valid ticket
        currentTicket = data.ticket;
        showTicketResult('success', 'Valid Ticket', 'Ready to check in', data.ticket);
        
        loadStats();
        loadRecentScans();
        
    } catch (error) {
        console.error('Verification error:', error);
        showTicketResult('error', 'Network Error', 'Could not verify ticket. Try again.');
    }
}

// Show ticket result
function showTicketResult(type, title, message, ticket = null) {
    const modal = document.getElementById('ticket-modal');
    
    document.getElementById('success-icon').classList.add('hidden');
    document.getElementById('error-icon').classList.add('hidden');
    document.getElementById('warning-icon').classList.add('hidden');
    
    if (type === 'success') {
        document.getElementById('success-icon').classList.remove('hidden');
    } else if (type === 'error') {
        document.getElementById('error-icon').classList.remove('hidden');
    } else {
        document.getElementById('warning-icon').classList.remove('hidden');
    }
    
    document.getElementById('result-title').textContent = title;
    document.getElementById('result-message').textContent = message;
    
    const resultDiv = document.getElementById('ticket-result');
    resultDiv.className = 'ticket-result ' + type;
    
    const detailsDiv = document.getElementById('ticket-details');
    const actionsDiv = document.getElementById('ticket-actions');
    const closeBtn = document.getElementById('close-modal-btn');
    
    if (ticket) {
        document.getElementById('detail-ticket-id').textContent = ticket.ticket_id || '-';
        document.getElementById('detail-name').textContent = ticket.attendee_name || 'Unknown';
        document.getElementById('detail-type').textContent = 'College Fest';
        document.getElementById('detail-date').textContent = ticket.scanned_at 
            ? new Date(ticket.scanned_at).toLocaleDateString() 
            : '-';
        
        const statusEl = document.getElementById('detail-status');
        if (type === 'success') {
            statusEl.textContent = 'Valid';
            statusEl.className = 'value status valid';
        } else {
            statusEl.textContent = 'Invalid';
            statusEl.className = 'value status invalid';
        }
        
        detailsDiv.classList.remove('hidden');
        
        if (type === 'success') {
            actionsDiv.classList.remove('hidden');
            closeBtn.classList.add('hidden');
        } else {
            actionsDiv.classList.add('hidden');
            closeBtn.classList.remove('hidden');
        }
    } else {
        detailsDiv.classList.add('hidden');
        actionsDiv.classList.add('hidden');
        closeBtn.classList.remove('hidden');
    }
    
    modal.classList.remove('hidden');
}

// Allow entry
async function allowEntry() {
    if (!currentTicket) return;
    
    showLoading(true);
    showLoading(false);
    closeTicketModal();
    showToast('Entry allowed for ' + (currentTicket.attendee_name || 'Guest'));
    resumeScanning();
}

// Deny entry
async function denyEntry() {
    if (!currentTicket) return;
    
    showLoading(true);
    const token = getAuthToken();
    
    try {
        await fetch(`${API_BASE_URL}/scan/log-denied`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                ticketId: currentTicket.ticket_id,
                festId: festId,
                attendeeName: currentTicket.attendee_name
            })
        });
    } catch (e) {
        console.error('Error logging denied:', e);
    }
    
    showLoading(false);
    closeTicketModal();
    showToast('Entry denied');
    resumeScanning();
}

// Close modal
function closeTicketModal() {
    document.getElementById('ticket-modal').classList.add('hidden');
    currentTicket = null;
    resumeScanning();
}

// Resume scanning
function resumeScanning() {
    if (!scanning) {
        scanning = true;
        scanInterval = setInterval(scanQRCode, 200);
    }
}

// Toggle manual entry
function toggleManualEntry() {
    const modal = document.getElementById('manual-modal');
    modal.classList.toggle('hidden');
    
    if (!modal.classList.contains('hidden')) {
        document.getElementById('manual-ticket-input').focus();
    }
}

// Verify manual ticket
async function verifyManualTicket() {
    const input = document.getElementById('manual-ticket-input');
    const ticketId = input.value.trim();
    
    if (!ticketId) {
        showToast('Please enter ticket number');
        return;
    }
    
    toggleManualEntry();
    await verifyTicket(ticketId);
    input.value = '';
}

// Toggle flashlight
async function toggleFlashlight() {
    const btn = document.getElementById('flashlight-btn');
    
    try {
        const stream = video.srcObject;
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        
        if (capabilities.torch) {
            const torch = !btn.classList.contains('active');
            await track.applyConstraints({ advanced: [{ torch }] });
            btn.classList.toggle('active', torch);
        } else {
            showToast('Flashlight not supported');
        }
    } catch (error) {
        console.error('Flashlight error:', error);
        showToast('Could not toggle flashlight');
    }
}

// Show/hide loading
function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (show) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

// Show toast
function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: #1a1a2e;
            color: white;
            padding: 12px 24px;
            border-radius: 12px;
            border: 1px solid #7c3aed;
            z-index: 3000;
            font-size: 14px;
            opacity: 0;
            transition: opacity 0.3s;
        `;
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.style.opacity = '1';
    
    setTimeout(() => {
        toast.style.opacity = '0';
    }, 3000);
}

// Handle Enter key
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !document.getElementById('manual-modal').classList.contains('hidden')) {
        verifyManualTicket();
    }
});