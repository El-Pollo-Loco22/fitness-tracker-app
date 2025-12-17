/* ===========================
   AUTHENTICATION EVENT HANDLERS
   Handles auth UI interactions
   =========================== */

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    setupAuthHandlers();
    initializeAuth();
});

function setupAuthHandlers() {
    // Tab switching
    const tabSignIn = document.getElementById('tab-signin');
    const tabSignUp = document.getElementById('tab-signup');
    const signInForm = document.getElementById('signin-form');
    const signUpForm = document.getElementById('signup-form');

    if (tabSignIn && tabSignUp) {
        tabSignIn.addEventListener('click', () => {
            tabSignIn.classList.add('active');
            tabSignUp.classList.remove('active');
            signInForm.style.display = 'flex';
            signUpForm.style.display = 'none';
        });

        tabSignUp.addEventListener('click', () => {
            tabSignUp.classList.add('active');
            tabSignIn.classList.remove('active');
            signUpForm.style.display = 'flex';
            signInForm.style.display = 'none';
        });
    }

    // Sign In Form
    if (signInForm) {
        signInForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('signin-email').value;
            const password = document.getElementById('signin-password').value;
            const errorDiv = document.getElementById('signin-error');
            const btnText = document.getElementById('signin-btn-text');
            const spinner = document.getElementById('signin-spinner');

            // Show loading
            btnText.style.display = 'none';
            spinner.style.display = 'inline-block';
            errorDiv.style.display = 'none';

            try {
                const result = await signInWithEmail(email, password);

                if (result.success) {
                    // Success! Auth state change will handle UI updates
                    console.log('✅ Signed in successfully');
                    // The auth state listener will hide modal and show app
                    // Keep spinner showing until auth state changes
                } else {
                    // Show error and reset button
                    errorDiv.textContent = result.error;
                    errorDiv.style.display = 'block';
                    btnText.style.display = 'inline';
                    spinner.style.display = 'none';
                }
            } catch (error) {
                // Handle unexpected errors
                console.error('Unexpected sign-in error:', error);
                errorDiv.textContent = 'An unexpected error occurred. Please try again.';
                errorDiv.style.display = 'block';
                btnText.style.display = 'inline';
                spinner.style.display = 'none';
            }
        });
    }

    // Sign Up Form
    if (signUpForm) {
        signUpForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const confirmPassword = document.getElementById('signup-confirm-password').value;
            const errorDiv = document.getElementById('signup-error');
            const btnText = document.getElementById('signup-btn-text');
            const spinner = document.getElementById('signup-spinner');

            // Validate passwords match
            if (password !== confirmPassword) {
                errorDiv.textContent = 'Passwords do not match';
                errorDiv.style.display = 'block';
                return;
            }

            // Show loading
            btnText.style.display = 'none';
            spinner.style.display = 'inline-block';
            errorDiv.style.display = 'none';

            const result = await signUpWithEmail(email, password);

            if (result.success) {
                // Success! Show message and switch to sign in
                alert('Account created! Please check your email to verify your account, then sign in.');
                tabSignIn.click(); // Switch to sign in tab
                signUpForm.reset();
            } else {
                // Show error
                errorDiv.textContent = result.error;
                errorDiv.style.display = 'block';
            }

            btnText.style.display = 'inline';
            spinner.style.display = 'none';
        });
    }

    // Sign Out Button
    const signOutBtn = document.getElementById('sign-out-btn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', async () => {
            const result = await signOut();
            if (result.success) {
                console.log('✅ Signed out successfully');
            }
        });
    }
}

// Sync status updates
function updateSyncStatus(status, message) {
    const syncStatus = document.getElementById('sync-status');
    const syncText = document.getElementById('sync-text') || syncStatus.querySelector('.sync-text');

    if (!syncStatus) return;

    syncStatus.style.display = 'flex';
    syncStatus.className = 'sync-status';

    if (status === 'syncing') {
        syncStatus.classList.add('syncing');
        if (syncText) syncText.textContent = message || 'Syncing...';
    } else if (status === 'synced') {
        if (syncText) syncText.textContent = message || 'Synced';
        // Hide after 3 seconds
        setTimeout(() => {
            syncStatus.style.display = 'none';
        }, 3000);
    } else if (status === 'error') {
        syncStatus.classList.add('error');
        if (syncText) syncText.textContent = message || 'Sync Error';
    }
}

// Export for use by other modules
window.updateSyncStatus = updateSyncStatus;
