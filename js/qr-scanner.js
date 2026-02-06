// js/qr-scanner.js

// Global State
let currentStream = null;
let isScanning = true;
let currentFest = null;
let scannedTickets = new Set();
let recentScans = [];
let isFlashlightOn = false;
let scanInterval = null;

// Mock Data for Demo (Replace with API calls)
const mockTickets = {
    'NX-2024-001234': {
        id: 'NX-2024-001234',
        name: 'Rahul Sharma',
        type: 'VIP',
        date: '2024-02-07',
        status: 'valid',
        used: false
    },
    'NX-2024-001235': {
        id: 'NX-2024-001235',
        name: 'Priya Patel',
        type: 'General',
        date: '2024-02-06',
        status: 'valid',
        used: true,
        usedAt: '2024-02-07 14:30'
    },
    'NX-2024-001236': {
        id: 'NX-2024-001236',
        name: 'Amit Kumar',
        type: 'Early Bird',
        date: '2024-02-05',
        status: 'valid',
        used: false
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    loadFestData();
    initCamera();
    loadStats();
    checkOnlineStatus();
    
    // Check online status periodically
    setInterval(checkOnlineStatus, 5000);
    
    // Setup input enter key
    document.getElementById('manual-ticket-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') verifyManualTicket();
    });
}

// Load Fest Data from Session Storage
function loadFestData() {
    const festData = sessionStorage.getItem('nexus_scan_fest') || sessionStorage.getItem('nexus_current_fest');
    
    if (festData) {
        try {
            currentFest = JSON.parse(festData);
            document.getElementById('fest-name').textContent = currentFest.name || 'Unnamed Fest';
        } catch (e) {
            console.error('Error parsing fest data:', e);
            document.getElementById('fest-name').textContent = 'Tech Fest 2024';
        }
    } else {
        document.getElementById('fest-name').textContent = 'Tech Fest 2024';
        currentFest = {
            id: 'fest-001',
            name: 'Tech Fest 2024',
            totalTickets: 500,
            checkedIn: 0
        };
    }
}

// Camera Initialization
async function initCamera() {
    const video = document.getElementById('camera-feed');
    const canvas = document.getElementById('camera-canvas');
    const errorDiv = document.getElementById('camera-error');
    
    try {
        // Stop existing stream
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }
        
        // Get camera access
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment',
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        });
        
        currentStream = stream;
        video.srcObject = stream;
        
        video.onloadedmetadata = () => {
            video.play();
            errorDiv.classList.add('hidden');
            startQRScanning();
        };
        
    } catch (err) {
        console.error('Camera error:', err);
        errorDiv.classList.remove('hidden');
        showNotification('Camera access denied. Use manual entry.', 'error');
    }
}

// QR Code Scanning Loop
function startQRScanning() {
    const video = document.getElementById('camera-feed');
    const canvas = document.getElementById('camera-canvas');
    const ctx = canvas.getContext('2d');
    
    if (scanInterval) clearInterval(scanInterval);
    
    scanInterval = setInterval(() => {
        if (!isScanning || video.paused || video.ended) return;
        
        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Decode QR
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth'
        });
        
        if (code && code.data) {
            handleQRCode(code.data);
        }
    }, 200); // Scan every 200ms
}

// Handle Scanned QR Code
function handleQRCode(data) {
    // Prevent duplicate scans within 3 seconds
    if (scannedTickets.has(data)) return;
    
    scannedTickets.add(data);
    setTimeout(() => scannedTickets.delete(data), 3000);
    
    // Pause scanning
    isScanning = false;
    
    // Verify ticket
    verifyTicket(data);
}

// Verify Ticket (API or Local)
async function verifyTicket(ticketId) {
    showLoading(true);
    
    try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Check if offline
        const isOffline = !navigator.onLine;
        
        // Get ticket data (from API or cache)
        const ticket = await getTicketData(ticketId, isOffline);
        
        showLoading(false);
        
        if (ticket) {
            showTicketModal(ticket);
        } else {
            showTicketModal({
                id: ticketId,
                status: 'invalid',
                name: 'Unknown',
                type: 'N/A',
                date: 'N/A',
                error: 'Ticket not found'
            });
        }
        
    } catch (error) {
        showLoading(false);
        showNotification('Verification failed. Try again.', 'error');
        isScanning = true;
    }
}

// Get Ticket Data
async function getTicketData(ticketId, isOffline) {
    // In real app, fetch from API or IndexedDB cache
    // For demo, use mock data
    
    const ticket = mockTickets[ticketId];
    
    if (ticket) {
        return { ...ticket };
    }
    
    // If not in mock data, create invalid ticket
    return null;
}

// Show Ticket Modal
function showTicketModal(ticket) {
    const modal = document.getElementById('ticket-modal');
    const resultDiv = document.getElementById('ticket-result');
    const actionsDiv = document.getElementById('ticket-actions');
    const closeBtn = document.getElementById('close-modal-btn');
    
    // Reset classes
    resultDiv.className = 'ticket-result';
    
    // Set content
    document.getElementById('detail-ticket-id').textContent = ticket.id;
    document.getElementById('detail-name').textContent = ticket.name;
    document.getElementById('detail-type').textContent = ticket.type;
    document.getElementById('detail-date').textContent = ticket.date;
    
    const statusEl = document.getElementById('detail-status');
    const successIcon = document.getElementById('success-icon');
    const errorIcon = document.getElementById('error-icon');
    const warningIcon = document.getElementById('warning-icon');
    
    // Hide all icons
    successIcon.classList.add('hidden');
    errorIcon.classList.add('hidden');
    warningIcon.classList.add('hidden');
    
    // Determine state
    if (ticket.status === 'invalid' || !ticket.status) {
        // Invalid ticket
        resultDiv.classList.add('error');
        document.getElementById('result-title').textContent = 'Invalid Ticket';
        document.getElementById('result-message').textContent = ticket.error || 'This ticket is not recognized';
        errorIcon.classList.remove('hidden');
        statusEl.textContent = 'INVALID';
        statusEl.className = 'value status invalid';
        actionsDiv.classList.add('hidden');
        closeBtn.classList.remove('hidden');
        
    } else if (ticket.used) {
        // Already used
        resultDiv.classList.add('warning');
        document.getElementById('result-title').textContent = 'Already Checked In';
        document.getElementById('result-message').textContent = `Used at ${ticket.usedAt || 'earlier today'}`;
        warningIcon.classList.remove('hidden');
        statusEl.textContent = 'USED';
        statusEl.className = 'value status used';
        actionsDiv.classList.add('hidden');
        closeBtn.classList.remove('hidden');
        
    } else {
        // Valid ticket
        resultDiv.classList.add('success');
        document.getElementById('result-title').textContent = 'Valid Ticket';
        document.getElementById('result-message').textContent = 'Ready to check in';
        successIcon.classList.remove('hidden');
        statusEl.textContent = 'VALID';
        statusEl.className = 'value status valid';
        actionsDiv.classList.remove('hidden');
        closeBtn.classList.add('hidden');
        
        // Store current ticket for actions
        modal.dataset.currentTicket = JSON.stringify(ticket);
    }
    
    modal.classList.remove('hidden');
}

// Close Ticket Modal
function closeTicketModal() {
    document.getElementById('ticket-modal').classList.add('hidden');
    isScanning = true;
}

// Allow Entry
function allowEntry() {
    const modal = document.getElementById('ticket-modal');
    const ticketData = modal.dataset.currentTicket;
    
    if (!ticketData) return;
    
    const ticket = JSON.parse(ticketData);
    
    // Update ticket status
    ticket.used = true;
    ticket.usedAt = new Date().toLocaleString();
    mockTickets[ticket.id] = ticket; // Update mock data
    
    // Add to recent scans
    addToRecentScans(ticket, 'allowed');
    
    // Update stats
    updateStats(1);
    
    // Close modal and resume scanning
    closeTicketModal();
    
    // Show success notification
    showNotification(`✓ ${ticket.name} checked in successfully`, 'success');
}

// Deny Entry
function denyEntry() {
    const modal = document.getElementById('ticket-modal');
    const ticketData = modal.dataset.currentTicket;
    
    if (!ticketData) return;
    
    const ticket = JSON.parse(ticketData);
    
    // Add to recent scans
    addToRecentScans(ticket, 'denied');
    
    closeTicketModal();
    showNotification(`✗ Entry denied for ${ticket.name}`, 'error');
}

// Manual Entry Toggle
function toggleManualEntry() {
    const modal = document.getElementById('manual-modal');
    const isHidden = modal.classList.contains('hidden');
    
    if (isHidden) {
        modal.classList.remove('hidden');
        isScanning = false;
        setTimeout(() => document.getElementById('manual-ticket-input').focus(), 100);
    } else {
        modal.classList.add('hidden');
        isScanning = true;
        document.getElementById('manual-ticket-input').value = '';
    }
}

// Verify Manual Ticket
function verifyManualTicket() {
    const input = document.getElementById('manual-ticket-input');
    const ticketId = input.value.trim().toUpperCase();
    
    if (!ticketId) {
        showNotification('Please enter a ticket number', 'error');
        return;
    }
    
    toggleManualEntry();
    verifyTicket(ticketId);
}

// Flashlight Toggle
async function toggleFlashlight() {
    const btn = document.getElementById('flashlight-btn');
    
    if (!currentStream) return;
    
    try {
        const track = currentStream.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        
        if (!capabilities.torch) {
            showNotification('Flashlight not supported on this device', 'error');
            return;
        }
        
        isFlashlightOn = !isFlashlightOn;
        await track.applyConstraints({
            advanced: [{ torch: isFlashlightOn }]
        });
        
        btn.classList.toggle('active', isFlashlightOn);
        
    } catch (err) {
        console.error('Flashlight error:', err);
        showNotification('Unable to toggle flashlight', 'error');
    }
}

// Add to Recent Scans
function addToRecentScans(ticket, status) {
    const scan = {
        ticket: ticket,
        status: status,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    recentScans.unshift(scan);
    if (recentScans.length > 5) recentScans.pop();
    
    renderRecentScans();
}

// Render Recent Scans
function renderRecentScans() {
    const container = document.getElementById('scans-list');
    
    if (recentScans.length === 0) {
        container.innerHTML = '<p class="no-scans">No tickets scanned yet</p>';
        return;
    }
    
    container.innerHTML = recentScans.map(scan => `
        <div class="scan-item">
            <div class="scan-info">
                <div class="scan-avatar">${scan.ticket.name.charAt(0)}</div>
                <div class="scan-details">
                    <h4>${scan.ticket.name}</h4>
                    <p>${scan.ticket.id} • ${scan.time}</p>
                </div>
            </div>
            <span class="scan-status ${scan.status}">${scan.status}</span>
        </div>
    `).join('');
}

// Update Statistics
function updateStats(increment) {
    if (!currentFest) return;
    
    currentFest.checkedIn = (currentFest.checkedIn || 0) + increment;
    
    // Save to session
    sessionStorage.setItem('nexus_scan_fest', JSON.stringify(currentFest));
    
    renderStats();
}

// Load Stats
function loadStats() {
    renderStats();
}

// Render Stats
function renderStats() {
    const checkedIn = currentFest?.checkedIn || 0;
    const total = currentFest?.totalTickets || 500;
    const remaining = total - checkedIn;
    
    document.getElementById('scanned-count').textContent = checkedIn;
    document.getElementById('remaining-count').textContent = remaining;
    document.getElementById('total-count').textContent = total;
}

// Check Online Status
function checkOnlineStatus() {
    const indicator = document.getElementById('offline-indicator');
    const isOffline = !navigator.onLine;
    
    if (isOffline) {
        indicator.classList.remove('hidden');
    } else {
        indicator.classList.add('hidden');
        // Sync offline data if needed
        syncOfflineData();
    }
}

// Sync Offline Data (Placeholder)
async function syncOfflineData() {
    // In real app, sync scanned tickets with server
    console.log('Syncing offline data...');
}

// Show/Hide Loading
function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (show) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

// Notification System
function showNotification(message, type = 'info') {
    // Create notification element
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%) translateY(-20px);
        background: ${type === 'success' ? 'rgba(16, 185, 129, 0.9)' : type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(139, 92, 246, 0.9)'};
        color: white;
        padding: 12px 24px;
        border-radius: 12px;
        font-weight: 600;
        z-index: 3000;
        opacity: 0;
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.2);
    `;
    notif.textContent = message;
    document.body.appendChild(notif);
    
    // Animate in
    requestAnimationFrame(() => {
        notif.style.opacity = '1';
        notif.style.transform = 'translateX(-50%) translateY(0)';
    });
    
    // Remove after 3 seconds
    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transform = 'translateX(-50%) translateY(-20px)';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

// Handle Visibility Change (Pause/Resume Camera)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        isScanning = false;
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.enabled = false);
        }
    } else {
        isScanning = true;
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.enabled = true);
        }
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }
    if (scanInterval) clearInterval(scanInterval);
});