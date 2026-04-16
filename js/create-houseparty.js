// ============================================
// CONFIGURATION
// ============================================
const API_URL = "https://nexus-host-backend.onrender.com/api";

// ============================================
// STATE MANAGEMENT
// ============================================
let formState = {
    bannerImage: null,
    isPaid: false,
    isUnlimited: false,
    allowOutside: false,
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
        // ✅ Check session cookie first
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
        
        // ✅ Get host profile using cookie
        const profileRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            credentials: 'include', // ✅ Cookie sent
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!profileRes.ok) {
            throw new Error('Failed to load profile');
        }
        
        const profileData = await profileRes.json();
        formState.currentHost = profileData.data;
        
        // ✅ Keep in localStorage for UI only (no token)
        localStorage.setItem('nexus_host', JSON.stringify(profileData.data));
        
        return true;

    } catch (error) {
        console.error('Auth check failed:', error);
        redirectToLogin();
        return false;
    }
}

function redirectToLogin() {
    window.location.href = 'host-signup-login.html?redirect=create-fest.html';
}

// ============================================
// FORM TOGGLES
// ============================================
function toggleTicketType() {
    const isPaid = document.getElementById('isPaid').checked;
    const priceInputs = document.getElementById('priceInputs');
    const desc = document.getElementById('ticketTypeDesc');
    
    formState.isPaid = isPaid;
    
    if (isPaid) {
        priceInputs.style.display = 'block';
        desc.textContent = 'This is a paid event';
        document.querySelector('input[name="ticketPrice"]').setAttribute('required', 'required');
    } else {
        priceInputs.style.display = 'none';
        desc.textContent = 'This is a free event';
        document.querySelector('input[name="ticketPrice"]').removeAttribute('required');
    }
    
    autoSaveDraft();
}

function toggleSeats() {
    const isUnlimited = document.getElementById('isUnlimited').checked;
    const seatsInput = document.getElementById('seatsInput');
    const desc = document.getElementById('seatsDesc');
    
    formState.isUnlimited = isUnlimited;
    
    if (isUnlimited) {
        seatsInput.style.display = 'none';
        desc.textContent = 'Unlimited seats available';
        document.querySelector('input[name="totalSeats"]').removeAttribute('required');
    } else {
        seatsInput.style.display = 'block';
        desc.textContent = 'Limited seats available';
        document.querySelector('input[name="totalSeats"]').setAttribute('required', 'required');
    }
    
    autoSaveDraft();
}

function toggleAudience() {
    const allowOutside = document.getElementById('allowOutside').checked;
    const outsideOptions = document.getElementById('outsideOptions');
    const desc = document.getElementById('audienceDesc');
    
    formState.allowOutside = allowOutside;
    
    if (allowOutside) {
        outsideOptions.style.display = 'block';
        desc.textContent = 'Open to other colleges and public';
    } else {
        outsideOptions.style.display = 'none';
        desc.textContent = 'Only students from my college';
        document.getElementById('otherColleges').checked = false;
        document.getElementById('generalPublic').checked = false;
    }
    
    autoSaveDraft();
}

// ============================================
// BANNER UPLOAD
// ============================================
function handleBannerUpload(input) {
    const file = input.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        showToast('File size must be less than 5MB', 'error');
        return;
    }

    if (!file.type.startsWith('image/')) {
        showToast('Please upload an image file', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        formState.bannerImage = e.target.result;
        document.getElementById('bannerImg').src = e.target.result;
        document.getElementById('bannerPlaceholder').style.display = 'none';
        document.getElementById('bannerPreview').style.display = 'block';
        autoSaveDraft();
    };
    reader.readAsDataURL(file);
}

function removeBanner(e) {
    e.stopPropagation();
    formState.bannerImage = null;
    document.getElementById('bannerInput').value = '';
    document.getElementById('bannerPlaceholder').style.display = 'block';
    document.getElementById('bannerPreview').style.display = 'none';
    autoSaveDraft();
}

// ============================================
// DRAFT MANAGEMENT (Server-Side)
// ============================================
let draftSaveTimeout;

function autoSaveDraft() {
    clearTimeout(draftSaveTimeout);
    draftSaveTimeout = setTimeout(() => saveDraft(true), 2000);
}

async function saveDraft(silent = false) {
    try {
        const formData = collectFormData();
        
        // ✅ Cookie automatically sent
        const response = await fetch(`${API_URL}/fest/draft`, {
            method: 'POST',
            credentials: 'include', // ✅ Cookie sent
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('Failed to save draft');

        if (!silent) {
            showToast('Draft saved successfully!');
        }
    } catch (error) {
        console.error('Save draft error:', error);
        localStorage.setItem('nexus_fest_draft_backup', JSON.stringify(collectFormData()));
        if (!silent) {
            showToast('Saved locally (server error)', 'warning');
        }
    }
}

async function loadDraftFromServer() {
    try {
        // ✅ Cookie automatically sent
        const response = await fetch(`${API_URL}/fest/draft`, {
            credentials: 'include', // ✅ Cookie sent
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            const { draft } = await response.json();
            if (draft && draft.draft_data) {
                populateForm(draft.draft_data);
                return;
            }
        }

        const localDraft = localStorage.getItem('nexus_fest_draft') || 
                          localStorage.getItem('nexus_fest_draft_backup');
        if (localDraft) {
            populateForm(JSON.parse(localDraft));
        }

    } catch (error) {
        console.error('Load draft error:', error);
    }
}

function collectFormData() {
    const data = {
        festType: 'houseparty',
        festName: document.getElementById('festName').value,
        description: document.getElementById('description').value,
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('startDate').value, // identical for single day
        venue: document.getElementById('venue').value,
        expectedAttendance: document.getElementById('expectedAttendance').value || 50,
        coordinatorName: document.getElementById('coordinatorName').value,
        contactPhone: document.getElementById('contactPhone').value,
        contactEmail: document.getElementById('contactEmail').value,
        
        // Defaults to avoid strict API errors
        isPaid: false,
        isUnlimited: true,
        allowOutside: true,
        otherColleges: true,
        generalPublic: true,
        idRequired: false,
        idFields: [],
        
        metadata: {
            partyType: document.querySelector('input[name="partyType"]:checked')?.value || '',
            coreVibe: document.querySelector('input[name="coreVibe"]:checked')?.value || '',
            ageGroup: document.getElementById('ageGroup').value,
            coupleFriendly: document.getElementById('coupleFriendly').value,
            entryRules: document.querySelector('input[name="entryRules"]:checked')?.value || '',
            startTime: document.getElementById('startTime').value,
            peakTime: document.getElementById('peakTime').value,
            endTime: document.getElementById('endTime').value,
            playlistUrl: document.getElementById('playlistUrl').value,
            dressCode: document.getElementById('dressCode').value,
            allowPlusOnes: document.getElementById('allowPlusOnes').checked,
            dynamicPricing: document.getElementById('dynamicPricing').checked
        }
    };

    return data;
}

function populateForm(data) {
    Object.keys(data).forEach(key => {
        if (key === 'idFields' || key === 'isPaid' || key === 'isUnlimited' || 
            key === 'allowOutside' || key === 'bannerImage' || key === 'otherColleges' || 
            key === 'generalPublic' || key === 'idRequired') return;
            
        const field = document.querySelector(`[name="${key}"]`);
        if (field && field.type !== 'file' && field.type !== 'checkbox') {
            field.value = data[key];
        }
    });

    if (data.isPaid && document.getElementById('isPaid')) {
        document.getElementById('isPaid').checked = true;
        toggleTicketType();
    }
    if (data.isUnlimited && document.getElementById('isUnlimited')) {
        document.getElementById('isUnlimited').checked = true;
        toggleSeats();
    }
    if (data.allowOutside && document.getElementById('allowOutside')) {
        document.getElementById('allowOutside').checked = true;
        toggleAudience();
    }
    if (data.otherColleges && document.getElementById('otherColleges')) {
        document.getElementById('otherColleges').checked = true;
    }
    if (data.generalPublic && document.getElementById('generalPublic')) {
        document.getElementById('generalPublic').checked = true;
    }
    if (data.idRequired !== false && document.getElementById('idRequired')) {
        document.getElementById('idRequired').checked = true;
    }

    if (data.idFields) {
        document.querySelectorAll('input[name="idFields"]').forEach(cb => {
            cb.checked = data.idFields.includes(cb.value);
        });
    }

    if (data.bannerImage) {
        formState.bannerImage = data.bannerImage;
        document.getElementById('bannerImg').src = data.bannerImage;
        document.getElementById('bannerPlaceholder').style.display = 'none';
        document.getElementById('bannerPreview').style.display = 'block';
    }
}



// ============================================
// SUBMIT FEST (COOKIE-BASED)
// ============================================
async function submitFest(e) {
    e.preventDefault();
    
    const btn = document.getElementById('submitBtn');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    btn.disabled = true;

    try {
        const festData = collectFormData();

        // ✅ Cookie automatically sent
        const response = await fetch(`${API_URL}/fest/create`, {
            method: 'POST',
            credentials: 'include', // ✅ Cookie sent
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(festData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to create fest');
        }

        await clearDrafts();
        document.getElementById('successModal').classList.add('active');

    } catch (error) {
        console.error('Submit error:', error);
        showToast(error.message || 'Failed to submit fest. Please try again.', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function clearDrafts() {
    try {
        // ✅ Cookie automatically sent
        await fetch(`${API_URL}/fest/draft`, {
            method: 'DELETE',
            credentials: 'include' // ✅ Cookie sent
        });
    } catch (e) {
        console.log('Server draft clear failed');
    }
    
    localStorage.removeItem('nexus_fest_draft');
    localStorage.removeItem('nexus_fest_draft_backup');
    sessionStorage.removeItem('nexus_fest_draft');
}

// ============================================
// NAVIGATION
// ============================================
function goToDashboard() {
    window.location.href = 'host-dashboard.html';
}

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

// ============================================
// UTILITIES
// ============================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    if (type === 'error') {
        toast.style.borderColor = '#ef4444';
    } else if (type === 'warning') {
        toast.style.borderColor = '#f59e0b';
    } else {
        toast.style.borderColor = 'var(--accent-purple)';
    }
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function setupEventListeners() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    document.querySelectorAll('.input-field').forEach(field => {
        field.addEventListener('change', () => autoSaveDraft());
    });

    // ============================================
    // WIZARD EVENT SELECTION LOGIC
    // ============================================
    const eventCards = document.querySelectorAll('.event-card');
    const launchBtn = document.getElementById('launchPortalBtn');
    const festTypeInput = document.getElementById('festType');
    
    if (eventCards.length > 0) {
        eventCards.forEach(card => {
            card.addEventListener('click', () => {
                // Remove active from all
                eventCards.forEach(c => c.classList.remove('active'));
                
                // Add active to clicked
                card.classList.add('active');
                
                // Extract data
                const type = card.getAttribute('data-type');
                const title = card.querySelector('h4').innerText;
                
                // Set hidden input for form submission
                festTypeInput.value = type;
                
                // Activate the portal launch button
                launchBtn.classList.add('ready');
                launchBtn.removeAttribute('disabled');
                launchBtn.innerHTML = `Launch ${title} Portal 🚀`;
            });
        });

        launchBtn.addEventListener('click', () => {
            if (!launchBtn.classList.contains('ready')) return;
            
            const type = festTypeInput.value;
            
            if (type === 'college') {
                window.location.href = 'create-college-fest.html';
            } else if (type === 'concert') {
                window.location.href = 'create-concert.html';
            } else if (type === 'restaurant') {
                window.location.href = 'create-restaurant-event.html';
            } else if (type === 'screening') {
                window.location.href = 'create-screening.html';
            } else if (type === 'houseparty') {
                window.location.href = 'create-houseparty.html';
            } else {
                window.location.href = 'create-other.html';
            }
        });
    }
}