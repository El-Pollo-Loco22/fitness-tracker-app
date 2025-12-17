/* ===========================
   SUPABASE CLIENT INITIALIZATION
   Web Browser Version (No Build Required)
   =========================== */

// Import Supabase client from CDN (loaded via script tag in index.html)
// Access the supabase object from the global window

// Initialize Supabase client
const { createClient } = supabase;
const supabaseClient = createClient(
    SUPABASE_CONFIG.url,
    SUPABASE_CONFIG.anonKey
);

// Auth state management
let currentUser = null;
let authInitialized = false;

// Initialize auth listener
async function initializeAuth() {
    // Get current session
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session) {
        currentUser = session.user;
        await onAuthStateChange(true);
    }

    // Listen for auth changes
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth event:', event);

        if (event === 'SIGNED_IN' && session) {
            currentUser = session.user;
            await onAuthStateChange(true);
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            await onAuthStateChange(false);
        }
    });

    authInitialized = true;
}

// Handle auth state changes
async function onAuthStateChange(isSignedIn) {
    const authModal = document.getElementById('auth-modal');
    const appContent = document.getElementById('app-content');
    const signOutBtn = document.getElementById('sign-out-btn');
    const syncStatus = document.getElementById('sync-status');

    if (isSignedIn) {
        // Hide auth modal, show app
        if (authModal) authModal.style.display = 'none';
        if (appContent) appContent.style.display = 'block';
        if (signOutBtn) signOutBtn.style.display = 'flex';
        if (syncStatus) syncStatus.style.display = 'flex';

        // Load user profile and data (with error handling)
        try {
            if (typeof loadUserProfile === 'function') {
                await loadUserProfile();
            }
        } catch (error) {
            console.warn('Error loading user profile:', error);
        }

        try {
            if (typeof syncCloudToLocal === 'function') {
                await syncCloudToLocal();
            }
        } catch (error) {
            console.warn('Error syncing cloud data:', error);
        }

        // Re-render current view with synced data
        try {
            if (typeof renderCurrentView === 'function') {
                renderCurrentView();
            }
        } catch (error) {
            console.warn('Error rendering view:', error);
        }
    } else {
        // Show auth modal, hide app
        if (authModal) authModal.style.display = 'flex';
        if (appContent) appContent.style.display = 'none';
        if (signOutBtn) signOutBtn.style.display = 'none';
        if (syncStatus) syncStatus.style.display = 'none';
    }
}

// Export for use in other files
window.supabase = supabaseClient;
window.getCurrentUser = () => currentUser;
window.isAuthenticated = () => !!currentUser;
