// qr-scanner.js - Complete Functional QR Scanner

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
    
    // Load fest details
    loadFestDetails();
    
    // Load stats
    loadStats();
    
    // Load recent scans
    loadRecentScans();
    
    // Initialize camera
    initCamera();
});

// Get Firebase token from host auth
function getAuthToken() {
    try {
        // Your token is stored as 'nexus_token'
        return localStorage.getItem('nexus_token');
    } catch (e) {
        console.error('Error getting auth:', e);
    }
    return null;
}

// Redirect to correct login page
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
            headers: {
                'Authorization': `Bearer ${token}`
            }
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
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (data.success) {
            const validScans = data.scans?.valid || 0;
            const total = data.fest?.capacity || 0; // You may need to add capacity to fests table
            
            document.getElementById('scanned-count').textContent = validScans;
            document.getElementById('total-count').textContent = total;
            document.getElementById('remaining-count').textContent = Math.max(0, total - validScans);
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
            headers: {
                'Authorization': `Bearer ${token}`
            }
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
async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });
        
        video.srcObject = stream;
        video.play();
        
        scanning = true;
        document.getElementById('camera-error').classList.add('hidden');
        
        // Start scanning loop
        scanInterval = setInterval(scanQRCode, 200);
        
    } catch (error) {
        console.error('Camera error:', error);
        document.getElementById('camera-error').classList.remove('hidden');
        scanning = false;
    }
}

// Scan QR code from video frame
function scanQRCode() {
    if (!scanning || video.readyState !== video.HAVE_ENOUGH_DATA) return;
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    canvasContext.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get image data
    const imageData = canvasContext.getImageData(0, 0, canvas.width, canvas.height);
    
    // Try to decode QR
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
    });
    
    if (code) {
        // QR found - stop scanning temporarily
        scanning = false;
        clearInterval(scanInterval);
        
        // Process the QR data
        handleQRCode(code.data);
    }
}

// Handle scanned QR code
async function handleQRCode(qrData) {
    showLoading(true);
    
    try {
        // Parse QR data
        let ticketData;
        try {
            ticketData = JSON.parse(qrData);
        } catch (e) {
            // If not JSON, treat as plain ticket ID
            ticketData = { ticketId: qrData };
        }
        
        const ticketId = ticketData.ticketId || ticketData.ticket_id || qrData;
        
        // Verify ticket with backend
        await verifyTicket(ticketId);
        
    } catch (error) {
        console.error('QR processing error:', error);
        showTicketResult('error', 'Invalid QR Code', 'Could not read ticket data');
    } finally {
        showLoading(false);
    }
}

// Verify ticket with backend
// Verify ticket with backend (with retry)
async function verifyTicket(ticketId, retryCount = 0) {
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
            body: JSON.stringify({
                ticketId: ticketId,
                festId: festId
            })
        });

        // If rate limited, retry after delay
        if (response.status === 429 && retryCount < 3) {
            showToast('Too many scans, retrying...');
            await new Promise(r => setTimeout(r, 2000));
            return verifyTicket(ticketId, retryCount + 1);
        }

        const data = await response.json();
        
        if (data.success) {
            currentTicket = data.ticket;
            
            if (data.valid) {
                showTicketResult('success', 'Valid Ticket', 'Ready to check in', data.ticket);
            } else {
                showTicketResult('warning', 'Already Used', 'This ticket was already scanned', data.ticket);
            }
        } else {
            showTicketResult('error', 'Error', data.error || 'Verification failed');
        }
        
        loadStats();
        loadRecentScans();
        
    } catch (error) {
        console.error('Verification error:', error);
        showTicketResult('error', 'Network Error', 'Could not verify ticket. Try again.');
    }
}

// Show ticket verification result modal
function showTicketResult(type, title, message, ticket = null) {
    const modal = document.getElementById('ticket-modal');
    
    // Hide all icons first
    document.getElementById('success-icon').classList.add('hidden');
    document.getElementById('error-icon').classList.add('hidden');
    document.getElementById('warning-icon').classList.add('hidden');
    
    // Show appropriate icon
    if (type === 'success') {
        document.getElementById('success-icon').classList.remove('hidden');
    } else if (type === 'error') {
        document.getElementById('error-icon').classList.remove('hidden');
    } else {
        document.getElementById('warning-icon').classList.remove('hidden');
    }
    
    // Set text
    document.getElementById('result-title').textContent = title;
    document.getElementById('result-message').textContent = message;
    
    // Set result styling
    const resultDiv = document.getElementById('ticket-result');
    resultDiv.className = 'ticket-result ' + type;
    
    // Show/hide ticket details
    const detailsDiv = document.getElementById('ticket-details');
    const actionsDiv = document.getElementById('ticket-actions');
    const closeBtn = document.getElementById('close-modal-btn');
    
    if (ticket) {
        // Show details
        document.getElementById('detail-ticket-id').textContent = ticket.ticket_id || '-';
        document.getElementById('detail-name').textContent = ticket.attendee_name || 'Unknown';
        document.getElementById('detail-type').textContent = 'College Fest';
        document.getElementById('detail-date').textContent = ticket.created_at 
            ? new Date(ticket.created_at).toLocaleDateString() 
            : '-';
        
        const statusEl = document.getElementById('detail-status');
        if (type === 'success') {
            statusEl.textContent = 'Valid';
            statusEl.className = 'value status valid';
        } else if (type === 'warning') {
            statusEl.textContent = 'Already Used';
            statusEl.className = 'value status used';
        } else {
            statusEl.textContent = 'Invalid';
            statusEl.className = 'value status invalid';
        }
        
        detailsDiv.classList.remove('hidden');
        
        if (type === 'success') {
            // Show allow/deny buttons for valid tickets
            actionsDiv.classList.remove('hidden');
            closeBtn.classList.add('hidden');
        } else {
            // Just close button for already used/invalid
            actionsDiv.classList.add('hidden');
            closeBtn.classList.remove('hidden');
        }
    } else {
        // No ticket data - error state
        detailsDiv.classList.add('hidden');
        actionsDiv.classList.add('hidden');
        closeBtn.classList.remove('hidden');
    }
    
    // Show modal
    modal.classList.remove('hidden');
}

// Allow entry
async function allowEntry() {
    if (!currentTicket) return;
    
    showLoading(true);
    
    // Log as allowed (already marked used by backend, just update UI)
    showLoading(false);
    closeTicketModal();
    
    // Show success toast
    showToast('Entry allowed for ' + (currentTicket.attendee_name || 'Guest'));
    
    // Resume scanning
    resumeScanning();
}

// Deny entry
async function denyEntry() {
    if (!currentTicket) return;
    
    showLoading(true);
    
    const token = getAuthToken();
    
    try {
        // Log denied entry
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
    
    // Resume scanning
    resumeScanning();
}

// Close ticket modal
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

// Toggle manual entry modal
function toggleManualEntry() {
    const modal = document.getElementById('manual-modal');
    modal.classList.toggle('hidden');
    
    if (!modal.classList.contains('hidden')) {
        document.getElementById('manual-ticket-input').focus();
    }
}

// Verify manual ticket entry
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

// Toggle flashlight (if supported)
async function toggleFlashlight() {
    const btn = document.getElementById('flashlight-btn');
    
    try {
        const stream = video.srcObject;
        const track = stream.getVideoTracks()[0];
        
        // Check if torch is supported
        const capabilities = track.getCapabilities();
        
        if (capabilities.torch) {
            const torch = !btn.classList.contains('active');
            await track.applyConstraints({
                advanced: [{ torch }]
            });
            btn.classList.toggle('active', torch);
        } else {
            showToast('Flashlight not supported on this device');
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

// Show toast message
function showToast(message) {
    // Create toast if not exists
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--bg-card);
            color: white;
            padding: 12px 24px;
            border-radius: 12px;
            border: 1px solid var(--accent-purple);
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

// Redirect to login
function redirectToLogin() {
    window.location.href = 'host-signup-login.html';
}

// Handle Enter key in manual input
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !document.getElementById('manual-modal').classList.contains('hidden')) {
        verifyManualTicket();
    }
});