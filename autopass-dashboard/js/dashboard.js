// ── CONFIG ────────────────────────────────────────────────────────────────────
const API_BASE = 'http://localhost:3000/api';
// ── AUTH ──────────────────────────────────────────────────────────────────────
const Auth = {
  getToken()  { return localStorage.getItem('ap_token'); },
  getAdmin()  { return JSON.parse(localStorage.getItem('ap_admin') || 'null'); },
  setSession(token, admin) {
    localStorage.setItem('ap_token', token);
    localStorage.setItem('ap_admin', JSON.stringify(admin));
  },
  clear() {
    localStorage.removeItem('ap_token');
    localStorage.removeItem('ap_admin');
  },
  isAuthenticated() { return !!this.getToken(); },
  logout() {
    this.clear();
    window.location.href = '../index.html';
  },
  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = '../index.html';
      return false;
    }
    return true;
  },
};

// ── API ───────────────────────────────────────────────────────────────────────
const Api = {
  async request(method, path, body = null, isFormData = false) {
    const token = Auth.getToken();
    const headers = { Authorization: `Bearer ${token}` };
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const opts = { method, headers };
    if (body) opts.body = isFormData ? body : JSON.stringify(body);

    const res = await fetch(`${API_BASE}${path}`, opts);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data.message || `Request failed (${res.status})`;
      throw Object.assign(new Error(msg), { status: res.status, data });
    }
    return data;
  },

  get(path)              { return this.request('GET', path); },
  post(path, body)       { return this.request('POST', path, body); },
  put(path, body)        { return this.request('PUT', path, body); },
  delete(path)           { return this.request('DELETE', path); },
  postForm(path, form)   { return this.request('POST', path, form, true); },

  buildQuery(params) {
    const q = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    return q ? `?${q}` : '';
  },
};

// ── TOAST ─────────────────────────────────────────────────────────────────────
const Toast = {
  container: null,
  init() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      this.container.id = 'toast-container';
      document.body.appendChild(this.container);
    }
  },
  show(message, type = 'default', duration = 3500) {
    if (!this.container) this.init();
    const icons = {
      success: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>`,
      error:   `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/></svg>`,
      warning: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/></svg>`,
    };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `${icons[type] || ''}<span>${message}</span>`;
    this.container.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(4px)'; t.style.transition = '200ms'; setTimeout(() => t.remove(), 200); }, duration);
  },
  success(msg) { this.show(msg, 'success'); },
  error(msg)   { this.show(msg, 'error'); },
  warning(msg) { this.show(msg, 'warning'); },
};

// ── MODAL ─────────────────────────────────────────────────────────────────────
const Modal = {
  open(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('open');
  },
  close(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  },
  closeAll() {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  },
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
const Fmt = {
  date(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  },
  datetime(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  },
  currency(val) {
    if (val === null || val === undefined) return '—';
    return `EGP ${parseFloat(val).toFixed(2)}`;
  },
  truncate(str, n = 30) {
    if (!str) return '—';
    return str.length > n ? str.slice(0, n) + '…' : str;
  },
  uuid(str) {
    if (!str) return '—';
    return str.slice(0, 8) + '…';
  },
  initials(first, last) {
    return `${(first || '?')[0]}${(last || '?')[0]}`.toUpperCase();
  },
};

const statusBadge = (status) => {
  const map = {
    UNPAID:    'badge-amber',
    PAID:      'badge-green',
    DISPUTED:  'badge-purple',
    CANCELLED: 'badge-grey',
    OVERDUE:   'badge-red',
    COMPLETED: 'badge-green',
    FAILED:    'badge-red',
    REFUNDED:  'badge-blue',
    PENDING:   'badge-amber',
    ACCEPTED:  'badge-green',
    REJECTED:  'badge-red',
    ACTIVE:    'badge-green',
    INACTIVE:  'badge-grey',
    OPEN:      'badge-green',
    DENY:      'badge-red',
    STOP:      'badge-red',
    AUTO_BLOCK:'badge-amber',
    OBSERVE:   'badge-blue',
    SUCCESS:   'badge-green',
    NO_PLATE:  'badge-grey',
    TEMPLATE_FAIL: 'badge-amber',
    OCR_FAIL:  'badge-amber',
    TRUE:      'badge-green',
    FALSE:     'badge-grey',
  };
  const cls = map[status] || 'badge-grey';
  return `<span class="badge ${cls}"><span class="badge-dot"></span>${status || '—'}</span>`;
};

// ── SIDEBAR ACTIVE STATE ──────────────────────────────────────────────────────
function initSidebar() {
  const admin = Auth.getAdmin();
  if (admin) {
    const nameEl   = document.getElementById('admin-name');
    const roleEl   = document.getElementById('admin-role');
    const avatarEl = document.getElementById('admin-avatar');

    // account object from /auth/login has: id, email, type, first_name, last_name, admin_level
    const displayName = admin.first_name && admin.last_name
      ? `${admin.first_name} ${admin.last_name}`
      : admin.email;

    const initials = admin.first_name && admin.last_name
      ? Fmt.initials(admin.first_name, admin.last_name)
      : (admin.email || 'A')[0].toUpperCase();

    if (nameEl)   nameEl.textContent   = displayName;
    if (roleEl)   roleEl.textContent   = (admin.admin_level || 'Admin').replace(/_/g, ' ');
    if (avatarEl) avatarEl.textContent = initials;
  }

  const path = window.location.pathname;
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    if (path.includes(item.dataset.page)) item.classList.add('active');
  });

  document.getElementById('logout-btn')?.addEventListener('click', () => Auth.logout());
}

// ── PAGINATION RENDERER ───────────────────────────────────────────────────────
function renderPagination(containerId, meta, onPageChange) {
  const el = document.getElementById(containerId);
  if (!el || !meta) return;

  const { total, page, limit, total_pages } = meta;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);

  el.innerHTML = `
    <span class="pagination-info">Showing ${from}–${to} of ${total}</span>
    <div class="pagination-controls">
      <button class="page-btn" ${page <= 1 ? 'disabled' : ''} data-page="${page - 1}">
        <svg viewBox="0 0 16 16" fill="currentColor"><path d="M10 3L5 8l5 5"/></svg>
      </button>
      ${Array.from({ length: total_pages }, (_, i) => i + 1)
        .filter(p => p === 1 || p === total_pages || Math.abs(p - page) <= 1)
        .reduce((acc, p, i, arr) => {
          if (i > 0 && arr[i - 1] !== p - 1) acc.push('…');
          acc.push(p); return acc;
        }, [])
        .map(p => p === '…'
          ? `<button class="page-btn" disabled>…</button>`
          : `<button class="page-btn ${p === page ? 'active' : ''}" data-page="${p}">${p}</button>`)
        .join('')}
      <button class="page-btn" ${page >= total_pages ? 'disabled' : ''} data-page="${page + 1}">
        <svg viewBox="0 0 16 16" fill="currentColor"><path d="M6 3l5 5-5 5"/></svg>
      </button>
    </div>`;

  el.querySelectorAll('.page-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => onPageChange(parseInt(btn.dataset.page)));
  });
}

// ── CONFIRM DIALOG ────────────────────────────────────────────────────────────
function confirmAction(title, desc, onConfirm) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-desc').textContent  = desc;
  Modal.open('confirm-modal');
  const btn = document.getElementById('confirm-ok-btn');
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.addEventListener('click', async () => {
    Modal.close('confirm-modal');
    await onConfirm();
  });
}

// Auto-init on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  Auth.requireAuth();
  initSidebar();
  Toast.init();
});

// Close modals on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) Modal.closeAll();
});
