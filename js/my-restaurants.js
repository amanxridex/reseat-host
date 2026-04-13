const API_URL = window.API_BASE_URL || 'https://nexus-host-backend.onrender.com/api';
let restaurantsCache = [];
let editImagesCache = [];
let editMenuImagesCache = [];

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('nexus_host');
    if (!token) { window.location.href = 'host-signup-login.html'; return; }
    
    await fetchRestaurants();
    document.getElementById('searchInput').addEventListener('input', (e) => renderRestaurants(e.target.value.toLowerCase()));
    document.getElementById('editForm').addEventListener('submit', async (e) => { e.preventDefault(); await saveEdits(); });
});

async function fetchRestaurants() {
    try {
        const res = await fetch(`${API_URL}/restaurants/mine`, { credentials: 'include' });
        if (!res.ok) throw new Error('API Drop');
        const resData = await res.json();
        restaurantsCache = resData.data || [];
        renderRestaurants();
    } catch (e) {
        document.getElementById('restaurantsGrid').innerHTML = `<p style="grid-column:1/-1; text-align:center; color:red;">Network timeout.</p>`;
    }
}

function renderRestaurants(filterQuery = '') {
    const grid = document.getElementById('restaurantsGrid');
    const filtered = restaurantsCache.filter(r => 
        r.name.toLowerCase().includes(filterQuery) || 
        (r.address && r.address.toLowerCase().includes(filterQuery))
    );
    
    if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding: 40px; color: var(--text-muted);">No locations found matching constraints.</div>`;
        return;
    }

    grid.innerHTML = filtered.map(r => {
        let statusClass = 'bg-pending'; let statTxt = r.status.toUpperCase();
        if(r.status === 'active') statusClass = 'bg-active';
        else if(r.status === 'update_pending') { statusClass = 'bg-pending'; statTxt = 'UPDATE PENDING'; }

        return `
        <div class="rest-card">
            <div class="rc-status ${statusClass}">${statTxt}</div>
            <h3>${r.name}</h3>
            <p><i class="fas fa-map-marker-alt" style="width:15px; color:#94a3b8;"></i> ${r.address || 'Address Unspecified'}</p>
            <p><i class="fas fa-utensils" style="width:15px; color:#94a3b8;"></i> ${r.cuisines || 'Standard Cuisines'}</p>
            <p><i class="fas fa-money-bill" style="width:15px; color:#94a3b8;"></i> ₹${r.cost_for_two || 0} for two</p>
            
            <div class="action-row">
                <button class="btn btn-edit" onclick="openEditModal('${r.id}')"><i class="fas fa-edit"></i> Edit</button>
                <button class="btn btn-disable" onclick="toggleStatus('${r.id}', '${r.status}')">
                    <i class="fas ${r.status === 'active' ? 'fa-ban' : 'fa-check'}"></i> 
                    ${r.status === 'active' ? 'Disable' : 'Activate'}
                </button>
            </div>
        </div>
    `}).join('');
}

function handleEditImages(input) {
    if (!input.files || input.files.length === 0) return;
    Array.from(input.files).forEach(file => editImagesCache.push({ file, url: URL.createObjectURL(file) }));
    renderEditPreviews();
    input.value = '';
}

function removeEditImage(index) { editImagesCache.splice(index, 1); renderEditPreviews(); }

function renderEditPreviews() {
    document.getElementById('editPreviewGrid').innerHTML = editImagesCache.map((img, index) => `
        <div class="preview-box" style="background-image: url('${img.url || img}')">
            <button class="remove-btn" type="button" onclick="removeEditImage(${index})"><i class="fas fa-times"></i></button>
        </div>
    `).join('');
}

function handleEditMenuImages(input) {
    if (!input.files || input.files.length === 0) return;
    Array.from(input.files).forEach(file => editMenuImagesCache.push({ file, url: URL.createObjectURL(file) }));
    renderEditMenuPreviews();
    input.value = '';
}

function removeEditMenuImage(index) { editMenuImagesCache.splice(index, 1); renderEditMenuPreviews(); }

function renderEditMenuPreviews() {
    document.getElementById('editMenuPreviewGrid').innerHTML = editMenuImagesCache.map((img, index) => `
        <div class="preview-box" style="background-image: url('${img.url || img}')">
            <button class="remove-btn" type="button" onclick="removeEditMenuImage(${index})"><i class="fas fa-times"></i></button>
        </div>
    `).join('');
}

function openEditModal(id) {
    const r = restaurantsCache.find(x => x.id === id);
    if (!r) return;
    
    document.getElementById('editId').value = r.id;
    document.getElementById('editName').value = r.name;
    document.getElementById('editType').value = r.cuisines || '';
    document.getElementById('editPrice').value = r.cost_for_two || 0;
    document.getElementById('editAddress').value = r.address || '';
    
    editImagesCache = r.images ? [...r.images] : [];
    renderEditPreviews();
    
    editMenuImagesCache = r.menu_images ? [...r.menu_images] : [];
    renderEditMenuPreviews();
    
    document.getElementById('editModal').classList.add('active');
}

function closeModal() { document.getElementById('editModal').classList.remove('active'); }

async function saveEdits() {
    const btn = document.querySelector('#editForm button');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading Image Streams...'; btn.disabled = true;
    
    const id = document.getElementById('editId').value;
    
    // Resolve all physical files to Supabase CDN implicitly
    const finalImages = [];
    for (let i of editImagesCache) {
        if (typeof i === 'string') {
            finalImages.push(i);
        } else if (i.url && i.url.startsWith('http') && !i.url.startsWith('blob:')) {
            finalImages.push(i.url);
        } else if (i.file) {
            // Actively Execute Image Upload Buffer
            const formData = new FormData();
            formData.append('file', i.file);
            try {
                const token = localStorage.getItem('nexus_token') || '';
                const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                const uploadRes = await fetch(`${window.API_BASE_URL || 'https://nexus-host-backend.onrender.com/api'}/upload/property-image`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: headers,
                    body: formData
                });
                const uploadData = await uploadRes.json();
                if (uploadData.success && uploadData.url) {
                    finalImages.push(uploadData.url);
                }
            } catch (err) {
                console.error("Image Upload Fragment failed:", err);
            }
        }
    }
    
    const finalMenuImages = [];
    for (let i of editMenuImagesCache) {
        if (typeof i === 'string') {
            finalMenuImages.push(i);
        } else if (i.url && i.url.startsWith('http') && !i.url.startsWith('blob:')) {
            finalMenuImages.push(i.url);
        } else if (i.file) {
            // Actively Execute Menu Image Upload Buffer
            const formData = new FormData();
            formData.append('file', i.file);
            try {
                const token = localStorage.getItem('nexus_token') || '';
                const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                const uploadRes = await fetch(`${window.API_BASE_URL || 'https://nexus-host-backend.onrender.com/api'}/upload/property-image`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: headers,
                    body: formData
                });
                const uploadData = await uploadRes.json();
                if (uploadData.success && uploadData.url) {
                    finalMenuImages.push(uploadData.url);
                }
            } catch (err) {
                console.error("Menu Image Upload Fragment failed:", err);
            }
        }
    }
    
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Staging...';

    const updates = {
        name: document.getElementById('editName').value,
        cuisines: document.getElementById('editType').value,
        cost_for_two: document.getElementById('editPrice').value,
        address: document.getElementById('editAddress').value,
        images: finalImages,
        menu_images: finalMenuImages
    };
    
    try {
        const res = await fetch(`${API_URL}/restaurants/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(updates)
        });
        
        if (res.ok) { closeModal(); await fetchRestaurants(); } 
        else alert('Update staging failed natively.');
    } catch(e) { alert('Network dropout.'); } 
    finally { btn.innerHTML = 'Save Physical Overrides'; btn.disabled = false; }
}

async function toggleStatus(id, currentStatus) {
    if (!confirm('Toggle physical availability securely?')) return;
    
    const newStatus = currentStatus === 'active' ? 'pending' : 'active';
    try {
        const res = await fetch(`${API_URL}/restaurants/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ status: newStatus })
        });
        if (res.ok) fetchRestaurants();
    } catch (e) { alert("Relay timeout."); }
}
