/** dashboard.js - statistics, current procurement, notifications. */
document.addEventListener('DOMContentLoaded', async () => {
  if (!UI.requireFarmer()) return;

  const user = API.user();
  document.getElementById('welcome-line').textContent = `Welcome, ${user.name}`;
  document.getElementById('welcome-sub').textContent =
    `Farmer ID ${user.farmer_code} · ${user.village}, ${user.district}, ${user.state}`;

  loadStats();
  loadCurrentProcurement();
  loadNotifications();
  loadDocumentProgress();

  document.getElementById('mark-all-read').addEventListener('click', async () => {
    try {
      await API.patch('/notifications/read-all');
      loadNotifications();
      document.getElementById('nav-notif-count')?.classList.add('d-none');
      UI.toast('All notifications marked as read.', 'success');
    } catch (e) { UI.toast(e.message, 'error'); }
  });

  async function loadStats() {
    try {
      const s = await API.get('/farmers/me/stats');
      document.getElementById('stat-crops').textContent = s.totalRequests;
      document.getElementById('stat-quantity').textContent = s.totalQuantityQuintal;
      document.getElementById('stat-transactions').textContent = s.completedTransactions;
      document.getElementById('stat-amount').textContent = UI.money(s.totalAmount);

      const box = document.getElementById('latest-transaction');
      const t = s.latestTransaction;
      box.innerHTML = t ? `
        <div class="d-flex flex-wrap justify-content-between gap-3">
          <div>
            <div class="fw-semibold">${UI.escapeHtml(t.crop)} · ${t.quantity} ${UI.escapeHtml(t.unit)}</div>
            <div class="text-muted small">${UI.escapeHtml(t.centre_name)} · ${UI.formatDate(t.created_at)}</div>
            <div class="text-muted small">Transaction ${UI.escapeHtml(t.txn_no)}</div>
          </div>
          <div class="text-end">
            <div class="h5 mb-1">${UI.money(t.amount)}</div>
            <a class="btn btn-sm btn-outline-farm" href="receipts.html?txn=${encodeURIComponent(t.txn_no)}">View receipt</a>
          </div>
        </div>` : `
        <div class="empty-state"><i class="bi bi-receipt"></i>
          No completed transaction yet. Your first receipt will appear here.</div>`;
    } catch (e) { UI.toast(e.message, 'error'); }
  }

  async function loadCurrentProcurement() {
    const box = document.getElementById('current-procurement');
    try {
      const data = await API.get('/procurements');
      const active = data.requests.find(r => r.status !== 'Completed');
      if (!active) {
        box.innerHTML = `<div class="empty-state"><i class="bi bi-basket"></i>
          No procurement is in progress. Start a request when your crop is ready.</div>`;
        return;
      }
      const steps = active.status_flow.map((s, i) => {
        const cls = i < active.status_index ? 'done' : i === active.status_index ? 'current' : '';
        return `<div class="step ${cls}">${s}</div>`;
      }).join('');

      box.innerHTML = `
        <div class="d-flex flex-wrap justify-content-between gap-2 mb-3">
          <div>
            <div class="fw-semibold">${UI.escapeHtml(active.crop)} · ${active.quantity} ${UI.escapeHtml(active.unit)}</div>
            <div class="text-muted small">${UI.escapeHtml(active.centre_name)} · submitted ${UI.formatDate(active.created_at)}</div>
            <div class="text-muted small">Procurement ID ${UI.escapeHtml(active.procurement_no)}</div>
          </div>
          <span class="badge-status st-progress align-self-start">${UI.escapeHtml(active.status)}</span>
        </div>
        <div class="tracker">${steps}</div>
        <a class="btn btn-outline-farm btn-sm mt-3" href="procurement.html?id=${active.id}">Open this request</a>`;
    } catch (e) {
      box.innerHTML = `<p class="text-danger mb-0">${UI.escapeHtml(e.message)}</p>`;
    }
  }

  async function loadNotifications() {
    const box = document.getElementById('notification-list');
    try {
      const data = await API.get('/notifications');
      if (!data.notifications.length) {
        box.innerHTML = `<div class="empty-state"><i class="bi bi-bell-slash"></i>No notifications yet.</div>`;
        return;
      }
      const icon = { success: 'bi-check-circle text-success', warning: 'bi-exclamation-triangle text-warning', info: 'bi-info-circle text-primary' };
      box.innerHTML = data.notifications.slice(0, 8).map(n => `
        <div class="d-flex gap-2 py-2 border-bottom ${n.is_read ? 'opacity-75' : ''}">
          <i class="bi ${icon[n.type] || icon.info} mt-1"></i>
          <div class="flex-grow-1">
            <div class="fw-semibold small">${UI.escapeHtml(n.title)}</div>
            <div class="small text-muted">${UI.escapeHtml(n.message)}</div>
            <div class="small text-muted">${UI.formatDate(n.created_at)} ${UI.formatTime(n.created_at)}</div>
          </div>
        </div>`).join('');
    } catch (e) {
      box.innerHTML = `<p class="text-danger mb-0">${UI.escapeHtml(e.message)}</p>`;
    }
  }

  async function loadDocumentProgress() {
    try {
      const d = await API.get('/documents');
      const bar = document.getElementById('doc-progress');
      bar.style.width = d.percent + '%';
      bar.setAttribute('aria-valuenow', d.percent);
      document.getElementById('doc-progress-text').textContent =
        `${d.uploadedCount} / ${d.totalCount} documents uploaded · ${d.verifiedCount} verified`;
      const ql = document.getElementById('ql-docs');
      if (ql) ql.textContent = `${d.uploadedCount} of ${d.totalCount} uploaded`;
    } catch (e) { /* handled elsewhere */ }
  }
});
