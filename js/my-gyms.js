// ─── Authentication & Setup ───
firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'host-signup-login.html';
    } else {
        fetchMyGyms(user);
    }
});

function logout() {
    firebase.auth().signOut().then(() => {
        window.location.href = 'host-signup-login.html';
    });
}

let allGyms = []; // Store fetched gyms here for filtering

// ─── Fetch Data ───
async function fetchMyGyms(user) {
    const grid = document.getElementById('gymsGrid');
    try {
        const token = await user.getIdToken();
        
        // Ensure API_BASE_URL is loaded from config
        const response = await fetch(`${window.API_BASE_URL}/gyms/mine`, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const resData = await response.json();
        
        if (response.ok) {
            allGyms = resData.data || [];
            renderGyms(allGyms);
        } else {
            throw new Error(resData.error || 'Failed to fetch gyms');
        }
    } catch (error) {
        console.error('Error fetching gyms:', error);
        grid.innerHTML = `
            <div class="loading" style="color: var(--neon-pink);">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load gyms. Please try again later.</p>
            </div>
        `;
    }
}

// ─── Render UI ───
function renderGyms(data) {
    const grid = document.getElementById('gymsGrid');
    grid.innerHTML = '';
    
    if (data.length === 0) {
        grid.innerHTML = `
            <div class="loading">
                <i class="fas fa-box-open" style="color: var(--text-muted);"></i>
                <p>You haven't listed any gyms yet.</p>
                <a href="create-gym.html" class="btn-primary" style="margin-top: 20px; display: inline-block;">Create First Gym</a>
            </div>
        `;
        return;
    }
    
    data.forEach(gym => {
        // Fallback image if none inside array
        let imgUrl = 'https://placehold.co/400x300/1f113a/ffffff?text=Gym';
        if (gym.images && gym.images.length > 0) {
            imgUrl = gym.images[0];
        }
        
        // Mock stats (can be augmented by DB later)
        const subscribers = Math.floor(Math.random() * 50); 
        const revenue = subscribers * 1500;
        
        const card = document.createElement('div');
        card.className = 'gym-card';
        card.innerHTML = `
            <div class="gym-status status-${gym.status}">${gym.status.toUpperCase()}</div>
            <img class="gym-img" src="${imgUrl}" alt="${gym.name}">
            <div class="gym-details">
                <div class="gym-title">${gym.name}</div>
                <div class="gym-addr"><i class="fas fa-map-marker-alt"></i> ${gym.address}</div>
                
                <div class="gym-stats">
                    <div class="stat-item">
                        <div class="stat-val">${subscribers}</div>
                        <div class="stat-lbl">Active Subs</div>
                    </div>
                    <div class="stat-item revenue">
                        <div class="stat-val">₹${revenue.toLocaleString()}</div>
                        <div class="stat-lbl">Revenue</div>
                    </div>
                </div>
                
                <div class="gym-actions">
                    <button class="btn-card-action btn-edit" onclick="editGym('${gym.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-card-action btn-delete" onclick="deleteGym('${gym.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// ─── Filtering ───
document.getElementById('searchInput').addEventListener('input', function(e) {
    const val = e.target.value.toLowerCase();
    const status = document.getElementById('statusFilter').value;
    filterData(val, status);
});

document.getElementById('statusFilter').addEventListener('change', function(e) {
    const val = document.getElementById('searchInput').value.toLowerCase();
    const status = e.target.value;
    filterData(val, status);
});

function filterData(searchQuery, statusFilter) {
    let filtered = allGyms;
    
    if (searchQuery) {
        filtered = filtered.filter(g => 
            g.name.toLowerCase().includes(searchQuery) || 
            g.address.toLowerCase().includes(searchQuery)
        );
    }
    
    if (statusFilter !== 'all') {
        filtered = filtered.filter(g => g.status === statusFilter);
    }
    
    renderGyms(filtered);
}

// ─── Actions Mock ───
function editGym(id) {
    alert("Edit Gym module coming soon! ID: " + id);
}

function deleteGym(id) {
    if(confirm("Are you sure you want to delete this gym listing?")) {
        alert("Delete API call will execute for ID: " + id);
        // Implement delete endpoint call
    }
}
