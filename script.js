// API base URL: use Render backend when not on localhost (e.g. when on Vercel)
const API_BASE = window.location.hostname === 'localhost' ? '' : 'https://webs1-szxu.onrender.com';

// Set current year in footer
const yearSpan = document.getElementById('year');
if (yearSpan) {
  yearSpan.textContent = new Date().getFullYear();
}

const authModal = document.getElementById('auth-modal');
const authBackdrop = document.getElementById('auth-backdrop');
const authClose = document.getElementById('auth-close');
const navLogin = document.getElementById('nav-login');
const navSignup = document.getElementById('nav-signup');
const navLogout = document.getElementById('nav-logout');
const tabs = document.querySelectorAll('.auth-tab');
const panels = document.querySelectorAll('.auth-panel');
const inlineSwitches = document.querySelectorAll('.auth-inline-switch');

function openAuth(which) {
  if (!authModal) return;
  authModal.classList.add('is-open');
  setActivePanel(which);
}

function closeAuth() {
  if (!authModal) return;
  authModal.classList.remove('is-open');
}

function setActivePanel(which) {
  panels.forEach((panel) => {
    panel.classList.toggle('active', panel.classList.contains(`auth-panel-${which}`));
  });
  tabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.target === which);
  });
}

navLogin?.addEventListener('click', (e) => {
  e.preventDefault();
  openAuth('login');
});

navSignup?.addEventListener('click', (e) => {
  e.preventDefault();
  openAuth('signup');
});

authClose?.addEventListener('click', closeAuth);
authBackdrop?.addEventListener('click', closeAuth);

tabs.forEach((tab) => {
  tab.addEventListener('click', () => setActivePanel(tab.dataset.target || 'login'));
});

inlineSwitches.forEach((btn) => {
  btn.addEventListener('click', () => setActivePanel(btn.dataset.target || 'signup'));
});

// Default active panel when page loads
setActivePanel('signup');

// Handle signup form submit -> save user in database via backend
const signupForm = document.getElementById('signup-form');
const signupError = document.getElementById('signup-error');
const signupSubmit = document.getElementById('signup-submit');

signupForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const fullName = document.getElementById('signup-fullname')?.value.trim();
  const username = document.getElementById('signup-username')?.value.trim();
  const email = document.getElementById('signup-email')?.value.trim();
  const phone = document.getElementById('signup-phone')?.value.trim();
  const password = document.getElementById('signup-password')?.value;

  if (signupError) signupError.textContent = '';

  if (!fullName || !username || !email || !phone || !password) {
    if (signupError) signupError.textContent = 'Please fill in all fields.';
    return;
  }

  // Split full name into first/last for the DB
  const parts = fullName.split(' ').filter(Boolean);
  const firstName = parts[0] || fullName;
  const lastName = parts.slice(1).join(' ') || '-';

  // Backend still expects age and countryCode – supply safe defaults
  const age = 18;
  const countryCode = '+30';

  try {
    signupSubmit?.classList.add('is-loading');
    if (signupSubmit) signupSubmit.disabled = true;
    const res = await fetch(`${API_BASE}/api/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName,
        lastName,
        age,
        username,
        email,
        phone,
        countryCode,
        password,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      if (signupError) signupError.textContent = data.message || 'Failed to create account.';
      return;
    }

    signupForm.reset();
    closeAuth();
  } catch (err) {
    console.error('Signup error:', err);
    if (signupError) signupError.textContent = 'Something went wrong. Please try again.';
  } finally {
    signupSubmit?.classList.remove('is-loading');
    if (signupSubmit) signupSubmit.disabled = false;
  }
});

// Handle login form -> check admin and toggle admin view
const loginForm = document.querySelector('.auth-panel-login form');
const loginError = document.getElementById('login-error');
const loginSubmit = document.getElementById('login-submit');

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const usernameInput = document.getElementById('login-username');
  const passwordInput = document.getElementById('login-password');
  const username = usernameInput?.value.trim();
  const password = passwordInput?.value;

  if (loginError) loginError.textContent = '';

  if (!username || !password) {
    if (loginError) loginError.textContent = 'Please fill in username and password.';
    return;
  }

  try {
    loginSubmit?.classList.add('is-loading');
    if (loginSubmit) loginSubmit.disabled = true;
    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      if (loginError) loginError.textContent = data.message || 'Login failed.';
      return;
    }

    const isAdmin = username.toLowerCase() === 'admin13' || !!data.isAdmin;
    setAdminMode(isAdmin);
    setWelcomeName(username);
    setLoggedInUI(true);
    closeAuth();
  } catch (err) {
    console.error('Login error:', err);
    if (loginError) loginError.textContent = 'Something went wrong. Please try again.';
  } finally {
    loginSubmit?.classList.remove('is-loading');
    if (loginSubmit) loginSubmit.disabled = false;
  }
});

function setLoggedInUI(isLoggedIn) {
  if (isLoggedIn) {
    navLogin?.classList.add('hidden');
    navSignup?.classList.add('hidden');
    navLogout?.classList.remove('hidden');
  } else {
    navLogin?.classList.remove('hidden');
    navSignup?.classList.remove('hidden');
    navLogout?.classList.add('hidden');
  }
}

navLogout?.addEventListener('click', () => {
  setWelcomeName('');
  setAdminMode(false);
  setLoggedInUI(false);
  if (loginError) loginError.textContent = '';
  if (signupError) signupError.textContent = '';
});

function setWelcomeName(name) {
  const welcomeEl = document.getElementById('welcome-text');
  if (welcomeEl) {
    welcomeEl.textContent = name ? `Welcome, ${name}` : '';
  }
  if (name) {
    localStorage.setItem('welcomeName', name);
  } else {
    localStorage.removeItem('welcomeName');
  }
}

function setAdminMode(isAdmin) {
  const adminEls = document.querySelectorAll('.admin-only');
  adminEls.forEach((el) => {
    if (isAdmin) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });

  if (isAdmin) {
    localStorage.setItem('isAdmin', 'true');
    loadUsers();
  } else {
    localStorage.removeItem('isAdmin');
  }
}

// Load users table from backend
async function loadUsers() {
  const tbody = document.getElementById('users-table-body');
  const empty = document.getElementById('users-empty');
  if (!tbody || !empty) return;

  try {
    const res = await fetch(`${API_BASE}/api/users`);
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success || !Array.isArray(data.users)) {
      empty.textContent = 'Failed to load users.';
      empty.style.display = 'block';
      tbody.innerHTML = '';
      return;
    }

    const users = data.users;
    if (users.length === 0) {
      empty.textContent = 'No users yet. Create an account to see it here.';
      empty.style.display = 'block';
      tbody.innerHTML = '';
      return;
    }

    empty.style.display = 'none';
    tbody.innerHTML = users
      .map((u) => {
        const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ');
        return `
          <tr data-user-id="${u.id}">
            <td>${u.id}</td>
            <td>${fullName}</td>
            <td>${u.username}</td>
            <td>${u.email}</td>
            <td>${u.phone}</td>
            <td>${u.countryCode}</td>
            <td>${u.age}</td>
            <td>
              <button type="button" class="user-delete-btn" data-id="${u.id}">Delete</button>
            </td>
          </tr>
        `;
      })
      .join('');
  } catch (err) {
    console.error('Load users error:', err);
    empty.textContent = 'Failed to load users.';
    empty.style.display = 'block';
    tbody.innerHTML = '';
  }
}

// Initial admin visibility on page load
if (localStorage.getItem('isAdmin') === 'true') {
  setAdminMode(true);
} else {
  setAdminMode(false);
}

// Restore welcome text on page load
const storedWelcome = localStorage.getItem('welcomeName');
if (storedWelcome) {
  setWelcomeName(storedWelcome);
}

setLoggedInUI(!!storedWelcome);

// Admin: delete user from table
const usersTableBody = document.getElementById('users-table-body');

usersTableBody?.addEventListener('click', async (e) => {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;
  const btn = target.closest('.user-delete-btn');
  if (!btn) return;
  const id = btn.getAttribute('data-id');
  if (!id) return;

  const confirmed = window.confirm('Are you sure you want to delete this user?');
  if (!confirmed) return;

  btn.disabled = true;
  try {
    const res = await fetch(`${API_BASE}/api/users/${id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      alert(data.message || 'Failed to delete user.');
      btn.disabled = false;
      return;
    }
    // Refresh users list
    await loadUsers();
  } catch (err) {
    console.error('Delete user error:', err);
    alert('Something went wrong while deleting user.');
    btn.disabled = false;
  }
});

// Password visibility toggles
document.querySelectorAll('.password-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    const targetId = btn.getAttribute('data-target');
    if (!targetId) return;
    const input = document.getElementById(targetId);
    if (!input) return;
    const isPassword = input.getAttribute('type') === 'password';
    input.setAttribute('type', isPassword ? 'text' : 'password');
    btn.textContent = isPassword ? 'Hide' : 'Show';
  });
});
