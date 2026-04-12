// create-restaurant.js

const API_URL = window.API_BASE_URL;
let restaurantImages = [];
let menuImages = [];
const MAX_REST_IMAGES = 6;

// Handle Restaurant General Images
function handleRestImages(input) {
    if (!input.files || input.files.length === 0) return;
    
    Array.from(input.files).forEach(file => {
        if (restaurantImages.length >= MAX_REST_IMAGES) {
            alert(`Maximum of ${MAX_REST_IMAGES} restaurant images allowed.`);
            return;
        }
        
        // Use an object URL for instant preview (in real app, upload to storage)
        const previewUrl = URL.createObjectURL(file);
        restaurantImages.push({ file, url: previewUrl });
    });
    
    renderRestPreviews();
    input.value = ''; // Reset input
}

// Handle Menu Images (Unlimited)
function handleMenuImages(input) {
    if (!input.files || input.files.length === 0) return;
    
    Array.from(input.files).forEach(file => {
        const previewUrl = URL.createObjectURL(file);
        menuImages.push({ file, url: previewUrl });
    });
    
    renderMenuPreviews();
    input.value = ''; // Reset input
}

// Render Preview Grids
function renderRestPreviews() {
    const grid = document.getElementById('restPreviewGrid');
    grid.innerHTML = restaurantImages.map((img, index) => `
        <div class="preview-box" style="background-image: url('${img.url}')">
            <button class="remove-btn" type="button" onclick="removeRestImage(${index})"><i class="fas fa-times"></i></button>
        </div>
    `).join('');
}

function renderMenuPreviews() {
    const grid = document.getElementById('menuPreviewGrid');
    grid.innerHTML = menuImages.map((img, index) => `
        <div class="preview-box" style="background-image: url('${img.url}')">
            <button class="remove-btn" type="button" onclick="removeMenuImage(${index})"><i class="fas fa-times"></i></button>
        </div>
    `).join('');
}

// Remove Images
function removeRestImage(index) {
    restaurantImages.splice(index, 1);
    renderRestPreviews();
}

function removeMenuImage(index) {
    menuImages.splice(index, 1);
    renderMenuPreviews();
}

// Form Submission
document.getElementById('createRestaurantForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    submitBtn.disabled = true;

    try {
        // Collect basic data
        const data = {
            name: document.getElementById('restName').value,
            about: document.getElementById('restAbout').value,
            fssai: document.getElementById('fssai').value,
            phone: document.getElementById('restPhone').value,
            address: document.getElementById('restAddress').value,
            location_url: document.getElementById('restLocation').value,
            open_time: document.getElementById('openTime').value,
            close_time: document.getElementById('closeTime').value,
            
            // In a real flow, images would be uploaded to Supabase Storage first 
            // and their URLs sent here. Since we are mocking the frontend builder:
            images: restaurantImages.map(r => 'mock_uploaded_img_url'), 
            menu: menuImages.map(m => 'mock_uploaded_menu_url')
        };
        
        // Mock API Call delay
        await new Promise(r => setTimeout(r, 1500));
        
        alert('Restaurant setup completed successfully!');
        window.location.href = 'restaurant-dashboard.html';
        
    } catch (err) {
        console.error(err);
        alert('Failed to create restaurant. Please try again.');
        submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> Complete Registration';
        submitBtn.disabled = false;
    }
});
