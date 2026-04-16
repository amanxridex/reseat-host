// ============================================
// CONFIGURATION
// ============================================
const API_URL = "https://nexus-host-backend.onrender.com/api";

// ============================================
// STATE MANAGEMENT
// ============================================
let formState = {
    bannerImage: null,
    isPaid: true,
    currentHost: null
};

// ============================================
// INITIALIZATION
// ============================================
async function initFestApp() {
    const hasSession = await checkAuth();
    if (!hasSession) return;
    
    await loadDraftFromServer();
}

setupEventListeners();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFestApp);
} else {
    initFestApp();
}

// ============================================
// AUTHENTICATION
// ============================================
async function checkAuth() {
    try {
        const res = await fetch(`${API_URL}/auth/check`, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!res.ok) throw new Error('No session');
        const data = await res.json();
        if (!data.exists) throw new Error('Host not found');
        
        const profileRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!profileRes.ok) throw new Error('Failed to load profile');
        const profileData = await profileRes.json();
        formState.currentHost = profileData.data;
        return true;
    } catch (error) {
        window.location.href = 'host-signup-login.html?redirect=create-college-fest.html';
        return false;
    }
}

// ============================================
// DYNAMIC UI LOGIC
// ============================================

// Add Sub-events row
function addEventRow() {
    const container = document.getElementById('eventsContainer');
    const row = document.createElement('div');
    row.className = 'dynamic-event-row';
    row.innerHTML = `
        <input type="text" class="input-field evt-name" placeholder="Event Name">
        <input type="time" class="input-field evt-time">
        <input type="number" class="input-field evt-prize" placeholder="Prize (₹)">
        <select class="input-field evt-type">
            <option value="Free">Free</option>
            <option value="Paid">Paid</option>
        </select>
        <button type="button" class="btn-remove-event" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(row);
}

// Date-based Timeline Generator
function generateTimeline() {
    const startObj = document.getElementById('startDate').value;
    const endObj = document.getElementById('endDate').value;
    const container = document.getElementById('timelineContainer');
    
    if (!startObj || !endObj) return;

    let start = new Date(startObj);
    let end = new Date(endObj);
    
    if (end < start) {
        showToast("End date must be after start date", "error");
        return;
    }

    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both borders

    container.innerHTML = '';
    
    // limit to 7 days for sane UI
    if (diffDays > 7) {
        container.innerHTML = '<div style="color:var(--fin-danger);">Fest too long. Max 7 days supported.</div>';
        return;
    }

    for (let i = 1; i <= diffDays; i++) {
        let currentDate = new Date(start);
        currentDate.setDate(start.getDate() + (i-1));
        let dateStr = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        const div = document.createElement('div');
        div.className = 'timeline-day';
        div.innerHTML = `
            <div class="timeline-day-label">Day ${i}<br><small style="font-weight:normal; font-size:0.75rem;">${dateStr}</small></div>
            <input type="text" class="input-field timeline-input" style="flex:1;" placeholder="e.g. Opening Ceremony + Main Concert" data-day="Day ${i}">
        `;
        container.appendChild(div);
    }
}

// ID Field Toggle
function toggleIDFields(val) {
    const container = document.getElementById('idFieldsContainer');
    container.style.display = (val === 'Yes') ? 'block' : 'none';
}

// Paid/Free logic
function toggleTicketLogic() {
    const isPaid = document.getElementById('et-paid').checked || document.getElementById('et-pass').checked;
    const sec = document.getElementById('paidTicketSection');
    sec.style.display = isPaid ? 'block' : 'none';
    formState.isPaid = isPaid;
}

// AI Generator
function generateAIDescription() {
    const name = document.getElementById('festName').value || 'The Festival';
    const tagline = document.getElementById('tagline').value || 'An amazing experience';
    const vibe = document.querySelector('input[name="coreVibe"]:checked')?.value || 'Energetic';
    const attendance = document.getElementById('attendanceSlider').value;
    const type = document.querySelector('input[name="typeTags"]:checked')?.value || 'College';
    
    const pitch = `Join ${attendance}+ students for ${name} — ${tagline}! 🔥 Expect a massive ${vibe.toLowerCase()} vibe spanning incredible ${type.toLowerCase()} events, heart-pounding moments, and a lifetime of memories. Built for the culture, driven by passion. Secure your spot before passes sell out!`;
    
    document.getElementById('description').value = pitch;
    showToast("AI Generated Fest Pitch", "success");
}

// Upload Banner
function handleBannerUpload(input) {
    const file = input.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        showToast('File size must be less than 5MB', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        formState.bannerImage = e.target.result;
        document.getElementById('bannerPlaceholder').src = e.target.result;
        document.getElementById('bannerPlaceholder').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

// Live Preview card
function buildLivePreview() {
    const form = document.getElementById('festForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const handle = document.getElementById('instaHandle').value || '@collegefest';
    document.getElementById('prevInsta').innerText = handle;
    
    if(formState.bannerImage) {
        document.getElementById('prevImg').src = formState.bannerImage;
    }
    
    document.getElementById('prevName').innerText = document.getElementById('festName').value || 'Fest Name';
    document.getElementById('prevTagline').innerText = document.getElementById('tagline').value || 'Tagline';
    
    const highlights = Array.from(document.querySelectorAll('input[name="highlights"]:checked')).map(cb => cb.value).join(' • ');
    document.getElementById('prevHighlights').innerText = highlights || 'Various Events';

    const isPaid = document.getElementById('et-paid').checked || document.getElementById('et-pass').checked;
    if(isPaid) {
        const p = document.getElementById('earlyP').value || document.getElementById('ticketPrice').value;
        document.getElementById('prevTicket').innerText = `Tickets from ₹${p} | Register Now`;
    } else {
        document.getElementById('prevTicket').innerText = `FREE ENTRY | Claim Pass`;
    }

    document.getElementById('previewModal').classList.add('active');
}

// ============================================
// DRAFT & DATA COLLECTION
// ============================================
let draftSaveTimeout;
function autoSaveDraft() {
    clearTimeout(draftSaveTimeout);
    draftSaveTimeout = setTimeout(() => saveDraft(true), 2000);
}

async function saveDraft(silent = false) {
    try {
        const formData = collectFormData();
        const response = await fetch(`${API_URL}/fest/draft`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        if (!silent) showToast('Draft saved successfully!');
    } catch (error) {
        if (!silent) showToast('Saved locally', 'warning');
    }
}

async function loadDraftFromServer() {}

function collectFormData() {
    // Array properties
    const typeTags = Array.from(document.querySelectorAll('input[name="typeTags"]:checked')).map(cb => cb.value);
    const highlights = Array.from(document.querySelectorAll('input[name="highlights"]:checked')).map(cb => cb.value);
    const idFields = document.getElementById('requireID').value === 'Yes' ? 
        Array.from(document.querySelectorAll('input[name="idFields"]:checked')).map(cb => cb.value) : [];
    const facilities = Array.from(document.querySelectorAll('input[name="facilities"]:checked')).map(cb => cb.value);
    const bestFor = Array.from(document.querySelectorAll('input[name="bestFor"]:checked')).map(cb => cb.value);

    // Dynamic Events extraction
    const dynamicEvents = [];
    document.querySelectorAll('.dynamic-event-row').forEach(row => {
        const name = row.querySelector('.evt-name').value;
        const time = row.querySelector('.evt-time').value;
        const prize = row.querySelector('.evt-prize').value;
        const type = row.querySelector('.evt-type').value;
        if(name) {
            dynamicEvents.push({ name, time, prize, type });
        }
    });

    // Timeline extraction
    const timeline = [];
    document.querySelectorAll('.timeline-input').forEach(inp => {
        timeline.push({ day: inp.getAttribute('data-day'), description: inp.value });
    });

    // Check pricing mode
    const isPaid = document.getElementById('et-paid')?.checked || document.getElementById('et-pass')?.checked || false;

    const data = {
        festType: 'college',
        festName: document.getElementById('festName').value,
        description: document.getElementById('description').value,
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value,
        venue: document.getElementById('venueName').value + ', ' + document.getElementById('venue').value,
        expectedAttendance: parseInt(document.getElementById('attendanceSlider').value),
        
        coordinatorName: document.getElementById('coordinatorName').value,
        contactPhone: document.getElementById('contactPhone').value,
        contactEmail: document.getElementById('contactEmail').value,
        
        isPaid: isPaid,
        
        metadata: {
            tagline: document.getElementById('tagline').value,
            typeTags: typeTags,
            coreVibe: document.querySelector('input[name="coreVibe"]:checked')?.value || '',
            highlights: highlights,
            dynamicEvents: dynamicEvents,
            
            audienceRules: document.querySelector('input[name="audience"]:checked')?.value || '',
            outstation: document.getElementById('outstation').value,
            idVerificationRequired: document.getElementById('requireID').value === 'Yes',
            idFields: idFields,
            
            timelinePlan: timeline,
            
            venueDetails: {
                name: document.getElementById('venueName').value,
                location: document.getElementById('venue').value,
                type: document.querySelector('input[name="venueType"]:checked')?.value || '',
                facilities: facilities
            },
            
            pricingStrategy: {
                entryType: document.querySelector('input[name="entryType"]:checked')?.value || '',
                pricingModel: isPaid ? (document.querySelector('input[name="pricingType"]:checked')?.value || 'Fixed') : 'Free',
                ticketPrice: document.getElementById('ticketPrice').value,
                earlyBird: document.getElementById('earlyP').value,
                totalSeats: document.getElementById('totalSeats').value
            },
            
            media: {
                bannerImage: formState.bannerImage,
                promoVideo: document.getElementById('promoVideo').value,
                instagram: document.getElementById('instaHandle').value
            },
            
            social: {
                bestFor: bestFor,
                groupReg: document.getElementById('groupReg').value,
                whatsapp: document.getElementById('contactWhatsApp').value
            }
        }
    };

    return data;
}

// ============================================
// SUBMIT FEST 
// ============================================
async function submitFest(e) {
    e.preventDefault();
    
    const btn = document.getElementById('submitBtn');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    btn.disabled = true;

    try {
        const festData = collectFormData();

        const response = await fetch(`${API_URL}/fest/create`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(festData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to create college fest');
        }

        document.getElementById('successModal').classList.add('active');

    } catch (error) {
        showToast(error.message || 'Failed to submit fest. Please try again.', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// ============================================
// UTILITIES
// ============================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    if (type === 'error') toast.style.borderColor = '#ef4444';
    else if (type === 'warning') toast.style.borderColor = '#f59e0b';
    else toast.style.borderColor = 'var(--accent-purple)';
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function setupEventListeners() {
    document.querySelectorAll('.input-field, .vibe-radio, .vibe-checkbox, input[type="range"]').forEach(field => {
        field.addEventListener('change', () => autoSaveDraft());
    });
}
