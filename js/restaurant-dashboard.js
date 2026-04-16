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

async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/restaurants/mine`, {
            credentials: 'include'
        });
        
        const resData = await response.json();
        const restaurants = resData.data || [];
        
        const liveRests = restaurants.length;
        
        // Aggregate real metrics from all owned restaurants
        const totalImpressions = restaurants.reduce((sum, r) => sum + parseInt(r.impressions_count || 0), 0);
        const totalClicks = restaurants.reduce((sum, r) => sum + parseInt(r.clicks_count || 0), 0);
        
        const views = totalImpressions.toLocaleString();
        const clicks = totalClicks.toLocaleString();
        const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) + '%' : "0%";
        const funnel = `Avg CTR: ${ctr}`;

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
            const backgrounds = ['bg-blue', 'bg-cyan', 'bg-yellow', 'bg-black'];
            let html = '';
            
            restaurants.forEach((rest, index) => {
                const bgClass = backgrounds[index % backgrounds.length];
                const viewsStr = (rest.impressions_count || 0).toLocaleString();
                const clicksStr = (rest.clicks_count || 0).toLocaleString();

                html += `
                    <div class="color-chunk ${bgClass}">
                        <div class="chunk-top">
                            <small>${new Date(rest.created_at).toLocaleDateString()}</small>
                            <i class="fas fa-ellipsis-h dots"></i>
                        </div>
                        <div class="chunk-mid">
                            <small>Status: ${rest.status.toUpperCase()}</small>
                            <h4>${rest.name}</h4>
                        </div>
                        <div class="chunk-bot" style="display:flex; justify-content:space-between; align-items:flex-end;">
                            <div>
                                <small style="opacity:0.8;">Views</small>
                                <h3 style="margin:0;">${viewsStr}</h3>
                            </div>
                            <div style="text-align:right;">
                                <small style="opacity:0.8;">Clicks</small>
                                <h3 style="margin:0;">${clicksStr}</h3>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            cardsContainer.innerHTML = html;
        }
    } catch (err) {
        console.error('Failed to load restaurants:', err);
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