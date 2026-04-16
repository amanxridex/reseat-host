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

// Bind UI immediately, don't wait for network
setupEventListeners();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFestApp);
} else {
    initFestApp();
}

// ============================================
// AUTHENTICATION (COOKIE-BASED)
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
        localStorage.setItem('nexus_host', JSON.stringify(profileData.data));
        
        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        redirectToLogin();
        return false;
    }
}

function redirectToLogin() {
    window.location.href = 'host-signup-login.html?redirect=create-screening.html';
}

// ============================================
// DRAFT MANAGEMENT
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

        if (!response.ok) throw new Error('Failed to save draft');

        if (!silent) showToast('Draft saved successfully!');
    } catch (error) {
        localStorage.setItem('nexus_fest_draft_backup', JSON.stringify(collectFormData()));
        if (!silent) showToast('Saved locally (server error)', 'warning');
    }
}

async function loadDraftFromServer() {
    try {
        const response = await fetch(`${API_URL}/fest/draft`, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            const { draft } = await response.json();
            if (draft && draft.draft_data) {
                populateForm(draft.draft_data);
                return;
            }
        }

        const localDraft = localStorage.getItem('nexus_fest_draft') || localStorage.getItem('nexus_fest_draft_backup');
        if (localDraft) populateForm(JSON.parse(localDraft));

    } catch (error) {
        console.error('Load draft error:', error);
    }
}

function collectFormData() {
    // Collect checkboxes into arrays
    const hypeTags = Array.from(document.querySelectorAll('input[name="hypeTags"]:checked')).map(cb => cb.value);
    const breakGames = Array.from(document.querySelectorAll('input[name="breakGames"]:checked')).map(cb => cb.value);
    const seatingType = Array.from(document.querySelectorAll('input[name="seatingType"]:checked')).map(cb => cb.value);
    const addons = Array.from(document.querySelectorAll('input[name="addons"]:checked')).map(cb => cb.value);
    
    // Check pricing mode
    const isPaid = document.getElementById('entry-paid')?.checked || false;

    const data = {
        festType: 'screening',
        festName: document.getElementById('festName').value,
        description: document.getElementById('description').value,
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('startDate').value,
        venue: document.getElementById('venue').value,
        expectedAttendance: 100, // Default / Can be dynamic
        coordinatorName: document.getElementById('coordinatorName').value,
        contactPhone: document.getElementById('contactPhone').value,
        contactEmail: document.getElementById('contactEmail').value,
        
        isPaid: isPaid,
        
        metadata: {
            screeningType: document.querySelector('input[name="screeningType"]:checked')?.value || '',
            category: document.getElementById('category').value,
            language: document.getElementById('language').value,
            
            hypeTags: hypeTags,
            aiGeneratedTitle: document.getElementById('aiTitle').value,
            
            venueType: document.querySelector('input[name="venueType"]:checked')?.value || '',
            screenType: document.querySelector('input[name="screenType"]:checked')?.value || '',
            seatingType: seatingType,
            
            entryTime: document.getElementById('entryTime').value,
            startTime: document.getElementById('startTime').value,
            peakTime: document.getElementById('peakTime').value,
            
            crowdVibe: document.querySelector('input[name="crowdVibe"]:checked')?.value || '',
            teamSplit: document.getElementById('teamSplitSlider')?.value || "50",
            
            entryMode: document.querySelector('input[name="entryMode"]:checked')?.value || '',
            pricing: isPaid ? {
                early: document.getElementById('priceEarly').value,
                match: document.getElementById('priceMatch').value,
                vip: document.getElementById('priceVIP').value
            } : null,
            addons: addons,
            
            liveCheering: document.getElementById('liveCheering').checked,
            commentaryLang: document.getElementById('commentaryLang').value,
            breakGames: breakGames,
            
            outsideFood: document.getElementById('outsideFood').value,
            ageLimit: document.getElementById('ageLimit').value
        }
    };

    return data;
}

function populateForm(data) {
    Object.keys(data).forEach(key => {
        const field = document.querySelector(`[name="${key}"]`);
        if (field && field.type !== 'file' && field.type !== 'checkbox' && field.type !== 'radio') {
            field.value = data[key];
        }
    });

    if (data.metadata) {
        // Hydrate from metadata if needed
        if (data.metadata.category) document.getElementById('category').value = data.metadata.category;
    }
}

// ============================================
// SUBMIT FEST (To Admin)
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
            throw new Error(result.error || 'Failed to create live screening');
        }

        await clearDrafts();
        document.getElementById('successModal').classList.add('active');

    } catch (error) {
        console.error('Submit error:', error);
        showToast(error.message || 'Failed to submit screening. Please try again.', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function clearDrafts() {
    try {
        await fetch(`${API_URL}/fest/draft`, {
            method: 'DELETE',
            credentials: 'include'
        });
    } catch (e) {
        console.log('Server draft clear failed');
    }
    
    localStorage.removeItem('nexus_fest_draft');
    localStorage.removeItem('nexus_fest_draft_backup');
}

// ============================================
// UTILITIES & LISTENERS
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
