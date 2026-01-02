// auth.js - Fixed Supabase Authentication System

let supabase;
let supabaseReady = false;

// Simple password hashing (same algorithm for consistency)
function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
}

// Initialize Supabase client and wait for it to be ready
async function initSupabase() {
    if (supabaseReady) return supabase;
    
    const SUPABASE_URL = "https://hjpjtufobzttssidfexf.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqcGp0dWZvYnp0dHNzaWRmZXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MTY0OTQsImV4cCI6MjA3OTM5MjQ5NH0.xAAAGortVAhOIeKoMyWNvJDrc0kr0FjfTzn3V99wFS0";
    
    try {
        // Load Supabase from CDN if not already loaded
        if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
            console.log('📦 Loading Supabase from CDN...');
            
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/dist/umd/supabase.js';
                script.async = false;
                
                script.onload = () => {
                    console.log('✅ Supabase script loaded');
                    // Wait a bit for the global to be available
                    setTimeout(() => {
                        if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
                            console.log('✅ Supabase global available');
                            resolve();
                        } else {
                            reject(new Error('Supabase global not available after script load'));
                        }
                    }, 200);
                };
                
                script.onerror = () => {
                    reject(new Error('Failed to load Supabase script'));
                };
                
                document.head.appendChild(script);
            });
        }
        
        // Create client
        if (!window.supabase || !window.supabase.createClient) {
            throw new Error('Supabase library not loaded properly');
        }
        
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        supabaseReady = true;
        console.log('✅ Supabase initialized successfully');
        return supabase;
    } catch (error) {
        console.error('❌ Failed to initialize Supabase:', error);
        throw error;
    }
}

// Authentication functions
const Auth = {
    // Check if user is logged in
    isLoggedIn() {
        const user = localStorage.getItem('currentUser');
        return user !== null;
    },

    // Get current user
    getCurrentUser() {
        const user = localStorage.getItem('currentUser');
        return user ? JSON.parse(user) : null;
    },

    // Signup function with Supabase
    async signup(email, password, confirmPassword) {
        try {
            // Ensure Supabase is initialized
            await initSupabase();
            
            // Validation
            if (!email || !password || !confirmPassword) {
                return { success: false, message: 'Please fill all fields' };
            }

            if (password !== confirmPassword) {
                return { success: false, message: 'Passwords do not match!' };
            }

            if (password.length < 6) {
                return { success: false, message: 'Password must be at least 6 characters!' };
            }

            // Check if email is valid
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return { success: false, message: 'Invalid email!' };
            }

            // Check if user already exists
            const { data: existing, error: checkError } = await supabase
                .from('users')
                .select('email')
                .eq('email', email)
                .maybeSingle();

            if (checkError && checkError.code !== 'PGRST116') {
                console.error('Check error:', checkError);
                return { success: false, message: 'Error checking existing user' };
            }

            if (existing) {
                return { success: false, message: 'Email is already registered!' };
            }

            // Hash password
            const hashedPassword = hashPassword(password);

            // Insert new user
            const { data, error } = await supabase
                .from('users')
                .insert([
                    { 
                        email: email, 
                        password: hashedPassword,
                        is_admin: false,
                        created_at: new Date().toISOString()
                    }
                ])
                .select();

            if (error) {
                console.error('Signup error:', error);
                return { success: false, message: `Signup failed: ${error.message}` };
            }

            console.log('✅ User created successfully:', data);
            return { success: true, message: 'Signup successful! Please log in.' };
        } catch (error) {
            console.error('Signup exception:', error);
            return { success: false, message: 'Signup failed. Please check console for errors.' };
        }
    },

    // Login function with Supabase
    async login(email, password) {
        try {
            // Ensure Supabase is initialized
            await initSupabase();
            
            const hashedPassword = hashPassword(password);

            console.log('🔍 Attempting login for:', email);
            console.log('🔑 Hashed password:', hashedPassword);

            // Check user credentials
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .eq('password', hashedPassword)
                .maybeSingle();

            if (error) {
                console.error('Login error:', error);
                return { success: false, message: 'Login failed. Please try again.' };
            }

            if (!data) {
                console.log('❌ No user found with these credentials');
                
                // Debug: Check if user exists with this email
                const { data: emailCheck } = await supabase
                    .from('users')
                    .select('email, is_admin')
                    .eq('email', email)
                    .maybeSingle();
                
                if (emailCheck) {
                    console.log('📧 User exists but password incorrect');
                } else {
                    console.log('📧 No user with this email');
                }
                
                return { success: false, message: 'Incorrect email or password!' };
            }

            console.log('✅ User found:', {
                id: data.id,
                email: data.email,
                is_admin: data.is_admin,
                is_admin_type: typeof data.is_admin
            });

            // Store user in localStorage with proper admin status
            const user = {
                id: data.id,
                email: data.email,
                isAdmin: data.is_admin === true || data.is_admin === 1 || data.is_admin === '1',
                loginTime: new Date().toISOString()
            };
            
            localStorage.setItem('currentUser', JSON.stringify(user));
            
            console.log('✅ Login successful! User stored:', user);
            console.log('👑 Admin status:', user.isAdmin);
            
            return { success: true, message: 'Login successful!' };
        } catch (error) {
            console.error('Login exception:', error);
            return { success: false, message: 'Login failed. Please check console for errors.' };
        }
    },

    // Logout function
    logout() {
        localStorage.removeItem('currentUser');
        console.log('👋 User logged out');
    },

    // Check if user is admin
    isAdmin() {
        const user = this.getCurrentUser();
        if (!user) {
            console.log('👤 No user logged in');
            return false;
        }
        
        const adminStatus = user.isAdmin === true || user.isAdmin === 1 || user.isAdmin === '1';
        console.log('👤 Admin check:', { 
            user, 
            isAdmin: user.isAdmin,
            isAdminType: typeof user.isAdmin,
            adminStatus 
        });
        return adminStatus;
    }
};

// UI Update functions
function updateAuthUI() {
    const authSection = document.getElementById('auth-section');
    const userSection = document.getElementById('user-section');
    const userEmail = document.getElementById('user-email');

    if (Auth.isLoggedIn()) {
        const user = Auth.getCurrentUser();
        console.log('🔄 Updating UI for user:', user);
        
        if (authSection) authSection.style.display = 'none';
        if (userSection) userSection.style.display = 'flex';
        
        // Show admin badge if user is admin
        const isAdmin = Auth.isAdmin();
        if (isAdmin) {
            if (userEmail) userEmail.textContent = user.email + ' 👑';
            console.log('👑 Admin UI displayed');
        } else {
            if (userEmail) userEmail.textContent = user.email;
            console.log('👤 Regular user UI displayed');
        }
    } else {
        console.log('🔄 No user logged in, showing auth buttons');
        if (authSection) authSection.style.display = 'flex';
        if (userSection) userSection.style.display = 'none';
    }
}

// Login Modal
function showLoginModal() {
    const modal = document.createElement('div');
    modal.className = 'auth-modal';
    modal.innerHTML = `
        <div class="auth-modal-content">
            <span class="close-modal">&times;</span>
            <h2>Login</h2>
            <form id="login-form">
                <input type="email" id="login-email" placeholder="Email" required>
                <input type="password" id="login-password" placeholder="Password" required>
                <button type="submit" class="btn btn-primary">Login</button>
                <p id="login-error" class="error-message"></p>
                <p id="login-loading" style="display: none; text-align: center; color: #666;">Loading...</p>
            </form>
            <p style="text-align: center; margin-top: 15px; color: #666;">
                Don't have an account? <a href="#" id="switch-to-signup" style="color: #2196F3;">Sign up here</a>
            </p>
        </div>
    `;
    document.body.appendChild(modal);

    // Close modal
    modal.querySelector('.close-modal').onclick = () => modal.remove();
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };

    // Switch to signup
    document.getElementById('switch-to-signup').onclick = (e) => {
        e.preventDefault();
        modal.remove();
        showSignupModal();
    };

    // Handle form submission
    document.getElementById('login-form').onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');
        const loadingEl = document.getElementById('login-loading');
        
        errorEl.textContent = '';
        loadingEl.style.display = 'block';
        
        const result = await Auth.login(email, password);
        
        loadingEl.style.display = 'none';
        
        if (result.success) {
            modal.remove();
            updateAuthUI();
            alert(result.message);
            // Reload page to apply admin features
            window.location.reload();
        } else {
            errorEl.textContent = result.message;
        }
    };
}

// Signup Modal
function showSignupModal() {
    const modal = document.createElement('div');
    modal.className = 'auth-modal';
    modal.innerHTML = `
        <div class="auth-modal-content">
            <span class="close-modal">&times;</span>
            <h2>Create New Account</h2>
            <form id="signup-form">
                <input type="email" id="signup-email" placeholder="Email" required>
                <input type="password" id="signup-password" placeholder="Password (min 6 characters)" required>
                <input type="password" id="signup-confirm" placeholder="Confirm Password" required>
                <button type="submit" class="btn btn-primary">Sign Up</button>
                <p id="signup-error" class="error-message"></p>
                <p id="signup-loading" style="display: none; text-align: center; color: #666;">Loading...</p>
            </form>
            <p style="text-align: center; margin-top: 15px; color: #666;">
                Already have an account? <a href="#" id="switch-to-login" style="color: #2196F3;">Login here</a>
            </p>
        </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('.close-modal').onclick = () => modal.remove();
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };

    // Switch to login
    document.getElementById('switch-to-login').onclick = (e) => {
        e.preventDefault();
        modal.remove();
        showLoginModal();
    };

    // Handle form submission
    document.getElementById('signup-form').onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirm = document.getElementById('signup-confirm').value;
        const errorEl = document.getElementById('signup-error');
        const loadingEl = document.getElementById('signup-loading');
        
        errorEl.textContent = '';
        loadingEl.style.display = 'block';
        
        const result = await Auth.signup(email, password, confirm);
        
        loadingEl.style.display = 'none';
        
        if (result.success) {
            modal.remove();
            alert(result.message);
            showLoginModal();
        } else {
            errorEl.textContent = result.message;
        }
    };
}

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initializing authentication...');
    
    try {
        await initSupabase();
        updateAuthUI();
        
        // Login button
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.onclick = showLoginModal;
        }

        // Signup button
        const signupBtn = document.getElementById('signup-btn');
        if (signupBtn) {
            signupBtn.onclick = showSignupModal;
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.onclick = () => {
                if (confirm('Are you sure you want to logout?')) {
                    Auth.logout();
                    updateAuthUI();
                    alert('You have been logged out.');
                    
                    // Redirect to home if on post page
                    if (window.location.pathname.includes('post.html')) {
                        window.location.href = '../index.html';
                    } else {
                        window.location.reload();
                    }
                }
            };
        }
    } catch (error) {
        console.error('❌ Failed to initialize auth:', error);
    }
});

// Export for use in other pages
window.Auth = Auth;
window.updateAuthUI = updateAuthUI;