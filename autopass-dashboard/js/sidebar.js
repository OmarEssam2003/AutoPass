// Sidebar HTML — injected into every page
const SIDEBAR_HTML = `
<style>
  .nav-badge {
    margin-left: auto;
    background: var(--red, #ef4444);
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    min-width: 18px;
    height: 18px;
    border-radius: 999px;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    line-height: 1;
  }
</style>
<aside class="sidebar" id="sidebar">
  <div class="sidebar-logo">
    <div class="sidebar-logo-icon">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3"/>
        <rect x="9" y="11" width="14" height="10" rx="2"/>
        <circle cx="12" cy="16" r="1"/>
        <circle cx="20" cy="16" r="1"/>
      </svg>
    </div>
    <div>
      <div class="sidebar-logo-text">AutoPass</div>
      <div class="sidebar-logo-sub">Admin Dashboard</div>
    </div>
  </div>

  <nav class="sidebar-nav">
    <div class="nav-section-label">Overview</div>
    <a href="../pages/overview.html" class="nav-item" data-page="overview">
      <svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 10a3.001 3.001 0 01-2 2.83V13a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"/></svg>
      Overview
    </a>

    <div class="nav-section-label">Access</div>
    <a href="../pages/users.html" class="nav-item" data-page="users">
      <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z"/></svg>
      Users
    </a>
    <a href="../pages/vehicles.html" class="nav-item" data-page="vehicles">
      <svg viewBox="0 0 20 20" fill="currentColor"><path d="M6.5 3A1.5 1.5 0 005 4.5v.085A1.5 1.5 0 003.5 6H2a1 1 0 000 2h.25A1.75 1.75 0 004 9.75v3.5A1.75 1.75 0 002.25 15H2a1 1 0 000 2h1a1 1 0 001-1v-.25h12V16a1 1 0 001 1h1a1 1 0 000-2h-.25A1.75 1.75 0 0016 13.25v-3.5A1.75 1.75 0 0017.75 8H18a1 1 0 000-2h-1.5A1.5 1.5 0 0015 4.585V4.5A1.5 1.5 0 0013.5 3h-7z"/></svg>
      Vehicles
    </a>
    <a href="../pages/gates.html" class="nav-item" data-page="gates">
      <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-3a1 1 0 00-1-1H9a1 1 0 00-1 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.707-1.707l7-7z" clip-rule="evenodd"/></svg>
      Gates & Zones
    </a>

    <div class="nav-section-label">Operations</div>
    <a href="../pages/enforcements.html" class="nav-item" data-page="enforcements">
      <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.661 2.237a.531.531 0 01.678 0 11.947 11.947 0 007.078 2.749.5.5 0 01.479.425c.069.52.104 1.05.104 1.589 0 5.162-3.26 9.563-7.834 11.256a.48.48 0 01-.332 0C5.26 16.563 2 12.162 2 7c0-.538.035-1.069.104-1.589a.5.5 0 01.48-.425 11.947 11.947 0 007.077-2.749z" clip-rule="evenodd"/></svg>
      Enforcements
    </a>
    <a href="../pages/detection.html" class="nav-item" data-page="detection">
      <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"/><path fill-rule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41z" clip-rule="evenodd"/></svg>
      Detection Events
    </a>
    <a href="../pages/pricing.html" class="nav-item" data-page="pricing">
      <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.798 7.45c.512-.67 1.135-.95 1.702-.95s1.19.28 1.702.95a.75.75 0 001.192-.91C12.637 5.55 11.596 5 10.5 5s-2.137.55-2.894 1.54A5.205 5.205 0 006.83 9H6.5a.75.75 0 000 1.5h.098a5.143 5.143 0 000 1H6.5a.75.75 0 000 1.5h.334c.298.933.845 1.798 1.72 2.283.947.52 2.05.501 2.915.001a.75.75 0 10-.738-1.302c-.493.279-1.075.29-1.572.019-.334-.184-.594-.497-.78-.903h.771a.75.75 0 100-1.5H8.11a3.485 3.485 0 01-.015-.5c0-.17.009-.338.026-.5h1.629a.75.75 0 100-1.5H8.318c.186-.404.446-.719.48-.65z" clip-rule="evenodd"/></svg>
      Pricing Rules
    </a>

    <div class="nav-section-label">Finance</div>
    <a href="../pages/tickets.html" class="nav-item" data-page="tickets">
      <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M13.3 11.3a1 1 0 010 1.4l-2.6 2.6-2.6-2.6a1 1 0 011.4-1.4l1.2 1.2 1.2-1.2a1 1 0 011.4 0zM10 1a1 1 0 011 1v.586l.293-.293a1 1 0 011.414 1.414L10 6.414l-2.707-2.707A1 1 0 018.707 2.293L9 2.586V2a1 1 0 011-1zm-5 5a1 1 0 000 2h.01a1 1 0 000-2H5zm10 0a1 1 0 000 2h.01a1 1 0 000-2H15zM5 11a1 1 0 000 2h.01a1 1 0 000-2H5zm10 0a1 1 0 000 2h.01a1 1 0 000-2H15zM5 15a1 1 0 000 2h.01a1 1 0 000-2H5zm10 0a1 1 0 000 2h.01a1 1 0 000-2H15z" clip-rule="evenodd"/></svg>
      Tickets
    </a>
    <a href="../pages/payments.html" class="nav-item" data-page="payments">
      <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M2.5 4A1.5 1.5 0 001 5.5V6h18v-.5A1.5 1.5 0 0017.5 4h-15zm18 3H-.001l.002 7.5A1.5 1.5 0 001.5 16h17a1.5 1.5 0 001.5-1.5V7H20.5zM5 11.75a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75zm0 2.5a.75.75 0 01.75-.75h2.5a.75.75 0 010 1.5h-2.5A.75.75 0 015 14.25z" clip-rule="evenodd"/></svg>
      Payments
    </a>

    <div class="nav-section-label">System</div>
    <a href="../pages/alerts.html" class="nav-item" data-page="alerts">
      <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 8a6 6 0 1112 0c0 1.887.454 3.665 1.257 5.234a.75.75 0 01-.515 1.076 32.903 32.903 0 01-3.256.508 3.5 3.5 0 01-6.972 0 32.91 32.91 0 01-3.256-.508.75.75 0 01-.515-1.076A11.448 11.448 0 004 8zm6 7c-.655 0-1.305-.02-1.95-.057a2 2 0 003.9 0c-.645.038-1.295.057-1.95.057z" clip-rule="evenodd"/></svg>
      Alerts
    </a>
    <a href="../pages/notifications.html" class="nav-item" data-page="notifications">
      <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v.386l-.862 1.724A1 1 0 004 12h12a1 1 0 00.862-1.49L16 8.387V8a6 6 0 00-6-6z"/><path d="M10 18a3 3 0 01-2.83-2h5.66A3 3 0 0110 18z"/><circle cx="15" cy="4" r="3" fill="var(--red)" class="notif-dot" style="display:none"/></svg>
      Notifications
      <span class="nav-badge" id="sidebar-notif-badge" style="display:none"></span>
    </a>
    <a href="../pages/admins.html" class="nav-item" data-page="admins">
      <svg viewBox="0 0 20 20" fill="currentColor"><path d="M11 5a3 3 0 11-6 0 3 3 0 016 0zM2.046 15.253c-.18.501.047 1.03.544 1.173A11.944 11.944 0 008 17.5c1.845 0 3.593-.417 5.147-1.16-.217-.584-.4-1.183-.55-1.795a9.98 9.98 0 01-4.593 1.107c-1.398 0-2.731-.285-3.958-.8zM13.5 13a6.5 6.5 0 100-13 6.5 6.5 0 000 13z"/><path d="M13.5 3a.75.75 0 01.75.75V7h2.25a.75.75 0 010 1.5H13.5a.75.75 0 01-.75-.75v-4A.75.75 0 0113.5 3z"/></svg>
      Admins
    </a>
    <a href="../pages/audit.html" class="nav-item" data-page="audit">
      <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 4.75A.75.75 0 016.75 4h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 4.75zM6 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 10zm0 5.25a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75a.75.75 0 01-.75-.75zM1.99 4.75a1 1 0 011-1H3a1 1 0 011 1v.01a1 1 0 01-1 1h-.01a1 1 0 01-1-1v-.01zM1.99 15.25a1 1 0 011-1H3a1 1 0 011 1v.01a1 1 0 01-1 1h-.01a1 1 0 01-1-1v-.01zM1.99 10a1 1 0 011-1H3a1 1 0 011 1v.01a1 1 0 01-1 1h-.01a1 1 0 01-1-1V10z" clip-rule="evenodd"/></svg>
      Audit Logs
    </a>
  </nav>

  <div class="sidebar-footer">
    <div class="admin-badge">
      <div class="admin-avatar" id="admin-avatar">SA</div>
      <div class="admin-info">
        <div class="admin-name" id="admin-name">Admin</div>
        <div class="admin-role" id="admin-role">Super Admin</div>
      </div>
      <button class="logout-btn" id="logout-btn" title="Logout">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M6 10a.75.75 0 01.75-.75h9.546l-1.048-.943a.75.75 0 111.004-1.114l2.5 2.25a.75.75 0 010 1.114l-2.5 2.25a.75.75 0 11-1.004-1.114l1.048-.943H6.75A.75.75 0 016 10z" clip-rule="evenodd"/></svg>
      </button>
    </div>
  </div>
</aside>`;

// Confirm modal HTML — injected once
const CONFIRM_MODAL_HTML = `
<div class="modal-overlay" id="confirm-modal">
  <div class="modal" style="max-width:380px">
    <div class="modal-body" style="padding:24px; text-align:center">
      <div class="confirm-icon" style="margin:0 auto 12px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        </svg>
      </div>
      <div class="confirm-title" id="confirm-title">Are you sure?</div>
      <div class="confirm-desc" id="confirm-desc" style="margin-top:6px"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="Modal.close('confirm-modal')">Cancel</button>
      <button class="btn btn-danger" id="confirm-ok-btn">Delete</button>
    </div>
  </div>
</div>`;

// Inject sidebar + confirm modal into page
document.addEventListener('DOMContentLoaded', () => {
  const sidebarContainer = document.getElementById('sidebar-container');
  if (sidebarContainer) sidebarContainer.innerHTML = SIDEBAR_HTML + CONFIRM_MODAL_HTML;
});
// ── Auto-highlight active nav item ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const page = location.pathname.split('/').pop().replace('.html', '');
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    if (el.dataset.page === page) el.classList.add('active');
  });

  // Poll unread notification count and show badge on sidebar link
  loadSidebarNotifBadge();
  setInterval(loadSidebarNotifBadge, 60_000);
});

async function loadSidebarNotifBadge() {
  try {
    const API_BASE = (typeof window !== 'undefined' && window.API_BASE)
      ? window.API_BASE
      : 'http://localhost:3000/api';
    const token = localStorage.getItem('ap_token');
    if (!token) return;

    const res = await fetch(`${API_BASE}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;

    const data  = await res.json();
    const count = data?.data?.unread ?? 0;
    const badge = document.getElementById('sidebar-notif-badge');
    if (!badge) return;

    if (count > 0) {
      badge.textContent   = count > 99 ? '99+' : count;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  } catch (_) { /* silent — badge is non-critical */ }
}
