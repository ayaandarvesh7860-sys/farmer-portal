/** procurement.js - new procurement request, confirmation, tracking and status demo. */
document.addEventListener('DOMContentLoaded', async () => {
  if (!UI.requireFarmer()) return;

  const form = document.getElementById('procurement-form');
  const centreSelect = document.getElementById('centre_id');
  const listBox = document.getElementById('request-list');
  const searchInput = document.getElementById('req-search');
  const statusSelect = document.getElementById('req-status');
  const params = new URLSearchParams(location.search);

  const user = API.user();
  document.getElementById('farmer_name').value = user.name;
  document.getElementById('farmer_code').value = user.farmer_code;

  let centres = [];
  let statusFlow = [];

  await Promise.all([loadCentres(), loadStatusFlow()]);
  loadRequests();

  // Arriving from the centre finder with ?centre=3 pre-selects that centre.
  if (params.get('centre')) centreSelect.value = params.get('centre');
  // Arriving from the dashboard with ?id=5 opens the requests tab.
  if (params.get('id')) {
    document.getElementById('requests-tab').click();
  }

  let timer;
  searchInput.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(loadRequests, 300); });
  statusSelect.addEventListener('change', loadRequests);

  /* --------------------------- form submit --------------------------- */
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    form.classList.add('was-validated');
    if (!form.checkValidity()) {
      UI.toast('Some details are missing. Check the highlighted fields.', 'warning');
      return;
    }
    showConfirmation();
  });

  document.getElementById('confirm-submit').addEventListener('click', submitRequest);

  function currentValues() {
    const centre = centres.find(c => String(c.id) === centreSelect.value);
    return {
      crop: form.crop.value,
      variety: form.variety.value.trim(),
      quantity: form.quantity.value,
      unit: form.unit.value,
      harvest_date: form.harvest_date.value,
      expected_price: form.expected_price.value,
      centre_id: centreSelect.value,
      centre_name: centre ? centre.name : '',
      vehicle_no: form.vehicle_no.value.trim().toUpperCase(),
      remarks: form.remarks.value.trim()
    };
  }

  function showConfirmation() {
    const v = currentValues();
    const total = v.expected_price ? Number(v.expected_price) * Number(v.quantity) : null;
    const row = (label, value) => `<dt>${label}</dt><dd>${UI.escapeHtml(value || '-')}</dd>`;

    document.getElementById('confirm-body').innerHTML = `
      <dl class="receipt-like" style="display:grid;grid-template-columns:minmax(150px,35%) 1fr;gap:.5rem 1rem;margin:0">
        ${row('Farmer', `${user.name} (${user.farmer_code})`)}
        ${row('Crop', v.crop + (v.variety ? ` · ${v.variety}` : ''))}
        ${row('Quantity', `${v.quantity} ${v.unit}`)}
        ${row('Harvest date', v.harvest_date ? UI.formatDate(v.harvest_date) : 'Not given')}
        ${row('Expected price', v.expected_price ? `₹${v.expected_price} per ${v.unit}` : 'Not given')}
        ${row('Centre', v.centre_name)}
        ${row('Vehicle', v.vehicle_no || 'Not given')}
        ${row('Remarks', v.remarks || 'None')}
      </dl>
      ${total ? `<div class="receipt-total mt-3"><span>Expected value</span><span>${UI.money(total)}</span></div>` : ''}
      <p class="small text-muted mt-3 mb-0">The final rate and amount are decided at the centre after
         weighing and the quality check.</p>`;

    bootstrap.Modal.getOrCreateInstance(document.getElementById('confirmModal')).show();
  }

  async function submitRequest() {
    const btn = document.getElementById('confirm-submit');
    btn.disabled = true; btn.textContent = 'Submitting…';
    try {
      const data = await API.post('/procurements', currentValues());
      bootstrap.Modal.getInstance(document.getElementById('confirmModal')).hide();
      showSuccess(data.request);
      form.reset();
      form.classList.remove('was-validated');
      loadRequests();
      loadCentres();
      UI.refreshNotificationCount();
    } catch (e) {
      UI.showFieldErrors(form, e.errors);
      UI.toast(e.message, 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Submit procurement';
    }
  }

  function showSuccess(r) {
    document.getElementById('success-body').innerHTML = `
      <div class="text-center mb-3">
        <i class="bi bi-check-circle-fill text-success" style="font-size:3rem"></i>
        <h4 class="mt-2 mb-1">Procurement request submitted successfully</h4>
        <p class="text-muted mb-0">Carry your documents when you visit the centre.</p>
      </div>
      <dl style="display:grid;grid-template-columns:minmax(150px,35%) 1fr;gap:.5rem 1rem;margin:0">
        <dt>Procurement ID</dt><dd>${UI.escapeHtml(r.procurement_no)}</dd>
        <dt>Date</dt><dd>${UI.formatDate(r.created_at)}</dd>
        <dt>Time</dt><dd>${UI.formatTime(r.created_at)}</dd>
        <dt>Centre</dt><dd>${UI.escapeHtml(r.centre_name)}</dd>
        <dt>Crop</dt><dd>${UI.escapeHtml(r.crop)}</dd>
        <dt>Quantity</dt><dd>${r.quantity} ${UI.escapeHtml(r.unit)}</dd>
        <dt>Status</dt><dd><span class="badge-status st-progress">${UI.escapeHtml(r.status)}</span></dd>
      </dl>
      <div class="d-flex flex-wrap gap-2 mt-4">
        <button class="btn btn-farm" data-bs-dismiss="modal" id="go-requests">Track this request</button>
        <a class="btn btn-outline-farm" href="dashboard.html">Back to dashboard</a>
      </div>`;
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('successModal'));
    modal.show();
    document.getElementById('go-requests').addEventListener('click', () => {
      document.getElementById('requests-tab').click();
    });
  }

  /* ----------------------------- loading ----------------------------- */
  async function loadCentres() {
    try {
      const data = await API.get('/centres?sort=name');
      centres = data.centres;
      centreSelect.innerHTML = '<option value="">Select a centre</option>' + centres.map(c =>
        `<option value="${c.id}" ${c.status === 'Closed' ? 'disabled' : ''}>
           ${UI.escapeHtml(c.name)} · ${c.queue_count} in queue${c.status === 'Closed' ? ' (closed today)' : ''}
         </option>`).join('');
    } catch (e) {
      centreSelect.innerHTML = '<option value="">Centres could not be loaded</option>';
    }
  }

  async function loadStatusFlow() {
    try {
      const data = await API.get('/procurements/status-flow');
      statusFlow = data.flow;
      statusSelect.innerHTML = '<option value="">All statuses</option>' +
        statusFlow.map(s => `<option>${s}</option>`).join('');
    } catch (e) { /* filter stays as "All statuses" */ }
  }

  async function loadRequests() {
    const qs = new URLSearchParams();
    if (searchInput.value.trim()) qs.set('q', searchInput.value.trim());
    if (statusSelect.value) qs.set('status', statusSelect.value);

    try {
      const data = await API.get('/procurements?' + qs.toString());
      if (!data.requests.length) {
        listBox.innerHTML = `<div class="empty-state"><i class="bi bi-basket"></i>
          No procurement request yet. Fill the form in the “New request” tab to create one.</div>`;
        return;
      }
      listBox.innerHTML = data.requests.map(r => {
        const steps = r.status_flow.map((s, i) => {
          const cls = i < r.status_index ? 'done' : i === r.status_index ? 'current' : '';
          return `<div class="step ${cls}">${s}</div>`;
        }).join('');
        const done = r.status === 'Completed';
        return `
        <div class="card p-3 p-md-4 mb-3">
          <div class="d-flex flex-wrap justify-content-between gap-2 mb-3">
            <div>
              <div class="d-flex flex-wrap align-items-center gap-2">
                <h3 class="h5 mb-0">${UI.escapeHtml(r.crop)} · ${r.quantity} ${UI.escapeHtml(r.unit)}</h3>
                <span class="badge-status ${UI.statusClass(r.status)}">${UI.escapeHtml(r.status)}</span>
              </div>
              <div class="text-muted small">${UI.escapeHtml(r.centre_name)} · ${UI.formatDate(r.created_at)} ${UI.formatTime(r.created_at)}</div>
              <div class="text-muted small">Procurement ID ${UI.escapeHtml(r.procurement_no)}</div>
            </div>
            <div class="text-end">
              ${done && r.amount ? `<div class="h5 mb-0">${UI.money(r.amount)}</div>
                 <div class="small text-muted">${UI.escapeHtml(r.txn_no || '')}</div>` : ''}
            </div>
          </div>
          <div class="tracker mb-3">${steps}</div>
          <div class="d-flex flex-wrap gap-2">
            ${done
              ? `<a class="btn btn-sm btn-farm" href="receipts.html?txn=${encodeURIComponent(r.txn_no)}">
                   <i class="bi bi-receipt me-1"></i>View digital receipt</a>`
              : `<button class="btn btn-sm btn-outline-farm" data-advance="${r.id}">
                   <i class="bi bi-arrow-right-circle me-1"></i>Move to next stage (demo)</button>`}
            ${r.status === 'Submitted'
              ? `<button class="btn btn-sm btn-outline-danger" data-cancel="${r.id}">Cancel request</button>` : ''}
          </div>
        </div>`;
      }).join('');

      listBox.querySelectorAll('[data-advance]').forEach(btn => btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          const r = await API.post(`/procurements/${btn.dataset.advance}/advance`);
          UI.toast(r.message, 'success');
          if (r.transaction) UI.toast(`Receipt ${r.transaction.txn_no} generated.`, 'success');
          loadRequests();
          UI.refreshNotificationCount();
        } catch (e) { UI.toast(e.message, 'error'); btn.disabled = false; }
      }));

      listBox.querySelectorAll('[data-cancel]').forEach(btn => btn.addEventListener('click', async () => {
        if (!confirm('Cancel this procurement request?')) return;
        try {
          const r = await API.del(`/procurements/${btn.dataset.cancel}`);
          UI.toast(r.message, 'success');
          loadRequests();
        } catch (e) { UI.toast(e.message, 'error'); }
      }));

    } catch (e) {
      listBox.innerHTML = `<div class="empty-state text-danger"><i class="bi bi-wifi-off"></i>${UI.escapeHtml(e.message)}</div>`;
    }
  }
});
