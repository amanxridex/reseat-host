const API_URL = window.API_BASE_URL || 'https://nexus-host-backend.onrender.com/api';
let restaurantsCache = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Auth Check
    const token = localStorage.getItem('nexus_host');
    if (!token) {
        window.location.href = 'host-signup-login.html';
        return;
    }
    
    await fetchRestaurants();
    
    // Search listener
    document.getElementById('searchInput').addEventListener('input', (e) => {
        renderRestaurants(e.target.value.toLowerCase());
    });
    
    // Form submit listener
    document.getElementById('editForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveEdits();
    });
});

async function fetchRestaurants() {
    try {
        const res = await fetch(`${API_URL}/restaurants/mine`, {
            credentials: 'include'
        });
        
        if (!res.ok) throw new Error('Failed to fetch API data natively.');
        const resData = await res.json();
        restaurantsCache = resData.data || [];
        renderRestaurants();
    } catch (e) {
        console.error(e);
        document.getElementById('restaurantsGrid').innerHTML = `<p style="grid-column:1/-1; text-align:center; color:red;">Connection error</p>`;
    }
}

function renderRestaurants(filterQuery = '') {
    const grid = document.getElementById('restaurantsGrid');
    
    const filtered = restaurantsCache.filter(r => 
        r.name.toLowerCase().includes(filterQuery) || 
        (r.location && r.location.toLowerCase().includes(filterQuery))
    );
    
    if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding: 40px; color: var(--text-muted);">No locations found matching parameters.</div>`;
        return;
    }

    grid.innerHTML = filtered.map(r => `
        <div class="rest-card">
            <div class="rc-status ${r.status === 'active' ? 'bg-active' : 'bg-pending'}">
                ${r.status.toUpperCase()}
            </div>
            <h3>${r.name}</h3>
            <p><i class="fas fa-map-marker-alt" style="width:15px; color:#94a3b8;"></i> ${r.location || 'Location Not Specified'}</p>
            <p><i class="fas fa-utensils" style="width:15px; color:#94a3b8;"></i> ${r.type || 'Standard'}</p>
            <p><i class="fas fa-money-bill" style="width:15px; color:#94a3b8;"></i> ₹${r.price_for_two || 0} for two</p>
            
            <div class="action-row">
                <button class="btn btn-edit" onclick="openEditModal('${r.id}')"><i class="fas fa-edit"></i> Edit</button>
                <button class="btn btn-disable" onclick="toggleStatus('${r.id}', '${r.status}')">
                    <i class="fas ${r.status === 'active' ? 'fa-ban' : 'fa-check'}"></i> 
                    ${r.status === 'active' ? 'Disable' : 'Activate'}
                </button>
            </div>
        </div>
    `).join('');
}

function openEditModal(id) {
    const r = restaurantsCache.find(x => x.id === id);
    if (!r) return;
    
    document.getElementById('editId').value = r.id;
    document.getElementById('editName').value = r.name;
    document.getElementById('editType').value = r.type || '';
    document.getElementById('editPrice').value = r.price_for_two || 0;
    
    document.getElementById('editModal').classList.add('active');
}

function closeModal() {
    document.getElementById('editModal').classList.remove('active');
}

async function saveEdits() {
    const btn = document.querySelector('#editForm button');
    btn.textContent = "Saving..."; btn.disabled = true;
    
    const id = document.getElementById('editId').value;
    const updates = {
        name: document.getElementById('editName').value,
        type: document.getElementById('editType').value,
        price_for_two: document.getElementById('editPrice').value
    };
    
    try {
        const res = await fetch(`${API_URL}/restaurants/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(updates)
        });
        
        if (res.ok) {
            closeModal();
            await fetchRestaurants(); // Refresh view
        } else {
            alert('Physical API failure during update lock.');
        }
    } catch(e) {
        console.error(e);
        alert('Network dropped.');
    } finally {
        btn.textContent = "Save Physical Overrides"; btn.disabled = false;
    }
}

async function toggleStatus(id, currentStatus) {
    if (!confirm('Are you securely validating this structural mutation on your property?')) return;
    
    const newStatus = currentStatus === 'active' ? 'pending' : 'active';
    try {
        const res = await fetch(`${API_URL}/restaurants/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ status: newStatus })
        });
        if (res.ok) {
            await fetchRestaurants();
        }
    } catch (e) {
        alert("Failed to communicate with master relay.");
    }
}
