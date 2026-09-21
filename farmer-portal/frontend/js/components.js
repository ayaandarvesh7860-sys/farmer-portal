/**
 * components.js - shared pieces used by every page:
 * navbar, footer, toast messages, formatting helpers and page guards.
 * Each page only needs <div id="site-nav"></div> and <div id="site-footer"></div>.
 */
const UI = (function () {

  const NAV_LINKS = [
    { href: 'index.html',        label: 'Home',          icon: 'bi-house-door' },
    { href: 'centres.html',      label: 'Nearby centres', icon: 'bi-geo-alt' },
    { href: 'documents.html',    label: 'Documents',     icon: 'bi-folder2-open' },
    { href: 'procurement.html',  label: 'Procurement',   icon: 'bi-basket' },
    { href: 'receipts.html',     label: 'Receipts',      icon: 'bi-receipt' },
    { href: 'crops.html',        label: 'Crop info',     icon: 'bi-flower1' },
    { href: 'assistant.html',    label: 'AI assistant',  icon: 'bi-robot' }
  ];

  function currentPage() {
    const file = location.pathname.split('/').pop();
    return file === '' ? 'index.html' : file;
  }

  function renderNav() {
    const host = document.getElementById('site-nav');
    if (!host) return;
    const page = currentPage();
    const loggedIn = API.isLoggedIn() && !API.isAdmin();
    const admin = API.isAdmin();
    const u = API.user();

    const links = NAV_LINKS.map(l => `
      <li class="nav-item">
        <a class="nav-link ${page === l.href ? 'active' : ''}" href="${l.href}">
          <i class="bi ${l.icon} me-1"></i>${l.label}
        </a>
      </li>`).join('');

    const account = loggedIn ? `
      <li class="nav-item position-relative">
        <a class="nav-link" href="dashboard.html" title="Notifications">
          <i class="bi bi-bell"></i><span class="d-lg-none ms-1">Notifications</span>
          <span class="notif-dot d-none" id="nav-notif-count">0</span>
        </a>
      </li>
      <li class="nav-item dropdown">
        <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
          <i class="bi bi-person-circle me-1"></i>${escapeHtml((u && u.name ? u.name.split(' ')[0] : 'Account'))}
        </a>
        <ul class="dropdown-menu dropdown-menu-end">
          <li><a class="dropdown-item" href="dashboard.html"><i class="bi bi-speedometer2 me-2"></i>Dashboard</a></li>
          <li><a class="dropdown-item" href="profile.html"><i class="bi bi-person me-2"></i>My profile</a></li>
          <li><a class="dropdown-item" href="transactions.html"><i class="bi bi-clock-history me-2"></i>Transactions</a></li>
          <li><hr class="dropdown-divider"></li>
          <li><button class="dropdown-item text-danger" id="btn-logout"><i class="bi bi-box-arrow-right me-2"></i>Log out</button></li>
        </ul>
      </li>` : admin ? `
      <li class="nav-item"><a class="nav-link" href="admin.html"><i class="bi bi-speedometer2 me-1"></i>Admin</a></li>
      <li class="nav-item"><button class="btn btn-harvest ms-lg-2" id="btn-logout">Log out</button></li>` : `
      <li class="nav-item"><a class="nav-link" href="login.html"><i class="bi bi-box-arrow-in-right me-1"></i>Login</a></li>
      <li class="nav-item"><a class="btn btn-harvest ms-lg-2 w-100" href="register.html">Register</a></li>`;

    host.innerHTML = `
      <nav class="navbar navbar-expand-lg portal-nav fixed-top">
        <div class="container">
          <a class="navbar-brand" href="index.html">
            <span class="brand-mark"><i class="bi bi-flower2"></i></span>
            <span>Smart Farmer Portal
              <span class="brand-sub">Procurement &amp; assistance</span>
            </span>
          </a>
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav"
                  aria-controls="mainNav" aria-expanded="false" aria-label="Open the menu">
            <span class="navbar-toggler-icon"></span>
          </button>
          <div class="collapse navbar-collapse" id="mainNav">
            <ul class="navbar-nav ms-auto align-items-lg-center">
              ${links}
              ${account}
            </ul>
          </div>
        </div>
      </nav>`;

    const logout = document.getElementById('btn-logout');
    if (logout) logout.addEventListener('click', () => {
      API.clearSession();
      toast('You have been logged out.', 'success');
      setTimeout(() => location.href = 'index.html', 600);
    });

    if (loggedIn) refreshNotificationCount();
  }

  async function refreshNotificationCount() {
    try {
      const data = await API.get('/notifications');
      const dot = document.getElementById('nav-notif-count');
      if (dot && data.unread > 0) { dot.textContent = data.unread; dot.classList.remove('d-none'); }
    } catch (e) { /* not logged in or offline: ignore */ }
  }

  function renderFooter() {
    const host = document.getElementById('site-footer');
    if (!host) return;
    host.innerHTML = `
      <footer class="site-footer">
        <div class="container">
          <div class="row g-4">
            <div class="col-lg-5">
              <h5 class="text-white">Smart Farmer Procurement &amp; Assistance Portal</h5>
              <p class="mb-2">Find a procurement centre, keep your documents ready, sell your crop and
                 collect a digital receipt without standing in a queue for paperwork.</p>
              <p class="mb-0"><strong>Demonstration project.</strong> All farmers, centres and records
                 shown here are fictional sample data.</p>
            </div>
            <div class="col-6 col-lg-3">
              <h6 class="text-white">Portal</h6>
              <ul class="list-unstyled">
                <li><a href="centres.html">Nearby centres</a></li>
                <li><a href="procurement.html">Start procurement</a></li>
                <li><a href="receipts.html">Digital receipts</a></li>
                <li><a href="crops.html">Crop information</a></li>
              </ul>
            </div>
            <div class="col-6 col-lg-4">
              <h6 class="text-white">Help</h6>
              <ul class="list-unstyled">
                <li><a href="assistant.html">Ask the AI assistant</a></li>
                <li><a href="register.html">Create a farmer account</a></li>
                <li><a href="admin.html">Administrator login</a></li>
                <li>Kisan Call Centre: 1800-180-1551</li>
              </ul>
            </div>
          </div>
          <hr class="border-secondary my-4">
          <p class="mb-0 small">Built as a college project with Node.js, Express, SQLite and Bootstrap 5.</p>
        </div>
      </footer>`;
  }

  /* ------------------------------ helpers ----------------------------- */

  function toast(message, type = 'info') {
    let holder = document.getElementById('toast-holder');
    if (!holder) {
      holder = document.createElement('div');
      holder.id = 'toast-holder';
      holder.className = 'toast-container position-fixed bottom-0 end-0 p-3';
      holder.style.zIndex = '1080';
      document.body.appendChild(holder);
    }
    const colors = { success: 'text-bg-success', error: 'text-bg-danger', warning: 'text-bg-warning', info: 'text-bg-dark' };
    const el = document.createElement('div');
    el.className = `toast align-items-center ${colors[type] || colors.info} border-0`;
    el.setAttribute('role', 'alert');
    el.innerHTML = `<div class="d-flex">
        <div class="toast-body">${escapeHtml(message)}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>`;
    holder.appendChild(el);
    const t = new bootstrap.Toast(el, { delay: 4000 });
    t.show();
    el.addEventListener('hidden.bs.toast', () => el.remove());
  }

  function escapeHtml(str) {
    return String(str === null || str === undefined ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function money(n) {
    if (n === null || n === undefined) return '-';
    return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  function formatDate(value) {
    if (!value) return '-';
    const d = new Date(String(value).replace(' ', 'T'));
    if (isNaN(d)) return value;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function formatTime(value) {
    if (!value) return '-';
    const d = new Date(String(value).replace(' ', 'T'));
    if (isNaN(d)) return '';
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  function statusClass(status) {
    const map = {
      'Open': 'st-open', 'Busy': 'st-busy', 'Closed': 'st-closed',
      'Verified': 'st-verified', 'Uploaded': 'st-pending', 'Under Verification': 'st-pending',
      'Rejected': 'st-closed', 'Not Uploaded': 'st-none', 'Completed': 'st-completed'
    };
    return map[status] || 'st-progress';
  }

  /** Redirects to the login page when a farmer page is opened without a session. */
  function requireFarmer() {
    if (!API.isLoggedIn() || API.isAdmin()) {
      location.href = 'login.html?next=' + encodeURIComponent(currentPage());
      return false;
    }
    return true;
  }

  /** Shows field errors returned by the backend on a Bootstrap form. */
  function showFieldErrors(form, errors) {
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    if (!errors) return;
    Object.entries(errors).forEach(([name, message]) => {
      const field = form.querySelector(`[name="${name}"]`);
      if (!field) return;
      field.classList.add('is-invalid');
      const feedback = field.parentElement.querySelector('.invalid-feedback')
        || field.closest('.mb-3, .col-12, .col-md-6')?.querySelector('.invalid-feedback');
      if (feedback) feedback.textContent = message;
    });
  }

  /** Adds show/hide behaviour to every password field marked data-toggle-password. */
  function wirePasswordToggles() {
    document.querySelectorAll('[data-toggle-password]').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.togglePassword);
        if (!input) return;
        const showing = input.type === 'text';
        input.type = showing ? 'password' : 'text';
        btn.innerHTML = `<i class="bi ${showing ? 'bi-eye' : 'bi-eye-slash'}"></i>`;
        btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
      });
    });
  }

  function init() {
    renderNav();
    renderFooter();
    wirePasswordToggles();
  }

  document.addEventListener('DOMContentLoaded', init);

  return { toast, escapeHtml, money, formatDate, formatTime, statusClass,
           requireFarmer, showFieldErrors, refreshNotificationCount, currentPage };
})();
