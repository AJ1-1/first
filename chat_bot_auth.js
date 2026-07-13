// ============================================================
// chat_bot_auth.js — Authentication Module
// Handles Login and Registration for the Chatbot
// ============================================================

// ============================================================
// DOM ELEMENTS
// ============================================================
const authScreen = document.getElementById('authScreen');
const chatApp = document.getElementById('chatApp');

// Toggle buttons
const toggleLoginBtn = document.getElementById('toggleLoginBtn');
const toggleRegisterBtn = document.getElementById('toggleRegisterBtn');

// Forms
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

// Login form elements
const loginUsernameInput = document.getElementById('loginUsernameInput');
const loginPasswordInput = document.getElementById('loginPasswordInput');
const loginTogglePassword = document.getElementById('loginTogglePassword');
const loginError = document.getElementById('loginError');
const loginBtn = document.getElementById('loginBtn');
const loginBtnText = document.getElementById('loginBtnText');
const loginSpinner = document.getElementById('loginSpinner');

// Register form elements
const fullNameInput = document.getElementById('fullNameInput');
const regUsernameInput = document.getElementById('regUsernameInput');
const departmentInput = document.getElementById('departmentInput');
const levelInput = document.getElementById('levelInput');
const regPasswordInput = document.getElementById('regPasswordInput');
const confirmPasswordInput = document.getElementById('confirmPasswordInput');
const regTogglePassword = document.getElementById('regTogglePassword');
const confirmTogglePassword = document.getElementById('confirmTogglePassword');
const registerError = document.getElementById('registerError');
const registerBtn = document.getElementById('registerBtn');
const registerBtnText = document.getElementById('registerBtnText');
const registerSpinner = document.getElementById('registerSpinner');

const logoutBtn = document.getElementById('logoutBtn');

// ============================================================
// AUTHENTICATION MANAGER
// ============================================================

class AuthManager {
  constructor() {
    this.currentUser = this.loadFromSession();
    this.setupEventListeners();
    
    // If user is already logged in, show chat app
    if (this.currentUser) {
      this.showChatApp();
    }
  }

  // ============================================================
  // SESSION MANAGEMENT
  // ============================================================

  saveToSession(user) {
    sessionStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUser = user;
  }

  loadFromSession() {
    const stored = sessionStorage.getItem('currentUser');
    return stored ? JSON.parse(stored) : null;
  }

  clearSession() {
    sessionStorage.removeItem('currentUser');
    this.currentUser = null;
  }

  // ============================================================
  // EVENT LISTENERS SETUP
  // ============================================================

  setupEventListeners() {
    // Toggle between login and register
    toggleLoginBtn.addEventListener('click', () => this.switchToLogin());
    toggleRegisterBtn.addEventListener('click', () => this.switchToRegister());

    // Form submissions
    loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    registerForm.addEventListener('submit', (e) => this.handleRegister(e));

    // Password visibility toggles
    loginTogglePassword.addEventListener('click', (e) => {
      e.preventDefault();
      this.togglePasswordVisibility(loginPasswordInput);
    });

    regTogglePassword.addEventListener('click', (e) => {
      e.preventDefault();
      this.togglePasswordVisibility(regPasswordInput);
    });

    confirmTogglePassword.addEventListener('click', (e) => {
      e.preventDefault();
      this.togglePasswordVisibility(confirmPasswordInput);
    });

    // Logout
    logoutBtn.addEventListener('click', () => this.handleLogout());
  }

  // ============================================================
  // FORM SWITCHING
  // ============================================================

  switchToLogin() {
    toggleLoginBtn.classList.add('active');
    toggleRegisterBtn.classList.remove('active');
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
    loginError.textContent = '';
    registerError.textContent = '';
  }

  switchToRegister() {
    toggleLoginBtn.classList.remove('active');
    toggleRegisterBtn.classList.add('active');
    loginForm.classList.remove('active');
    registerForm.classList.add('active');
    loginError.textContent = '';
    registerError.textContent = '';
  }

  // ============================================================
  // PASSWORD VISIBILITY TOGGLE
  // ============================================================

  togglePasswordVisibility(input) {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
  }

  // ============================================================
  // LOGIN HANDLER
  // ============================================================

  async handleLogin(e) {
    e.preventDefault();

    const username = loginUsernameInput.value.trim();
    const password = loginPasswordInput.value.trim();

    // Clear previous error
    loginError.textContent = '';

    // Validation
    if (!username || !password) {
      loginError.textContent = 'Please enter both username and password.';
      return;
    }

    // Show loading state
    loginBtn.disabled = true;
    loginBtnText.classList.add('hidden');
    loginSpinner.classList.remove('hidden');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Save user to session and show chat
        this.saveToSession(data.user);
        this.showChatApp();
        
        // Reset form
        loginForm.reset();
      } else {
        loginError.textContent = data.message || 'Login failed. Please try again.';
      }
    } catch (error) {
      console.error('[LOGIN ERROR]', error);
      loginError.textContent = 'An error occurred. Please try again.';
    } finally {
      loginBtn.disabled = false;
      loginBtnText.classList.remove('hidden');
      loginSpinner.classList.add('hidden');
    }
  }

  // ============================================================
  // REGISTRATION HANDLER
  // ============================================================

  async handleRegister(e) {
    e.preventDefault();

    const fullName = fullNameInput.value.trim();
    const username = regUsernameInput.value.trim();
    const department = departmentInput.value.trim();
    const level = levelInput.value.trim();
    const password = regPasswordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();

    // Clear previous error
    registerError.textContent = '';

    // Validation
    if (!fullName || !username || !department || !level || !password || !confirmPassword) {
      registerError.textContent = 'All fields are required.';
      return;
    }

    if (username.length < 4) {
      registerError.textContent = 'Username must be at least 4 characters long.';
      return;
    }

    if (password.length < 6) {
      registerError.textContent = 'Password must be at least 6 characters long.';
      return;
    }

    if (password !== confirmPassword) {
      registerError.textContent = 'Passwords do not match.';
      return;
    }

    // Show loading state
    registerBtn.disabled = true;
    registerBtnText.classList.add('hidden');
    registerSpinner.classList.remove('hidden');

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          username,
          department,
          level,
          password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Show success message and switch to login
        registerError.classList.add('success');
        registerError.textContent = 'Account created successfully! You can now login.';
        
        // Reset form and switch to login after 2 seconds
        setTimeout(() => {
          registerForm.reset();
          this.switchToLogin();
          registerError.classList.remove('success');
        }, 2000);
      } else {
        registerError.textContent = data.message || 'Registration failed. Please try again.';
      }
    } catch (error) {
      console.error('[REGISTER ERROR]', error);
      registerError.textContent = 'An error occurred during registration.';
    } finally {
      registerBtn.disabled = false;
      registerBtnText.classList.remove('hidden');
      registerSpinner.classList.add('hidden');
    }
  }

  // ============================================================
  // UI STATE MANAGEMENT
  // ============================================================

  showChatApp() {
    authScreen.classList.add('hidden');
    chatApp.classList.remove('hidden');
    
    // Update sidebar with user info
    if (this.currentUser) {
      document.getElementById('sidebarUserName').textContent = this.currentUser.fullName || this.currentUser.username;
      document.getElementById('sidebarUserDept').textContent = this.currentUser.department || 'Student';
      document.getElementById('userAvatar').textContent = (this.currentUser.fullName || this.currentUser.username)[0].toUpperCase();
    }
  }

  showAuthScreen() {
    authScreen.classList.remove('hidden');
    chatApp.classList.add('hidden');
    this.switchToLogin(); // Reset to login screen
  }

  // ============================================================
  // LOGOUT HANDLER
  // ============================================================

  handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
      this.clearSession();
      this.showAuthScreen();
    }
  }
}

// Initialize auth manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.authManager = new AuthManager();
});
