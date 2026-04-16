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
        window.location.href = 'host-signup-login.html?redirect=create-restaurant-event.html';
        return false;
    }
}

// ============================================
// DYNAMIC UI LOGIC
// ============================================

// Add Sub-events row
function addSlotRow() {
    const container = document.getElementById('slotsContainer');
    const row = document.createElement('div');
    row.className = 'dynamic-event-row';
    row.innerHTML = `
        <input type="time" class="input-field slot-start" required>
        <input type="time" class="input-field slot-end" required>
        <button type="button" class="btn-remove-event" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(row);
}


// Paid/Free logic
function toggleTicketLogic() {
    const entryType = document.querySelector('input[name="entryType"]:checked')?.value;
    const isPaid = entryType === 'Cover charge' || entryType === 'Full package';
    const sec = document.getElementById('paidTicketSection');
    sec.style.display = isPaid ? 'block' : 'none';
    formState.isPaid = isPaid;
}

// AI Generator
function generateAIDescription() {
    const name = document.getElementById('festName').value || 'An exclusive night';
    const cuisine = Array.from(document.querySelectorAll('input[name="cuisineType"]:checked')).map(cb => cb.value).join(', ');
    const vibe = document.querySelector('input[name="ambienceType"]:checked')?.value || 'Luxury';
    const hook = document.getElementById('specialHook').value || 'curated by top chefs';
    
    const pitch = `Indulge in a spectacular ${vibe.toLowerCase()} evening at ${document.getElementById('venueName').value || 'our restaurant'}. Experience ${name}, a highly curated ${cuisine || 'multi-cuisine'} affair featuring ${hook}. Secure your table before slots run out!`;
    
    document.getElementById('description').value = pitch;
    showToast("AI Generated Food Experience Pitch", "success");
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

// Live Zomato Preview card
function buildLivePreview() {
    const form = document.getElementById('festForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    if(formState.bannerImage) {
        document.getElementById('prevImg').src = formState.bannerImage;
    }
    
    const typeLabel = document.querySelector('input[name="eventTypeTags"]:checked')?.value || 'Premium Dining';
    document.getElementById('prevBadge').innerText = typeLabel;

    document.getElementById('prevName').innerText = document.getElementById('festName').value || 'Restaurant Name';
    
    const loc = document.getElementById('venue').value || 'Location';
    const cuisine = Array.from(document.querySelectorAll('input[name="cuisineType"]:checked')).map(cb => cb.value).join(', ');
    document.getElementById('prevSubtitle').innerText = `${loc} • ${cuisine}`;
    
    const slots = document.querySelectorAll('.slot-start');
    if(slots.length > 0) {
        // Convert 24hr to human-ish
        document.getElementById('prevTime').innerText = `Slots from ${slots[0].value || '7:00'}`;
    }

    const entryType = document.querySelector('input[name="entryType"]:checked')?.value;
    if(entryType === 'Contact') { // Free
        document.getElementById('prevCost').innerText = 'Call to Book';
    } else {
        const p = document.getElementById('ticketPrice').value || 'Varies';
        document.getElementById('prevCost').innerText = `₹${p} for one`;
    }

    const m1 = document.getElementById('menuStarter').value;
    const m2 = document.getElementById('menuMain').value;
    const m3 = document.getElementById('menuDessert').value;
    
    let highlight = [];
    if(m1) highlight.push(m1);
    if(m2) highlight.push(m2);
    if(m3) highlight.push(m3);
    
    document.getElementById('prevMenu').innerText = highlight.length > 0 ? highlight.join(' • ') : 'View details to see menu';

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
    const cuisineType = Array.from(document.querySelectorAll('input[name="cuisineType"]:checked')).map(cb => cb.value);
    const highlights = Array.from(document.querySelectorAll('input[name="highlights"]:checked')).map(cb => cb.value);
    const ambienceType = Array.from(document.querySelectorAll('input[name="ambienceType"]:checked')).map(cb => cb.value);
    const addons = Array.from(document.querySelectorAll('input[name="addons"]:checked')).map(cb => cb.value);
    const bestFor = Array.from(document.querySelectorAll('input[name="bestFor"]:checked')).map(cb => cb.value);

    // Dynamic Slots extraction
    const dynamicSlots = [];
    document.querySelectorAll('.dynamic-event-row').forEach(row => {
        const start = row.querySelector('.slot-start').value;
        const end = row.querySelector('.slot-end').value;
        if(start && end) {
            dynamicSlots.push({ start, end });
        }
    });

    const isPaid = formState.isPaid;

    const data = {
        festType: 'restaurant',
        festName: document.getElementById('festName').value,
        description: document.getElementById('description').value,
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('startDate').value, // usually single day for resty events
        venue: document.getElementById('venueName').value + ', ' + document.getElementById('venue').value,
        
        // Restaurants don't typically have "attendance" caps like fests, but we need the field for backend. We'll map total tables/seats to this if needed later.
        expectedAttendance: 100, 
        
        coordinatorName: document.getElementById('coordinatorName').value,
        contactPhone: document.getElementById('contactPhone').value,
        contactEmail: document.getElementById('contactEmail').value,
        
        isPaid: isPaid,
        
        metadata: {
            eventType: document.querySelector('input[name="eventTypeTags"]:checked')?.value || '',
            cuisineType: cuisineType,
            specialHook: document.getElementById('specialHook').value,
            highlights: highlights,
            timeSlots: dynamicSlots,
            
            venueDetails: {
                name: document.getElementById('venueName').value,
                location: document.getElementById('venue').value,
                ambience: ambienceType,
                seating: document.querySelector('input[name="seatingType"]:checked')?.value || ''
            },
            
            pricingStrategy: {
                entryType: document.querySelector('input[name="entryType"]:checked')?.value || '',
                ticketPrice: document.getElementById('ticketPrice').value,
                coupleEntry: document.getElementById('couplePrice').value,
                groupDiscount: document.getElementById('groupDiscount').value,
                includesFood: document.getElementById('includesFood').value
            },
            
            menu: {
                starter: document.getElementById('menuStarter').value,
                main: document.getElementById('menuMain').value,
                dessert: document.getElementById('menuDessert').value,
                link: document.getElementById('menuLink').value
            },
            
            media: {
                bannerImage: formState.bannerImage,
                promoVideo: document.getElementById('promoVideo').value
            },
            
            experience: {
                addons: addons,
                ageRestriction: document.getElementById('ageRes').value,
                coupleFriendly: document.getElementById('coupleFriendly').value
            },
            
            social: {
                bestFor: bestFor,
                allowGroups: document.getElementById('groupBookings').value,
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
            throw new Error(result.error || 'Failed to list restaurant experience');
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
    else toast.style.borderColor = 'var(--accent-purple)';
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function setupEventListeners() {
    document.querySelectorAll('.input-field, .vibe-radio, .vibe-checkbox, input[type="range"]').forEach(field => {
        field.addEventListener('change', () => autoSaveDraft());
    });
}
