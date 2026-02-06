// Form State
let formState = {
    bannerImage: null,
    isPaid: false,
    isUnlimited: false,
    allowOutside: false
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadDraft();
});

// Check Auth
function checkAuth() {
    const host = sessionStorage.getItem('nexus_host');
    if (!host) {
        window.location.href = 'host-signup-login.html';
    }
}

// Toggle Ticket Type
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
}

// Toggle Seats
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
}

// Toggle Audience
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
}

// Handle Banner Upload
function handleBannerUpload(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            formState.bannerImage = e.target.result;
            document.getElementById('bannerImg').src = e.target.result;
            document.getElementById('bannerPlaceholder').style.display = 'none';
            document.getElementById('bannerPreview').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

// Remove Banner
function removeBanner(e) {
    e.stopPropagation();
    formState.bannerImage = null;
    document.getElementById('bannerInput').value = '';
    document.getElementById('bannerPlaceholder').style.display = 'block';
    document.getElementById('bannerPreview').style.display = 'none';
}

// Save Draft
function saveDraft() {
    const formData = new FormData(document.getElementById('festForm'));
    const draft = {};
    
    formData.forEach((value, key) => {
        draft[key] = value;
    });
    
    draft.bannerImage = formState.bannerImage;
    draft.isPaid = formState.isPaid;
    draft.isUnlimited = formState.isUnlimited;
    draft.allowOutside = formState.allowOutside;
    draft.savedAt = new Date().toISOString();
    
    sessionStorage.setItem('nexus_fest_draft', JSON.stringify(draft));
    showToast('Draft saved successfully!');
}

// Load Draft
function loadDraft() {
    const draft = sessionStorage.getItem('nexus_fest_draft');
    if (draft) {
        const data = JSON.parse(draft);
        // Populate form fields
        Object.keys(data).forEach(key => {
            const field = document.querySelector(`[name="${key}"]`);
            if (field && field.type !== 'file') {
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
        if (data.bannerImage) {
            formState.bannerImage = data.bannerImage;
            document.getElementById('bannerImg').src = data.bannerImage;
            document.getElementById('bannerPlaceholder').style.display = 'none';
            document.getElementById('bannerPreview').style.display = 'block';
        }
    }
}

// Preview Fest
function previewFest() {
    const form = document.getElementById('festForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const formData = new FormData(form);
    const previewContent = document.getElementById('previewContent');
    
    const ticketType = formState.isPaid ? 
        `<span class="tag tag-paid">PAID - ₹${formData.get('ticketPrice')}</span>` : 
        '<span class="tag tag-free">FREE</span>';
    
    const seatType = formState.isUnlimited ? 
        '<span class="tag tag-limited">UNLIMITED SEATS</span>' : 
        `<span class="tag tag-limited">LIMITED - ${formData.get('totalSeats')} SEATS</span>`;
    
    previewContent.innerHTML = `
        <img src="${formState.bannerImage || 'https://via.placeholder.com/700x200'}" class="preview-banner" alt="Fest Banner">
        <div class="preview-info">
            <h4>${formData.get('festName')}</h4>
            <div class="preview-meta">
                <span><i class="fas fa-calendar"></i> ${formData.get('startDate')} to ${formData.get('endDate')}</span>
                <span><i class="fas fa-map-marker-alt"></i> ${formData.get('venue')}</span>
            </div>
            <div class="preview-tags">
                ${ticketType}
                ${seatType}
            </div>
            <div class="preview-details">
                <h5>Event Details</h5>
                <div class="preview-row">
                    <span>Type</span>
                    <span>${formData.get('festType')}</span>
                </div>
                <div class="preview-row">
                    <span>Expected Attendance</span>
                    <span>${formData.get('expectedAttendance')}</span>
                </div>
                <div class="preview-row">
                    <span>ID Verification</span>
                    <span>${document.getElementById('idRequired').checked ? 'Required' : 'Not Required'}</span>
                </div>
                <div class="preview-row">
                    <span>Audience</span>
                    <span>${formState.allowOutside ? 'Open to all' : 'College students only'}</span>
                </div>
                <div class="preview-row">
                    <span>Coordinator</span>
                    <span>${formData.get('coordinatorName')}</span>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('previewModal').classList.add('active');
}

// Close Preview
function closePreview() {
    document.getElementById('previewModal').classList.remove('active');
}

// Submit From Preview
function submitFromPreview() {
    closePreview();
    submitFest({ preventDefault: () => {} });
}

// Submit Fest
function submitFest(e) {
    e.preventDefault();
    
    const btn = document.getElementById('submitBtn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    btn.disabled = true;
    
    const formData = new FormData(document.getElementById('festForm'));
    const festData = {};
    
    formData.forEach((value, key) => {
        festData[key] = value;
    });
    
    // Add toggle states
    festData.isPaid = formState.isPaid;
    festData.isUnlimited = formState.isUnlimited;
    festData.allowOutside = formState.allowOutside;
    festData.bannerImage = formState.bannerImage;
    festData.status = 'pending_approval';
    festData.createdAt = new Date().toISOString();
    festData.hostId = JSON.parse(sessionStorage.getItem('nexus_host')).email;
    
    // Save to sessionStorage (in real app, send to server)
    const pendingFests = JSON.parse(sessionStorage.getItem('nexus_pending_fests') || '[]');
    pendingFests.push(festData);
    sessionStorage.setItem('nexus_pending_fests', JSON.stringify(pendingFests));
    
    // Clear draft
    sessionStorage.removeItem('nexus_fest_draft');
    
    setTimeout(() => {
        document.getElementById('successModal').classList.add('active');
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit for Approval';
        btn.disabled = false;
    }, 1500);
}

// Go to Dashboard
function goToDashboard() {
    window.location.href = 'host-dashboard.html';
}

// Toggle Sidebar
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

// Logout
function logout() {
    sessionStorage.removeItem('nexus_host');
    window.location.href = 'host-signup-login.html';
}

// Toast
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Close modal on outside click
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});