// ==========================================
// NEXUS GLOBAL TELEMETRY BEACON (v1.0)
// This script intercepts device-level crashes
// and beams hardware footprints to the admin vault.
// ==========================================

(function() {
    const TELEMETRY_BACKEND = 'https://nexus-dashboard-backend.onrender.com/api/telemetry/crash';
    
    // Attempt to identify the app context
    let appName = 'Unknown App';
    if (window.location.hostname.includes('reseat-host') || document.title.includes('Host')) {
        appName = 'Nexus Host Portal';
    } else if (window.location.hostname.includes('dashboard') || document.title.includes('Admin')) {
        appName = 'Nexus Admin Dashboard';
    } else {
        appName = 'Nexus User App';
    }

    // Try to safely extract User ID if they are logged in via standard tokens
    function getUserId() {
        try {
            return localStorage.getItem('nexus_auth_uid') || localStorage.getItem('nexus_host_uid') || 'Anonymous User';
        } catch(e) { return 'Unknown'; }
    }

    function getHardwareFootprint() {
        return `${navigator.platform} | ${navigator.userAgent.substring(0, 100)}... | Cores: ${navigator.hardwareConcurrency || '?'}`;
    }

    function transmitSOS(payload) {
        try {
            fetch(TELEMETRY_BACKEND, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).catch(() => {}); // Intentionally silent to prevent loop
        } catch(e) {}
    }

    // 1. Intercept Standard JS Syntax/Runtime Errors
    window.addEventListener('error', function(event) {
        transmitSOS({
            appName: appName,
            type: 'runtime_error',
            message: event.message,
            stack: event.error ? event.error.stack : 'No Stack',
            url: window.location.href,
            hardware: getHardwareFootprint(),
            userId: getUserId()
        });
    });

    // 2. Intercept Failed Promises & API Dead Ends
    window.addEventListener('unhandledrejection', function(event) {
        transmitSOS({
            appName: appName,
            type: 'promise_rejection',
            message: event.reason ? event.reason.toString() : 'Unknown Async Rejection',
            stack: 'Promise Rejection',
            url: window.location.href,
            hardware: getHardwareFootprint(),
            userId: getUserId()
        });
    });

    console.log('[Nexus Telemetry Beacon Active]');
})();
