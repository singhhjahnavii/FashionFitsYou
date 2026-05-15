/* ============================================================
   auth.js — Authentication state & form handlers
   ============================================================ */

const auth = {
  _user: null,

  init() {
    try {
      const raw = localStorage.getItem('ffy_user');
      if (raw) this._user = JSON.parse(raw);
    } catch { this._user = null; }
    this._updateUI();
    this._bindLogout();
  },

  isLoggedIn() {
    return !!localStorage.getItem('ffy_token');
  },

  getUser() {
    return this._user;
  },

  setSession(token, refreshToken, user) {
    localStorage.setItem('ffy_token', token);
    localStorage.setItem('ffy_refresh_token', refreshToken);
    localStorage.setItem('ffy_user', JSON.stringify(user));
    this._user = user;
    this._updateUI();
  },

  logout() {
  // Clear local storage first
  ['ffy_token', 'ffy_refresh_token', 'ffy_user', 'ffy_cart'].forEach(k =>
    localStorage.removeItem(k)
  );
  this._user = null;
  this._updateUI();

  // Then tell the server (fire and forget)
  api.auth.logout().catch(() => {});

  const pub = ['login.html', 'register.html', 'index.html', 'home.html', 'products.html'];
  const onPublic = pub.some(p => window.location.pathname.includes(p));
  if (!onPublic) window.location.href = '/pages/login.html';  else window.location.reload();
},

  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = `login.html?return=${encodeURIComponent(window.location.href)}`;
      return false;
    }
    return true;
  },

  _updateUI() {
    const name = this._user?.full_name?.split(' ')[0] || 'Account';
    document.querySelectorAll('[data-auth-name]').forEach(el => el.textContent = name);

    if (this.isLoggedIn()) {
      document.querySelectorAll('[data-auth-login]').forEach(el => el.style.display = 'none');
      document.querySelectorAll('[data-auth-account]').forEach(el => el.style.display = 'block');
    } else {
      document.querySelectorAll('[data-auth-login]').forEach(el => el.style.display = '');
      document.querySelectorAll('[data-auth-account]').forEach(el => el.style.display = 'none');
    }
  },

  _bindLogout() {
    document.addEventListener('click', e => {
      if (e.target.closest('[data-auth-logout]')) {
        e.preventDefault();
        this.logout();
      }
    });
  },
};

/* ── Login handler ────────────────────────────────────────── */
async function handleLogin(e) {
  e.preventDefault();
  const form  = e.target;
  const btn   = form.querySelector('[type=submit]');
  const errEl = form.querySelector('.form-error-global');

  clearErr(errEl);
  btn.disabled = true;
  btn.textContent = 'Signing in…';

  // Clear any stale session before attempting login
  ['ffy_token', 'ffy_refresh_token', 'ffy_user', 'ffy_cart'].forEach(k =>
    localStorage.removeItem(k)
  );

  try {
    const data = await api.auth.login({
      email:    form.querySelector('[name=email]').value.trim(),
      password: form.querySelector('[name=password]').value,
    });
    auth.setSession(data.token, data.refresh_token, data.user);
    toast.show(`Welcome back, ${data.user.full_name?.split(' ')[0] || ''}! 👋`, 'success');
    const ret = new URLSearchParams(window.location.search).get('return');
    setTimeout(() => { window.location.href = ret ? decodeURIComponent(ret) : '/pages/home.html'; }, 700);  } catch (err) {
    showErr(errEl, err.message);
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

/* ── Register handler ─────────────────────────────────────── */
async function handleRegister(e) {
  e.preventDefault();
  const form  = e.target;
  const btn   = form.querySelector('[type=submit]');
  const errEl = form.querySelector('.form-error-global');

  const pass    = form.querySelector('[name=password]').value;
  const confirm = form.querySelector('[name=confirm_password]').value;
  if (pass !== confirm) { showErr(errEl, 'Passwords do not match'); return; }
  if (pass.length < 8)  { showErr(errEl, 'Password must be at least 8 characters'); return; }

  clearErr(errEl);
  btn.disabled = true;
  btn.textContent = 'Creating account…';

  try {
    await api.auth.register({
      email:     form.querySelector('[name=email]').value.trim(),
      password:  pass,
      full_name: form.querySelector('[name=full_name]').value.trim(),
      gender:    form.querySelector('[name=gender]')?.value,
    });
    toast.show('Account created! Please check your email to verify.', 'success');
    setTimeout(() => { window.location.href = 'login.html'; }, 1500);
  } catch (err) {
    showErr(errEl, err.message);
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
}

function showErr(el, msg) { if (el) { el.textContent = msg; el.style.display = 'block'; } }
function clearErr(el)     { if (el) { el.textContent = '';  el.style.display = 'none';  } }

document.addEventListener('DOMContentLoaded', () => {
  auth.init();
  document.getElementById('login-form')?.addEventListener('submit', handleLogin);
  document.getElementById('register-form')?.addEventListener('submit', handleRegister);
});