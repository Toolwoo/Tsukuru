// auth.js - Supabase Authentication System
// This version stores users in Supabase database instead of localStorage

// Import Supabase (make sure this runs after Supabase is loaded)
let supabase;

// Simple password hashing (for basic security)
function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
}

// Initialize Supabase client
function initSupabase() {
    const SUPABASE_URL = "https://hjpjtufobzttssidfexf.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqcGp0dWZvYnp0dHNzaWRmZXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MTY0OTQsImV4cCI6MjA3OTM5MjQ5NH0.xAAAGortVAhOIeKoMyWNvJDrc0kr0FjfTzn3V99wFS0";
    
    // Use the global supabase if available, otherwise create a new client
    if (window.supabaseClient) {
        supabase = window.supabaseClient;
    } else {
        // Dynamically import Supabase
        import('https://cdn.skypack.dev/@supabase/supabase-js')
            .then(module => {
                supabase = module.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                window.supabaseClient = supabase;
            });
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
            .single();

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
                    is_admin: false
                }
            ]);

        if (error) {
            console.error('Signup error:', error);
            return { success: false, message: 'Signup failed. Please try again.' };
        }

        return { success: true, message: 'Signup successful! Please log in.' };
    },

    // Login function with Supabase
    async login(email, password) {
        const hashedPassword = hashPassword(password);

        // Check user credentials
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .eq('password', hashedPassword)
            .single();

        if (error || !data) {
            return { success: false, message: 'Incorrect email or password!' };
        }

        // Store user in localStorage
        const user = {
            id: data.id,
            email: data.email,
            isAdmin: data.is_admin,
            loginTime: new Date().toISOString()
        };
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        return { success: true, message: 'Login successful!' };
    },

    // Logout function
    logout() {
        localStorage.removeItem('currentUser');
    },

    // Check if user is admin
    isAdmin() {
        const user = this.getCurrentUser();
        return user && user.isAdmin === true;
    }
};

// UI Update functions
function updateAuthUI() {
    const authSection = document.getElementById('auth-section');
    const userSection = document.getElementById('user-section');
    const userEmail = document.getElementById('user-email');

    if (Auth.isLoggedIn()) {
        const user = Auth.getCurrentUser();
        authSection.style.display = 'none';
        userSection.style.display = 'flex';
        
        // Show admin badge if user is admin
        if (user.isAdmin) {
            userEmail.textContent = user.email + ' 👑';
        } else {
            userEmail.textContent = user.email;
        }
    } else {
        authSection.style.display = 'flex';
        userSection.style.display = 'none';
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
document.addEventListener('DOMContentLoaded', () => {
    initSupabase();
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
            if (confirm('Adakah anda pasti mahu log keluar?')) {
                Auth.logout();
                updateAuthUI();
                alert('Anda telah log keluar.');
                
                // Redirect to home if on post page
                if (window.location.pathname.includes('post.html')) {
                    window.location.href = '../index.html';
                }
            }
        };
    }
});

// Export for use in other pages
window.Auth = Auth;
