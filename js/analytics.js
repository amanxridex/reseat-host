// js/analytics.js

// Chart instances
let revenueChart, ticketTypeChart, hourlyChart, demographicsChart;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    loadUserData();
    initCharts();
    renderTables();
    renderActivity();
    renderFunnel();
    generateSparklines();
}

// Load User Data
function loadUserData() {
    const hostData = sessionStorage.getItem('nexus_host');
    if (hostData) {
        try {
            const host = JSON.parse(hostData);
            document.getElementById('user-name').textContent = host.name || 'Host User';
            document.getElementById('user-avatar').textContent = (host.name || 'H').charAt(0).toUpperCase();
        } catch (e) {
            console.error('Error loading user data:', e);
        }
    }
}

// Initialize Charts
function initCharts() {
    initRevenueChart();
    initTicketTypeChart();
    initHourlyChart();
    initDemographicsChart();
}

// Revenue Chart
function initRevenueChart() {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    
    const gradient1 = ctx.createLinearGradient(0, 0, 0, 300);
    gradient1.addColorStop(0, 'rgba(139, 92, 246, 0.3)');
    gradient1.addColorStop(1, 'rgba(139, 92, 246, 0)');
    
    const gradient2 = ctx.createLinearGradient(0, 0, 0, 300);
    gradient2.addColorStop(0, 'rgba(236, 72, 153, 0.2)');
    gradient2.addColorStop(1, 'rgba(236, 72, 153, 0)');

    revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [
                {
                    label: 'Actual',
                    data: [12000, 19000, 15000, 25000, 22000, 30000, 28000],
                    borderColor: '#8b5cf6',
                    backgroundColor: gradient1,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                },
                {
                    label: 'Projected',
                    data: [15000, 22000, 18000, 28000, 26000, 35000, 32000],
                    borderColor: '#ec4899',
                    backgroundColor: gradient2,
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0a0a12',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ₹' + context.parsed.y.toLocaleString();
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: 'rgba(255,255,255,0.4)' }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: {
                        color: 'rgba(255,255,255,0.4)',
                        callback: function(value) {
                            return '₹' + value/1000 + 'k';
                        }
                    }
                }
            }
        }
    });
}

// Ticket Type Doughnut Chart
function initTicketTypeChart() {
    const ctx = document.getElementById('ticketTypeChart').getContext('2d');
    
    ticketTypeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['VIP', 'General', 'Early Bird', 'Student'],
            datasets: [{
                data: [312, 485, 280, 170],
                backgroundColor: [
                    '#8b5cf6',
                    '#ec4899',
                    '#10b981',
                    '#3b82f6'
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: { display: false }
            }
        }
    });

    // Custom legend
    const legendData = [
        { label: 'VIP', value: 312, color: '#8b5cf6', percent: '25%' },
        { label: 'General', value: 485, color: '#ec4899', percent: '39%' },
        { label: 'Early Bird', value: 280, color: '#10b981', percent: '22%' },
        { label: 'Student', value: 170, color: '#3b82f6', percent: '14%' }
    ];

    document.getElementById('ticket-legend').innerHTML = legendData.map(item => `
        <div class="legend-row">
            <div class="legend-color" style="background: ${item.color}"></div>
            <span class="legend-text">${item.label}</span>
            <span class="legend-value">${item.percent}</span>
        </div>
    `).join('');
}

// Hourly Distribution Chart
function initHourlyChart() {
    const ctx = document.getElementById('hourlyChart').getContext('2d');
    
    hourlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['8AM', '10AM', '12PM', '2PM', '4PM', '6PM', '8PM'],
            datasets: [{
                label: 'Check-ins',
                data: [45, 120, 180, 150, 200, 280, 114],
                backgroundColor: '#8b5cf6',
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: 'rgba(255,255,255,0.4)' }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: 'rgba(255,255,255,0.4)' }
                }
            }
        }
    });
}

// Demographics Chart
function initDemographicsChart() {
    const ctx = document.getElementById('demographicsChart').getContext('2d');
    
    demographicsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
            datasets: [
                {
                    label: 'CSE',
                    data: [120, 150, 130, 100],
                    backgroundColor: '#8b5cf6',
                    borderRadius: 4
                },
                {
                    label: 'ECE',
                    data: [80, 90, 85, 70],
                    backgroundColor: '#ec4899',
                    borderRadius: 4
                },
                {
                    label: 'MECH',
                    data: [60, 70, 65, 50],
                    backgroundColor: '#10b981',
                    borderRadius: 4
                },
                {
                    label: 'Others',
                    data: [40, 50, 45, 35],
                    backgroundColor: '#3b82f6',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: 'rgba(255,255,255,0.6)',
                        usePointStyle: true,
                        padding: 20
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { display: false },
                    ticks: { color: 'rgba(255,255,255,0.4)' }
                },
                y: {
                    stacked: true,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: 'rgba(255,255,255,0.4)' }
                }
            }
        }
    });
}

// Render Funnel
function renderFunnel() {
    const funnelData = [
        { stage: 'Page Views', count: 12500, rate: '100%' },
        { stage: 'Add to Cart', count: 8125, rate: '65%' },
        { stage: 'Checkout', count: 5250, rate: '42%' },
        { stage: 'Purchase', count: 4750, rate: '38%' }
    ];

    document.getElementById('funnel-chart').innerHTML = funnelData.map(item => `
        <div class="funnel-bar">
            <div class="funnel-label">${item.stage}</div>
            <div class="funnel-track">
                <div class="funnel-fill ${item.stage.toLowerCase().split(' ')[0]}" style="width: ${item.rate}">
                    ${item.count.toLocaleString()}
                </div>
            </div>
            <div class="funnel-rate">${item.rate}</div>
        </div>
    `).join('');
}

// Generate Sparklines
function generateSparklines() {
    const sparklines = ['spark-revenue', 'spark-tickets', 'spark-attendees', 'spark-conversion'];
    
    sparklines.forEach(id => {
        const container = document.getElementById(id);
        if (!container) return;
        
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 60;
        container.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        const data = Array.from({length: 20}, () => Math.random() * 40 + 20);
        
        ctx.beginPath();
        ctx.moveTo(0, 60 - data[0]);
        
        data.forEach((point, i) => {
            const x = (i / (data.length - 1)) * 200;
            const y = 60 - point;
            ctx.lineTo(x, y);
        });
        
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Fill
        ctx.lineTo(200, 60);
        ctx.lineTo(0, 60);
        ctx.fillStyle = 'rgba(139, 92, 246, 0.1)';
        ctx.fill();
    });
}

// Render Tables
function renderTables() {
    const events = [
        { name: 'Tech Fest 2024', date: 'Feb 15-17, 2024', tickets: 850, revenue: 125000, status: 'live' },
        { name: 'Cultural Night', date: 'Mar 05, 2024', tickets: 420, revenue: 42000, status: 'upcoming' },
        { name: 'Hackathon 2024', date: 'Jan 20-21, 2024', tickets: 380, revenue: 45000, status: 'completed' },
        { name: 'Sports Meet', date: 'Dec 15, 2023', tickets: 620, revenue: 31000, status: 'completed' }
    ];

    document.getElementById('events-table').innerHTML = events.map(e => `
        <tr>
            <td>
                <div style="font-weight: 600;">${e.name}</div>
            </td>
            <td style="color: var(--text-secondary);">${e.date}</td>
            <td>${e.tickets.toLocaleString()}</td>
            <td style="font-weight: 600;">₹${e.revenue.toLocaleString()}</td>
            <td><span class="status-badge ${e.status}">${e.status}</span></td>
        </tr>
    `).join('');
}

// Render Activity
function renderActivity() {
    const activities = [
        { icon: 'sale', emoji: '💰', title: 'New ticket sale - VIP Pass', meta: 'Tech Fest 2024 • 2 mins ago' },
        { icon: 'scan', emoji: '📱', title: '45 check-ins completed', meta: 'Cultural Night • 15 mins ago' },
        { icon: 'payout', emoji: '💸', title: 'Withdrawal processed', meta: '₹20,000 • 1 hour ago' },
        { icon: 'sale', emoji: '🎫', title: 'Bulk booking - 10 tickets', meta: 'Hackathon 2024 • 3 hours ago' }
    ];

    document.getElementById('activity-list').innerHTML = activities.map(a => `
        <div class="activity-item">
            <div class="activity-icon ${a.icon}">${a.emoji}</div>
            <div class="activity-content">
                <div class="activity-title">${a.title}</div>
                <div class="activity-meta">${a.meta}</div>
            </div>
        </div>
    `).join('');
}

// Date Range Functions
function setRange(range) {
    document.querySelectorAll('.range-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    const ranges = {
        '7d': 'Jan 31 - Feb 07, 2024',
        '30d': 'Jan 08 - Feb 07, 2024',
        '90d': 'Nov 08, 2023 - Feb 07, 2024'
    };
    
    if (range === 'custom') {
        document.getElementById('date-modal').classList.remove('hidden');
    } else {
        document.getElementById('date-range').textContent = ranges[range];
        updateChartsForRange(range);
    }
}

function closeDateModal() {
    document.getElementById('date-modal').classList.add('hidden');
}

function applyCustomRange() {
    const start = document.getElementById('start-date').value;
    const end = document.getElementById('end-date').value;
    
    if (start && end) {
        document.getElementById('date-range').textContent = `${formatDate(start)} - ${formatDate(end)}`;
        closeDateModal();
        // Update charts with custom range
    }
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Update Charts for Range
function updateChartsForRange(range) {
    // Simulate data updates
    const multiplier = range === '7d' ? 1 : range === '30d' ? 4 : 12;
    
    revenueChart.data.datasets[0].data = revenueChart.data.datasets[0].data.map(v => v * (0.8 + Math.random() * 0.4));
    revenueChart.update();
}

// Change Fest
function changeFest() {
    const fest = document.getElementById('fest-select').value;
    // Update all charts and data based on selected fest
    showToast(`Switched to ${fest === 'all' ? 'All Events' : fest}`, 'success');
}

// Export Report
function exportReport() {
    showToast('Report downloaded as PDF', 'success');
}

// Toast Notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 32px;
        right: 32px;
        padding: 16px 24px;
        background: ${type === 'success' ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)'};
        color: white;
        border-radius: 12px;
        font-weight: 600;
        z-index: 3000;
        animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);