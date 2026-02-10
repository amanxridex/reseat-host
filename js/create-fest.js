// ============================================
// CONFIGURATION
// ============================================
const API_URL = "https://nexus-host-backend.onrender.com/api"; // Remove space
const SUPABASE_URL = "https://okskhrcvmjpxpegpewca.supabase.co";

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
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await loadDraftFromServer();
    setupEventListeners();
});

// ============================================
// AUTHENTICATION
// ============================================
async function checkAuth() {
    try {
        // Get token from localStorage (saved separately)
        const token = localStorage.getItem('nexus_token');
        let hostData = localStorage.getItem('nexus_host');

        if (!token || !hostData) {
            redirectToLogin();
            return;
        }

        formState.currentHost = JSON.parse(hostData);
        formState.currentHost.token = token; // Add token to host object

        // Verify token is still valid with backend
        const response = await fetch(`${API_URL}/host/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Session expired');
        }

    } catch (error) {
        console.error('Auth check failed:', error);
        clearAuthData();
        redirectToLogin();
    }
}

function clearAuthData() {
    sessionStorage.removeItem('nexus_host');
    localStorage.removeItem('nexus_host');
    localStorage.removeItem('nexus_token'); // Add this
    formState.currentHost = null;
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

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
        showToast('File size must be less than 5MB', 'error');
        return;
    }

    // Validate file type
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
    draftSaveTimeout = setTimeout(() => saveDraft(true), 2000); // Auto-save after 2s
}

async function saveDraft(silent = false) {
    try {
        const formData = collectFormData();
        
        const response = await fetch(`${API_URL}/fest/draft`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${formState.currentHost.token}`
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('Failed to save draft');

        if (!silent) {
            showToast('Draft saved successfully!');
        }
    } catch (error) {
        console.error('Save draft error:', error);
        // Fallback to localStorage if server fails
        localStorage.setItem('nexus_fest_draft_backup', JSON.stringify(collectFormData()));
        if (!silent) {
            showToast('Saved locally (server error)', 'warning');
        }
    }
}

async function loadDraftFromServer() {
    try {
        // Try server first
        const response = await fetch(`${API_URL}/fest/draft`, {
            headers: {
                'Authorization': `Bearer ${formState.currentHost.token}`
            }
        });

        if (response.ok) {
            const { draft } = await response.json();
            if (draft && draft.draft_data) {
                populateForm(draft.draft_data);
                return;
            }
        }

        // Fallback to localStorage
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
    const form = document.getElementById('festForm');
    const formData = new FormData(form);
    const data = {};
    
    formData.forEach((value, key) => {
        if (data[key]) {
            if (!Array.isArray(data[key])) {
                data[key] = [data[key]];
            }
            data[key].push(value);
        } else {
            data[key] = value;
        }
    });

    // Add toggle states
    data.isPaid = formState.isPaid;
    data.isUnlimited = formState.isUnlimited;
    data.allowOutside = formState.allowOutside;
    data.bannerImage = formState.bannerImage;
    data.idRequired = document.getElementById('idRequired').checked;
    data.idFields = Array.from(document.querySelectorAll('input[name="idFields"]:checked')).map(cb => cb.value);
    data.otherColleges = document.getElementById('otherColleges').checked;
    data.generalPublic = document.getElementById('generalPublic').checked;

    return data;
}

function populateForm(data) {
    // Populate text inputs
    Object.keys(data).forEach(key => {
        if (key === 'idFields' || key === 'isPaid' || key === 'isUnlimited' || 
            key === 'allowOutside' || key === 'bannerImage' || key === 'otherColleges' || 
            key === 'generalPublic' || key === 'idRequired') return;
            
        const field = document.querySelector(`[name="${key}"]`);
        if (field && field.type !== 'file' && field.type !== 'checkbox') {
            field.value = data[key];
        }
    });

    // Restore toggles
    if (data.isPaid) {
        document.getElementById('isPaid').checked = true;
        toggleTicketType();
    }
    if (data.isUnlimited) {
        document.getElementById('isUnlimited').checked = true;
        toggleSeats();
    }
    if (data.allowOutside) {
        document.getElementById('allowOutside').checked = true;
        toggleAudience();
    }
    if (data.otherColleges) {
        document.getElementById('otherColleges').checked = true;
    }
    if (data.generalPublic) {
        document.getElementById('generalPublic').checked = true;
    }
    if (data.idRequired !== false) {
        document.getElementById('idRequired').checked = true;
    }

    // Restore ID fields
    if (data.idFields) {
        document.querySelectorAll('input[name="idFields"]').forEach(cb => {
            cb.checked = data.idFields.includes(cb.value);
        });
    }

    // Restore banner
    if (data.bannerImage) {
        formState.bannerImage = data.bannerImage;
        document.getElementById('bannerImg').src = data.bannerImage;
        document.getElementById('bannerPlaceholder').style.display = 'none';
        document.getElementById('bannerPreview').style.display = 'block';
    }
}

// ============================================
// PREVIEW
// ============================================
function previewFest() {
    const form = document.getElementById('festForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const formData = collectFormData();
    const previewContent = document.getElementById('previewContent');

    const ticketType = formData.isPaid ? 
        `<span class="tag tag-paid">PAID - ₹${formData.ticketPrice}</span>` : 
        '<span class="tag tag-free">FREE</span>';

    const seatType = formData.isUnlimited ? 
        '<span class="tag tag-limited">UNLIMITED SEATS</span>' : 
        `<span class="tag tag-limited">LIMITED - ${formData.totalSeats} SEATS</span>`;

    const audienceText = formData.allowOutside ? 
        (formData.generalPublic ? 'Open to all (Public)' : 'Multiple colleges') : 
        'College students only';

    previewContent.innerHTML = `
        <img src="${formData.bannerImage || 'https://placehold.co/700x300/8b5cf6/ffffff?text=No+Banner'}" 
             class="preview-banner" alt="Fest Banner">
        <div class="preview-info">
            <h4>${formData.festName}</h4>
            <div class="preview-meta">
                <span><i class="fas fa-calendar"></i> ${formData.startDate} to ${formData.endDate}</span>
                <span><i class="fas fa-map-marker-alt"></i> ${formData.venue}</span>
            </div>
            <div class="preview-tags">
                ${ticketType}
                ${seatType}
                <span class="tag tag-limited">${formData.festType.toUpperCase()}</span>
            </div>
            <div class="preview-details">
                <h5>Event Details</h5>
                <div class="preview-row">
                    <span>Description</span>
                    <span style="max-width: 300px; text-align: right;">${formData.description}</span>
                </div>
                <div class="preview-row">
                    <span>Expected Attendance</span>
                    <span>${formData.expectedAttendance}</span>
                </div>
                <div class="preview-row">
                    <span>ID Verification</span>
                    <span>${formData.idRequired ? 'Required' : 'Not Required'}</span>
                </div>
                <div class="preview-row">
                    <span>Audience</span>
                    <span>${audienceText}</span>
                </div>
                <div class="preview-row">
                    <span>Coordinator</span>
                    <span>${formData.coordinatorName}</span>
                </div>
                <div class="preview-row">
                    <span>Contact</span>
                    <span>${formData.contactPhone}</span>
                </div>
            </div>
        </div>
    `;

    document.getElementById('previewModal').classList.add('active');
}

function closePreview() {
    document.getElementById('previewModal').classList.remove('active');
}

function submitFromPreview() {
    closePreview();
    submitFest({ preventDefault: () => {} });
}

// ============================================
// SUBMIT FEST (LIVE BACKEND)
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
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${formState.currentHost.token}`
            },
            body: JSON.stringify(festData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to create fest');
        }

        // Clear drafts on success
        await clearDrafts();

        // Show success
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
        // Clear server draft
        await fetch(`${API_URL}/fest/draft`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${formState.currentHost.token}`
            }
        });
    } catch (e) {
        console.log('Server draft clear failed');
    }
    
    // Clear local drafts
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

async function logout() {
    try {
        // Optional: Call backend to invalidate token
        await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${formState.currentHost?.token}`
            }
        });
    } catch (e) {
        console.log('Logout API call failed');
    }
    
    clearAuthData();
    window.location.href = 'host-signup-login.html';
}

// ============================================
// UTILITIES
// ============================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    // Color coding
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
    // Close modal on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    // Auto-save on input change
    document.querySelectorAll('.input-field').forEach(field => {
        field.addEventListener('change', () => autoSaveDraft());
    });
}