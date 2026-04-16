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
        window.location.href = 'host-signup-login.html?redirect=create-concert.html';
        return false;
    }
}

// ============================================
// DYNAMIC UI LOGIC
// ============================================

// Crowd Energy Slider text
function updateEnergyLabel(value) {
    const texts = ['😌 Chill Vibes', '😎 Groove', '🔥 High Energy', '🔥🔥🔥 Wild', '🔥🔥🔥🔥🔥 Absolute Riot'];
    document.getElementById('energyVal').innerText = texts[value - 1];
}

// Add Support Artist row
function addSupportArtist() {
    const container = document.getElementById('lineupContainer');
    const row = document.createElement('div');
    row.className = 'dynamic-event-row';
    row.innerHTML = `
        <input type="text" class="input-field support-name" placeholder="Artist Name">
        <input type="time" class="input-field support-time" placeholder="Set Time">
        <button type="button" class="btn-remove-row" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(row);
}

// Add Ticket Tier row
function addTicketTier() {
    const container = document.getElementById('ticketContainer');
    const row = document.createElement('div');
    row.className = 'ticket-tier-row';
    row.innerHTML = `
        <input type="text" class="input-field tier-name" placeholder="Phase Name (e.g. Backstage)">
        <input type="number" class="input-field tier-price" placeholder="Price (₹)">
        <input type="number" class="input-field tier-qty" placeholder="Cap (e.g. 50)">
        <button type="button" class="btn-remove-row" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(row);
}

// Paid/Free logic
function toggleTicketLogic() {
    const entryType = document.querySelector('input[name="entryType"]:checked')?.value;
    const isPaid = entryType === 'Paid';
    const sec = document.getElementById('paidTicketSection');
    sec.style.display = isPaid ? 'block' : 'none';
    formState.isPaid = isPaid;
}

// AI Generator
function generateAIDescription() {
    const name = document.getElementById('festName').value || 'The Concert';
    const artist = document.getElementById('mainArtist').value || 'surprise artists';
    const vibe = document.querySelector('input[name="concertVibe"]:checked')?.value || 'Hardcore Party';
    
    // Support acts
    let support = [];
    document.querySelectorAll('.support-name').forEach(inp => { if(inp.value) support.push(inp.value); });
    const lineupStr = support.length > 0 ? ` alongside ${support.join(', ')}` : '';
    
    const pitch = `Get ready for an electrifying night with heart-thumping beats as ${artist} takes the stage${lineupStr}. Brace yourself for a massive ${vibe.toLowerCase()} experience filled with unmatched crowd energy and unforgettable sounds. Feel the night before you enter it.`;
    
    document.getElementById('description').value = pitch;
    showToast("AI Generated Sick Hype. You're ready.", "success");
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

// Live Neon Preview card
function buildLivePreview() {
    const form = document.getElementById('festForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    if(formState.bannerImage) {
        document.getElementById('prevImg').src = formState.bannerImage;
    }
    
    document.getElementById('prevName').innerText = document.getElementById('festName').value || 'Concert Name';
    document.getElementById('prevTagline').innerText = document.getElementById('tagline').value || 'The tagline goes here';
    
    // Support acts
    let support = [];
    document.querySelectorAll('.support-name').forEach(inp => { if(inp.value) support.push(inp.value); });
    if(support.length > 0) {
        document.getElementById('prevLineup').innerText = `Supporting: ${support.join(' • ')}`;
        document.getElementById('prevLineup').style.display = 'block';
    } else {
        document.getElementById('prevLineup').style.display = 'none';
    }
    
    document.getElementById('prevVenue').innerText = `${document.getElementById('venueName').value || 'Venue'}, ${document.getElementById('venue').value || 'City'}`;
    
    let drop = document.getElementById('peakTime').value;
    if(drop) {
        document.getElementById('prevDrop').innerText = drop;
        document.getElementById('prevDrop').parentElement.parentElement.style.display = 'block';
    } else {
        document.getElementById('prevDrop').parentElement.parentElement.style.display = 'none';
    }

    const entryType = document.querySelector('input[name="entryType"]:checked')?.value;
    if(entryType === 'Paid') { 
        // Grab cheapest tier
        let minPrice = Infinity;
        document.querySelectorAll('.tier-price').forEach(inp => {
            if(inp.value && parseInt(inp.value) < minPrice) minPrice = parseInt(inp.value);
        });
        if(minPrice === Infinity) minPrice = 499;
        document.getElementById('prevTicket').innerText = `Tickets from ₹${minPrice}`;
    } else {
        document.getElementById('prevTicket').innerText = `FREE / Guestlist`;
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
    const genre = Array.from(document.querySelectorAll('input[name="genre"]:checked')).map(cb => cb.value);
    const addons = Array.from(document.querySelectorAll('input[name="addons"]:checked')).map(cb => cb.value);

    // Support Lineup extraction
    const lineup = [];
    document.querySelectorAll('#lineupContainer .dynamic-event-row').forEach(row => {
        const name = row.querySelector('.support-name').value;
        const time = row.querySelector('.support-time').value;
        if(name) {
            lineup.push({ name, time });
        }
    });

    // Ticket Tiers
    const tickets = [];
    if(formState.isPaid) {
        document.querySelectorAll('.ticket-tier-row').forEach(row => {
            const name = row.querySelector('.tier-name').value;
            const price = row.querySelector('.tier-price').value;
            const qty = row.querySelector('.tier-qty').value;
            if(name && price) {
                tickets.push({ name, price, qty });
            }
        });
    }

    const data = {
        festType: 'concert',
        festName: document.getElementById('festName').value,
        description: document.getElementById('description').value,
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('startDate').value, // default same day
        venue: document.getElementById('venueName').value + ', ' + document.getElementById('venue').value,
        expectedAttendance: parseInt(document.getElementById('capSlider').value) || 500,
        
        coordinatorName: document.getElementById('coordinatorName').value,
        contactPhone: document.getElementById('contactPhone').value,
        contactEmail: document.getElementById('contactEmail').value || 'not-provided@nexus.com',
        
        isPaid: formState.isPaid,
        
        metadata: {
            eventType: document.querySelector('input[name="eventTypeTags"]:checked')?.value || '',
            tagline: document.getElementById('tagline').value,
            
            lineup: {
                mainArtist: document.getElementById('mainArtist').value,
                artistInstagram: document.getElementById('artistInsta').value,
                genres: genre,
                supporting: lineup
            },
            
            vibe: {
                feel: document.querySelector('input[name="concertVibe"]:checked')?.value || '',
                energyLevel: document.getElementById('energySlider').value
            },
            
            venueDetails: {
                name: document.getElementById('venueName').value,
                location: document.getElementById('venue').value,
                type: document.querySelector('input[name="venueType"]:checked')?.value || '',
                capacity: document.getElementById('capSlider').value
            },
            
            timingPlan: {
                doorsOpen: document.getElementById('doorsArray').value,
                showStart: document.getElementById('showTime').value,
                peakDropTime: document.getElementById('peakTime').value,
                ends: document.getElementById('endTime').value
            },
            
            pricingStrategy: {
                entryType: document.querySelector('input[name="entryType"]:checked')?.value || '',
                ticketPhases: tickets
            },
            
            media: {
                bannerImage: formState.bannerImage,
                promoVideo: document.getElementById('promoVideo').value,
                musicPreview: document.getElementById('musicPreview').value
            },
            
            experience: {
                addons: addons,
                ageRestriction: document.getElementById('ageRes').value,
                coupleEntry: document.getElementById('coupleEntry').value,
                stagAllowed: document.getElementById('stagAllowed').value
            },
            
            social: {
                fomoBadge: document.getElementById('socialFOMO').value,
                dressCode: document.getElementById('dressCode').value
            }
        }
    };

    return data;
}

// ============================================
// SUBMIT
// ============================================
async function submitFest(e) {
    e.preventDefault();
    
    const btn = document.getElementById('submitBtn');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Dropping Beat...';
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
            throw new Error(result.error || 'Failed to launch concert experience');
        }

        document.getElementById('successModal').classList.add('active');

    } catch (error) {
        showToast(error.message || 'Failed to submit. Please try again.', 'error');
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
    else toast.style.borderColor = '#a855f7';
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function setupEventListeners() {
    document.querySelectorAll('.input-field, .vibe-radio, .vibe-checkbox, input[type="range"]').forEach(field => {
        field.addEventListener('change', () => autoSaveDraft());
    });
}
