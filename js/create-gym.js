// Authentication check (assuming config.js handles firebase init)
firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'host-signup-login.html';
    }
});

// Sidebar & Logout
function logout() {
    firebase.auth().signOut().then(() => {
        window.location.href = 'host-signup-login.html';
    });
}

// Media Upload Logic
function triggerUpload(box) {
    // Only trigger if clicking the box, not the remove button
    if(event.target.classList.contains('remove-img') || event.target.closest('.remove-img')) return;
    const input = box.querySelector('.file-input');
    input.click();
}

function previewImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        const box = input.closest('.image-box');
        const img = box.querySelector('.preview-img');
        
        // Size validation (max 5MB)
        if(input.files[0].size > 5 * 1024 * 1024) {
            showToast('Image must be under 5MB', 'error');
            input.value = '';
            return;
        }

        reader.onload = function(e) {
            img.src = e.target.result;
            box.classList.add('has-image');
        }
        reader.readAsDataURL(input.files[0]);
    }
}

function removeImage(event, btn) {
    event.stopPropagation();
    const box = btn.closest('.image-box');
    const input = box.querySelector('.file-input');
    const img = box.querySelector('.preview-img');
    
    input.value = '';
    img.src = '';
    box.classList.remove('has-image');
}

// Amenities Dynamic Addition
function addCustomAmenity() {
    const input = document.getElementById('customAmenity');
    const val = input.value.trim();
    if(val) {
        const grid = document.getElementById('amenitiesGrid');
        const pill = document.createElement('div');
        pill.className = 'amenity-pill selected';
        pill.innerHTML = `<i class="fas fa-check"></i> ${val}`;
        pill.onclick = function() { this.classList.toggle('selected'); };
        
        grid.appendChild(pill);
        input.value = '';
    }
}

// Form Submission
document.getElementById('addGymForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    submitBtn.disabled = true;

    try {
        const user = firebase.auth().currentUser;
        if (!user) throw new Error("Not authenticated");
        
        const token = await user.getIdToken();

        // Gather basic data
        const name = document.getElementById('gymName').value;
        const city = document.getElementById('gymCity').value;
        const address = document.getElementById('gymAddress').value;
        const map_url = document.getElementById('gymMap').value;
        const description = document.getElementById('gymDescription').value;

        // Gather amenities
        const amenities = [];
        document.querySelectorAll('.amenity-pill.selected').forEach(pill => {
            amenities.push(pill.innerText.trim());
        });

        // Gather pricing
        const pricing = {};
        document.querySelectorAll('.sub-tier').forEach(tier => {
            const key = tier.getAttribute('data-tier');
            const actual = tier.querySelector('.actual-price').value;
            const discount = tier.querySelector('.discount-price').value;
            
            if(actual || discount) {
                pricing[key] = {
                    actual: actual ? Number(actual) : null,
                    discount: discount ? Number(discount) : null
                };
            }
        });

        // Gather Base64 Images (Mocking true file upload for now)
        const images = [];
        document.querySelectorAll('.image-box').forEach(box => {
            if(box.classList.contains('has-image')) {
                const img = box.querySelector('.preview-img');
                images.push(img.src); // In production, upload to bucket and pass URLs
            }
        });
        
        if(images.length === 0) {
            throw new Error("At least one image is required.");
        }

        const payload = {
            name,
            address: `${address}, ${city}`,
            map_url,
            description,
            amenities,
            pricing,
            images
        };

        const response = await fetch(`${window.API_BASE_URL}/gyms`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (response.ok) {
            showToast('Gym published successfully!');
            setTimeout(() => {
                window.location.href = 'my-gyms.html';
            }, 1500);
        } else {
            throw new Error(data.error || 'Failed to publish gym');
        }

    } catch (error) {
        showToast(error.message, 'error');
        submitBtn.innerHTML = '<i class="fas fa-rocket"></i> Publish Gym Listing';
        submitBtn.disabled = false;
    }
});

// Toast System
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toastMsg');
    const icon = toast.querySelector('i');
    
    msg.textContent = message;
    
    if(type === 'error') {
        toast.classList.add('error');
        icon.className = 'fas fa-exclamation-circle';
    } else {
        toast.classList.remove('error');
        icon.className = 'fas fa-check-circle';
    }
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
