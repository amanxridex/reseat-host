const API_URL = window.API_BASE_URL || 'https://nexus-host-backend.onrender.com/api';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch(`${API_URL}/auth/check`, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!res.ok) throw new Error('No session');
        const checkData = await res.json();
        
        if (!checkData.exists) throw new Error('Host not found');
        
    } catch (err) {
        console.error('Auth error:', err);
        localStorage.removeItem('nexus_host');
        window.location.href = 'host-signup-login.html';
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!res.ok) throw new Error('Session expired');
        
        const data = await res.json();
        const hostData = data.data;

        // Profile updates
        const nameElement = document.getElementById('profileName');
        if (nameElement) nameElement.textContent = hostData.full_name || hostData.email.split('@')[0];
        
        const profileImg = document.getElementById('profileAvatar');
        if (profileImg && hostData.avatar_url) profileImg.src = hostData.avatar_url;

        // Load stats
        loadStats();
        
    } catch (err) {
        console.error('Failed to load profile:', err);
    }
});

function loadStats() {
    // Generate Mock Data for Premium UI View
    // In real scenario, fetch this from backend API.
    const liveRests = Math.floor(Math.random() * 5);
    const views = liveRests > 0 ? (liveRests * 450 + Math.floor(Math.random()*1500)).toLocaleString() : 0;
    const clicks = liveRests > 0 ? (liveRests * 80 + Math.floor(Math.random()*300)).toLocaleString() : 0;
    const funnel = liveRests > 0 ? '₹' + (liveRests * 25000).toLocaleString() : '₹0';

    document.getElementById('statTotalLive').textContent = liveRests;
    document.getElementById('statTotalViews').textContent = views;
    document.getElementById('statTotalClicks').textContent = clicks;
    document.getElementById('detActive').textContent = liveRests;
    document.getElementById('funnelTotal').textContent = funnel;

    const cardsContainer = document.getElementById('restaurantCards');
    
    if (liveRests === 0) {
        cardsContainer.innerHTML = `
            <div class="color-chunk bg-black" style="grid-column: 1/-1; align-items:center; justify-content:center; text-align:center;">
                <i class="fas fa-utensils" style="font-size:3rem; margin-bottom:15px; opacity:0.5;"></i>
                <h2>No Restaurants Online</h2>
                <p style="opacity:0.7; font-size:0.9rem; margin-bottom:20px;">Add your first restaurant to start tracking performance.</p>
                <a href="create-restaurant.html" class="btn-primary" style="background:#fff; color:#000; text-decoration:none;">Add Restaurant</a>
            </div>
        `;
    } else {
        const blocks = [
            { bg: 'bg-blue', name: 'Nexus Urban Grill', revenue: '11,250', metric: 'Top Performer' },
            { bg: 'bg-cyan', name: 'The Lounge', revenue: '21,300', metric: 'Highest Traffic' },
            { bg: 'bg-yellow', name: 'Sunset Cafe', revenue: '4,160', metric: 'Trending' },
            { bg: 'bg-black', name: 'Downtown Eats', revenue: '2,100', metric: 'Newest' }
        ];

        let html = '';
        for (let i = 0; i < liveRests; i++) {
            const block = blocks[i % blocks.length];
            const imgHTML = `
                <div class="faces">
                    <img src="https://placehold.co/100x100/10b981/fff?text=U" alt="usr">
                    <img src="https://placehold.co/100x100/ec4899/fff?text=V" alt="usr">
                    <img src="https://placehold.co/100x100/3b82f6/fff?text=W" alt="usr">
                </div>
            `;

            html += `
                <div class="color-chunk ${block.bg}">
                    <div class="chunk-top">
                        <small>${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric'})}</small>
                        <i class="fas fa-ellipsis-h dots"></i>
                    </div>
                    <div class="chunk-mid">
                        <small>${block.metric}</small>
                        <h4>${block.name}</h4>
                    </div>
                    <div class="chunk-bot">
                        <h2 class="amount">${block.revenue}₹</h2>
                        ${imgHTML}
                    </div>
                </div>
            `;
        }
        cardsContainer.innerHTML = html;
    }
}

async function logout() {
    try {
        await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        console.error('Logout error:', err);
    }
    
    localStorage.removeItem('nexus_host');
    sessionStorage.clear();
    window.location.href = 'host-signup-login.html';
}