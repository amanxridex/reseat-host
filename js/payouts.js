// js/payouts.js

// State
let currentPage = 1;
const itemsPerPage = 5;
let transactions = [];
let withdrawalMethods = [];
let earningsChart = null;
let hideBalance = false;

// Mock Data
const mockTransactions = [
    { id: 'TXN-001', title: 'Tech Fest 2024 - Ticket Sales', type: 'ticket', amount: 12500, date: '2024-02-06', status: 'completed', fest: 'Tech Fest 2024' },
    { id: 'TXN-002', title: 'Withdrawal to SBI Account', type: 'withdrawal', amount: -20000, date: '2024-02-05', status: 'completed', method: 'State Bank of India' },
    { id: 'TXN-003', title: 'Cultural Night - Ticket Sales', type: 'ticket', amount: 8750, date: '2024-02-04', status: 'pending', fest: 'Cultural Night' },
    { id: 'TXN-004', title: 'Refund - Duplicate Booking', type: 'refund', amount: -500, date: '2024-02-03', status: 'completed', fest: 'Tech Fest 2024' },
    { id: 'TXN-005', title: 'Hackathon 2024 - Ticket Sales', type: 'ticket', amount: 15000, date: '2024-02-02', status: 'completed', fest: 'Hackathon 2024' },
    { id: 'TXN-006', title: 'Withdrawal to HDFC Account', type: 'withdrawal', amount: -15000, date: '2024-02-01', status: 'processing', method: 'HDFC Bank' },
    { id: 'TXN-007', title: 'Sports Meet - Ticket Sales', type: 'ticket', amount: 6200, date: '2024-01-31', status: 'completed', fest: 'Annual Sports Meet' },
    { id: 'TXN-008', title: 'Withdrawal to UPI', type: 'withdrawal', amount: -8000, date: '2024-01-30', status: 'completed', method: 'Google Pay' }
];

const mockMethods = [
    { id: 1, type: 'bank', name: 'State Bank of India', details: '****4523', primary: true, icon: '🏦' },
    { id: 2, type: 'bank', name: 'HDFC Bank', details: '****7891', primary: false, icon: '🏦' },
    { id: 3, type: 'upi', name: 'Google Pay', details: 'host@oksbi', primary: false, icon: '💳' }
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    loadUserData();
    loadTransactions();
    loadMethods();
    initChart();
    setupEventListeners();
    updateSummary();
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

// Load Transactions
function loadTransactions() {
    transactions = [...mockTransactions];
    renderTransactions();
    updatePagination();
}

// Render Transactions
function renderTransactions() {
    const container = document.getElementById('transactions-list');
    const filter = document.getElementById('type-filter').value;
    
    let filtered = transactions;
    if (filter !== 'all') {
        filtered = transactions.filter(t => t.type === filter);
    }
    
    const start = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(start, start + itemsPerPage);
    
    if (paginated.length === 0) {
        container.innerHTML = '<div class="no-data">No transactions found</div>';
        return;
    }
    
    container.innerHTML = paginated.map(t => {
        const isIncome = t.amount > 0;
        const iconClass = t.type === 'ticket' ? 'income' : t.type === 'withdrawal' ? 'outgoing' : 'pending';
        const icon = t.type === 'ticket' ? '↓' : t.type === 'withdrawal' ? '↑' : '↺';
        
        return `
            <div class="transaction-item">
                <div class="transaction-icon ${iconClass}">
                    <span style="font-size: 20px;">${icon}</span>
                </div>
                <div class="transaction-details">
                    <div class="transaction-title">${t.title}</div>
                    <div class="transaction-meta">${t.date} • ${t.fest || t.method || 'System'}</div>
                </div>
                <div class="transaction-amount">
                    <span class="amount ${isIncome ? 'positive' : 'negative'}">
                        ${isIncome ? '+' : ''}₹${Math.abs(t.amount).toLocaleString()}
                    </span>
                    <span class="status">${t.status}</span>
                </div>
            </div>
        `;
    }).join('');
}

// Update Pagination
function updatePagination() {
    const filter = document.getElementById('type-filter').value;
    const filtered = filter === 'all' ? transactions : transactions.filter(t => t.type === filter);
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    
    document.getElementById('current-page').textContent = currentPage;
    document.getElementById('total-pages').textContent = totalPages || 1;
}

// Change Page
function changePage(direction) {
    const filter = document.getElementById('type-filter').value;
    const filtered = filter === 'all' ? transactions : transactions.filter(t => t.type === filter);
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    
    const newPage = currentPage + direction;
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderTransactions();
        updatePagination();
    }
}

// Load Methods
function loadMethods() {
    withdrawalMethods = [...mockMethods];
    renderMethods();
    renderAccountOptions();
}

// Render Methods
function renderMethods() {
    const container = document.getElementById('methods-list');
    
    container.innerHTML = withdrawalMethods.map(m => `
        <div class="method-card ${m.primary ? 'primary' : ''}">
            <div class="method-icon">${m.icon}</div>
            <div class="method-info">
                <div class="method-name">
                    ${m.name}
                    ${m.primary ? '<span class="method-badge">Primary</span>' : ''}
                </div>
                <div class="method-details">${m.details}</div>
            </div>
            <div class="method-actions">
                ${!m.primary ? `<button class="method-btn" onclick="setPrimary(${m.id})" title="Set as Primary">★</button>` : ''}
                <button class="method-btn" onclick="deleteMethod(${m.id})" title="Remove">🗑</button>
            </div>
        </div>
    `).join('');
}

// Render Account Options in Withdraw Modal
function renderAccountOptions() {
    const container = document.getElementById('account-options');
    const primary = withdrawalMethods.find(m => m.primary) || withdrawalMethods[0];
    
    container.innerHTML = withdrawalMethods.map(m => `
        <div class="account-option ${m.id === primary?.id ? 'selected' : ''}" onclick="selectAccount(${m.id})" data-id="${m.id}">
            <div class="account-radio"></div>
            <div class="account-info">
                <div class="account-bank">${m.name}</div>
                <div class="account-number">${m.details}</div>
            </div>
        </div>
    `).join('');
}

// Select Account
function selectAccount(id) {
    document.querySelectorAll('.account-option').forEach(el => {
        el.classList.remove('selected');
        if (parseInt(el.dataset.id) === id) {
            el.classList.add('selected');
        }
    });
}

// Toggle Balance Visibility
function toggleBalance() {
    hideBalance = !hideBalance;
    const eyeIcon = document.getElementById('eye-icon');
    const balance = document.getElementById('available-balance');
    const total = document.getElementById('total-earnings');
    
    if (hideBalance) {
        balance.textContent = '₹••••••';
        total.textContent = '₹••••••';
        eyeIcon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
    } else {
        balance.textContent = '₹45,250.00';
        total.textContent = '₹1,24,850.00';
        eyeIcon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    }
}

// Update Summary Calculations
function updateSummary() {
    const available = 45250;
    const fee = available * 0.02;
    const receive = available - fee;
    
    document.getElementById('modal-balance').textContent = `₹${available.toLocaleString()}`;
    document.getElementById('modal-fee').textContent = `-₹${fee.toLocaleString()}`;
    document.getElementById('modal-receive').textContent = `₹${receive.toLocaleString()}`;
}

// Calculate Withdrawal
function calculateWithdrawal() {
    const input = document.getElementById('withdraw-amount');
    const confirmBtn = document.getElementById('confirm-withdraw');
    const amount = parseFloat(input.value) || 0;
    const available = 45250;
    
    const fee = amount * 0.02;
    const receive = amount - fee;
    
    if (amount >= 500 && amount <= available) {
        document.getElementById('modal-fee').textContent = `-₹${fee.toLocaleString()}`;
        document.getElementById('modal-receive').textContent = `₹${receive.toLocaleString()}`;
        confirmBtn.disabled = false;
    } else {
        confirmBtn.disabled = true;
    }
}

// Set Max Amount
function setMaxAmount() {
    document.getElementById('withdraw-amount').value = 45250;
    calculateWithdrawal();
}

// Modal Controls
function openWithdrawModal() {
    document.getElementById('withdraw-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    calculateWithdrawal();
}

function closeWithdrawModal() {
    document.getElementById('withdraw-modal').classList.add('hidden');
    document.body.style.overflow = '';
    document.getElementById('withdraw-amount').value = '';
    document.getElementById('withdraw-purpose').value = '';
    document.getElementById('confirm-withdraw').disabled = true;
}

function addNewMethod() {
    document.getElementById('method-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeMethodModal() {
    document.getElementById('method-modal').classList.add('hidden');
    document.body.style.overflow = '';
    // Reset form
    document.getElementById('account-name').value = '';
    document.getElementById('account-number').value = '';
    document.getElementById('ifsc-code').value = '';
    document.getElementById('bank-name').value = '';
    document.getElementById('upi-id').value = '';
    document.getElementById('primary-account').checked = false;
}

// Process Withdrawal
function processWithdrawal() {
    const amount = document.getElementById('withdraw-amount').value;
    closeWithdrawModal();
    showToast(`Withdrawal of ₹${parseInt(amount).toLocaleString()} initiated successfully`, 'success');
    
    // Add to transactions
    const selectedAccount = document.querySelector('.account-option.selected');
    const accountName = selectedAccount ? selectedAccount.querySelector('.account-bank').textContent : 'Bank Account';
    
    transactions.unshift({
        id: `TXN-${String(transactions.length + 1).padStart(3, '0')}`,
        title: `Withdrawal to ${accountName}`,
        type: 'withdrawal',
        amount: -parseFloat(amount),
        date: new Date().toISOString().split('T')[0],
        status: 'processing',
        method: accountName
    });
    
    currentPage = 1;
    renderTransactions();
    updatePagination();
}

// Save Method
function saveMethod() {
    const activeTab = document.querySelector('.method-tab.active').dataset.method;
    const name = document.getElementById('account-name').value;
    const isPrimary = document.getElementById('primary-account').checked;
    
    if (!name) {
        showToast('Please enter account holder name', 'error');
        return;
    }
    
    let newMethod;
    if (activeTab === 'bank') {
        const accNum = document.getElementById('account-number').value;
        const bankName = document.getElementById('bank-name').value;
        if (!accNum || !bankName) {
            showToast('Please fill all bank details', 'error');
            return;
        }
        newMethod = {
            id: Date.now(),
            type: 'bank',
            name: bankName,
            details: '****' + accNum.slice(-4),
            primary: isPrimary,
            icon: '🏦'
        };
    } else {
        const upiId = document.getElementById('upi-id').value;
        if (!upiId) {
            showToast('Please enter UPI ID', 'error');
            return;
        }
        newMethod = {
            id: Date.now(),
            type: 'upi',
            name: 'UPI',
            details: upiId,
            primary: isPrimary,
            icon: '💳'
        };
    }
    
    if (isPrimary) {
        withdrawalMethods.forEach(m => m.primary = false);
    }
    
    withdrawalMethods.push(newMethod);
    renderMethods();
    renderAccountOptions();
    closeMethodModal();
    showToast('Payment method added successfully', 'success');
}

// Set Primary Method
function setPrimary(id) {
    withdrawalMethods.forEach(m => m.primary = (m.id === id));
    renderMethods();
    showToast('Primary account updated', 'success');
}

// Delete Method
function deleteMethod(id) {
    if (confirm('Are you sure you want to remove this payment method?')) {
        withdrawalMethods = withdrawalMethods.filter(m => m.id !== id);
        renderMethods();
        renderAccountOptions();
        showToast('Payment method removed', 'success');
    }
}

// Toggle Auto Withdraw
function toggleAutoWithdraw() {
    const isEnabled = document.getElementById('auto-withdraw').checked;
    showToast(isEnabled ? 'Auto-withdrawal enabled' : 'Auto-withdrawal disabled', 'success');
}

// Show Toast
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const messageEl = document.getElementById('toast-message');
    
    toast.className = `toast ${type}`;
    messageEl.textContent = message;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Initialize Chart
function initChart() {
    const ctx = document.getElementById('earningsChart').getContext('2d');
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(139, 92, 246, 0.3)');
    gradient.addColorStop(1, 'rgba(139, 92, 246, 0)');
    
    earningsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Earnings',
                data: [12000, 19000, 15000, 25000, 22000, 30000, 28000],
                borderColor: '#8b5cf6',
                backgroundColor: gradient,
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#8b5cf6',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0a0a12',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return '₹' + context.parsed.y.toLocaleString();
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

// Setup Event Listeners
function setupEventListeners() {
    // Period selector
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            updateChartData(e.target.dataset.period);
        });
    });
    
    // Type filter
    document.getElementById('type-filter').addEventListener('change', () => {
        currentPage = 1;
        renderTransactions();
        updatePagination();
    });
    
    // Method tabs
    document.querySelectorAll('.method-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.method-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            
            const method = e.target.dataset.method;
            if (method === 'bank') {
                document.getElementById('bank-fields').classList.remove('hidden');
                document.getElementById('upi-fields').classList.add('hidden');
            } else {
                document.getElementById('bank-fields').classList.add('hidden');
                document.getElementById('upi-fields').classList.remove('hidden');
            }
        });
    });
}

// Update Chart Data
function updateChartData(period) {
    // Simulate different data for different periods
    const dataMap = {
        '7d': [12000, 19000, 15000, 25000, 22000, 30000, 28000],
        '30d': [45000, 52000, 48000, 61000, 55000, 72000, 68000, 75000, 82000, 79000],
        '90d': [120000, 135000, 128000, 152000, 148000, 175000, 168000],
        '1y': [450000, 520000, 480000, 610000, 550000, 720000]
    };
    
    const labelsMap = {
        '7d': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        '30d': ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        '90d': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
        '1y': ['Q1', 'Q2', 'Q3', 'Q4']
    };
    
    earningsChart.data.labels = labelsMap[period] || labelsMap['7d'];
    earningsChart.data.datasets[0].data = dataMap[period] || dataMap['7d'];
    earningsChart.update();
}

// Export Transactions
function exportTransactions() {
    showToast('Transactions exported to CSV', 'success');
}

// Show Help
function showHelp() {
    showToast('Contact support at payouts@nexus.com', 'success');
}

// Close modals on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeWithdrawModal();
        closeMethodModal();
    }
});