/** admin.js - administrator login and dashboard management. */
document.addEventListener('DOMContentLoaded', () => {
  const loginView = document.getElementById('admin-login-view');
  const dashView = document.getElementById('admin-dashboard-view');
  const loginForm = document.getElementById('admin-login-form');
  const centreForm = document.getElementById('centre-form');
  let statusFlow = [];
  let centreCache = [];

  if (API.isAdmin()) showDashboard();

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginForm.classList.add('was-validated');
    if (!loginForm.checkValidity()) return;
    try {
      const data = await API.post('/auth/admin/login', {
        username: loginForm.username.value.trim(),
        password: loginForm.password.value
      });
      API.setSession(data.token, data.user);
      UI.toast('Logged in as administrator.', 'success');
      location.reload();
    } catch (err) { UI.toast(err.message, 'error'); }
  });

  document.getElementById('admin-refresh').addEventListener('click', loadAll);
  document.getElementById('add-centre').addEventListener('click', () => openCentreModal(null));
  centreForm.addEventListener('submit', saveCentre);

  function showDashboard() {
    loginView.classList.add('d-none');
    dashView.classList.remove('d-none');
    loadAll();
  }

  function loadAll() {
    loadStats(); loadRequests(); loadCentres(); loadFarmers(); loadDocuments(); loadTransactions();
  }

  async function loadStats() {
    try {
      const s = await API.get('/admin/stats');
      document.getElementById('a-farmers').textContent = s.totalFarmers;
      document.getElementById('a-centres').textContent = s.totalCentres;
      document.getElementById('a-active').textContent = s.activeRequests;
      document.getElementById('a-completed').textContent = s.completedTransactions;
      document.getElementById('a-docs').textContent = s.pendingDocuments;
      document.getElementById('a-queue').textContent = s.totalQueue;
      document.getElementById('a-amount').textContent = UI.money(s.totalAmount);
    } catch (e) { UI.toast(e.message, 'error'); }
  }

  async function loadRequests() {
    const body = document.getElementById('admin-requests');
    try {
      const data = await API.get('/admin/requests');
      statusFlow = data.flow;
      if (!data.requests.length) {
        body.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No procurement requests yet.</td></tr>`;
        return;
      }
      body.innerHTML = data.requests.map(r => `
        <tr>
          <td>${UI.escapeHtml(r.procurement_no)}<br><span class="small text-muted">${UI.formatDate(r.created_at)}</span></td>
          <td>${UI.escapeHtml(r.farmer_name)}<br><span class="small text-muted">${UI.escapeHtml(r.farmer_code)}</span></td>
          <td>${UI.escapeHtml(r.crop)}</td>
          <td>${r.quantity} ${UI.escapeHtml(r.unit)}</td>
          <td>${UI.escapeHtml(r.centre_name)}</td>
          <td><span class="badge-status ${UI.statusClass(r.status)}">${UI.escapeHtml(r.status)}</span></td>
          <td>
            <select class="form-select form-select-sm" data-status-for="${r.id}" ${r.status === 'Completed' ? 'disabled' : ''}>
              ${statusFlow.map(s => `<option ${s === r.status ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </td>
        </tr>`).join('');

      body.querySelectorAll('[data-status-for]').forEach(sel => sel.addEventListener('change', async () => {
        try {
          const r = await API.patch(`/admin/requests/${sel.dataset.statusFor}/status`, { status: sel.value });
          UI.toast(r.message, 'success');
          loadRequests(); loadStats(); loadTransactions();
        } catch (e) { UI.toast(e.message, 'error'); loadRequests(); }
      }));
    } catch (e) {
      body.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">${UI.escapeHtml(e.message)}</td></tr>`;
    }
  }

  async function loadCentres() {
    const body = document.getElementById('admin-centres');
    try {
      const data = await API.get('/admin/centres');
      centreCache = data.centres;
      body.innerHTML = data.centres.map(c => `
        <tr>
          <td>${UI.escapeHtml(c.name)}<br><span class="small text-muted">${UI.escapeHtml(c.address)}</span></td>
          <td>${UI.escapeHtml(c.district)}</td>
          <td>${UI.escapeHtml(c.open_time)} - ${UI.escapeHtml(c.close_time)}</td>
          <td>${c.queue_count}</td>
          <td><span class="badge-status ${UI.statusClass(c.status)}">${UI.escapeHtml(c.status)}</span></td>
          <td class="small">${UI.escapeHtml(c.crops)}</td>
          <td class="text-nowrap">
            <button class="btn btn-sm btn-outline-farm" data-edit-centre="${c.id}">Edit</button>
            <button class="btn btn-sm btn-outline-danger" data-delete-centre="${c.id}">Delete</button>
          </td>
        </tr>`).join('');

      body.querySelectorAll('[data-edit-centre]').forEach(btn => btn.addEventListener('click', () => {
        const centre = centreCache.find(c => String(c.id) === btn.dataset.editCentre);
        if (centre) openCentreModal(centre);
      }));

      body.querySelectorAll('[data-delete-centre]').forEach(btn => btn.addEventListener('click', async () => {
        if (!confirm('Remove this centre from the portal?')) return;
        try {
          const r = await API.del('/admin/centres/' + btn.dataset.deleteCentre);
          UI.toast(r.message, 'success');
          loadCentres(); loadStats();
        } catch (e) { UI.toast(e.message, 'error'); }
      }));
    } catch (e) {
      body.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">${UI.escapeHtml(e.message)}</td></tr>`;
    }
  }

  function openCentreModal(centre) {
    document.getElementById('centre-modal-title').textContent = centre ? 'Edit procurement centre' : 'Add procurement centre';
    centreForm.classList.remove('was-validated');
    document.getElementById('centre-id').value = centre ? centre.id : '';
    centreForm.name.value = centre ? centre.name : '';
    centreForm.address.value = centre ? centre.address : '';
    centreForm.village.value = centre ? (centre.village || '') : '';
    centreForm.district.value = centre ? centre.district : '';
    centreForm.state.value = centre ? centre.state : 'Maharashtra';
    centreForm.latitude.value = centre ? centre.latitude : '';
    centreForm.longitude.value = centre ? centre.longitude : '';
    centreForm.open_time.value = centre ? centre.open_time : '09:00';
    centreForm.close_time.value = centre ? centre.close_time : '17:00';
    centreForm.queue_count.value = centre ? centre.queue_count : 0;
    centreForm.minutes_per_farmer.value = centre ? centre.minutes_per_farmer : 3;
    centreForm.status.value = centre ? centre.status : 'Open';
    centreForm.crops.value = centre ? centre.crops : '';
    centreForm.contact.value = centre ? centre.contact : '';
    bootstrap.Modal.getOrCreateInstance(document.getElementById('centreModal')).show();
  }

  async function saveCentre(e) {
    e.preventDefault();
    centreForm.classList.add('was-validated');
    if (!centreForm.checkValidity()) return;

    const id = document.getElementById('centre-id').value;
    const payload = {
      name: centreForm.name.value.trim(), address: centreForm.address.value.trim(),
      village: centreForm.village.value.trim(), district: centreForm.district.value.trim(),
      state: centreForm.state.value.trim(), latitude: centreForm.latitude.value,
      longitude: centreForm.longitude.value, open_time: centreForm.open_time.value,
      close_time: centreForm.close_time.value, queue_count: centreForm.queue_count.value,
      minutes_per_farmer: centreForm.minutes_per_farmer.value, status: centreForm.status.value,
      crops: centreForm.crops.value.trim(), contact: centreForm.contact.value.trim()
    };
    try {
      const r = id ? await API.put('/admin/centres/' + id, payload) : await API.post('/admin/centres', payload);
      UI.toast(r.message, 'success');
      bootstrap.Modal.getInstance(document.getElementById('centreModal')).hide();
      loadCentres(); loadStats();
    } catch (err) {
      UI.showFieldErrors(centreForm, err.errors);
      UI.toast(err.message, 'error');
    }
  }

  async function loadFarmers() {
    const body = document.getElementById('admin-farmers');
    try {
      const data = await API.get('/admin/farmers');
      body.innerHTML = data.farmers.map(f => `
        <tr>
          <td>${UI.escapeHtml(f.farmer_code)}</td>
          <td>${UI.escapeHtml(f.name)}</td>
          <td>${UI.escapeHtml(f.mobile)}</td>
          <td>${UI.escapeHtml(f.village)}, ${UI.escapeHtml(f.district)}</td>
          <td>${f.documents} / 6</td>
          <td>${f.requests}</td>
          <td><button class="btn btn-sm btn-outline-danger" data-delete-farmer="${f.id}">Remove</button></td>
        </tr>`).join('');

      body.querySelectorAll('[data-delete-farmer]').forEach(btn => btn.addEventListener('click', async () => {
        if (!confirm('Remove this farmer account and all its records?')) return;
        try {
          const r = await API.del('/admin/farmers/' + btn.dataset.deleteFarmer);
          UI.toast(r.message, 'success');
          loadFarmers(); loadStats();
        } catch (e) { UI.toast(e.message, 'error'); }
      }));
    } catch (e) {
      body.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">${UI.escapeHtml(e.message)}</td></tr>`;
    }
  }

  async function loadDocuments() {
    const body = document.getElementById('admin-documents');
    const options = ['Uploaded', 'Under Verification', 'Verified', 'Rejected'];
    try {
      const data = await API.get('/admin/documents');
      if (!data.documents.length) {
        body.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No documents uploaded yet.</td></tr>`;
        return;
      }
      body.innerHTML = data.documents.map(d => `
        <tr>
          <td>${UI.escapeHtml(d.farmer_name)}<br><span class="small text-muted">${UI.escapeHtml(d.farmer_code)}</span></td>
          <td>${UI.escapeHtml(d.doc_type)}</td>
          <td class="small">${UI.escapeHtml(d.file_name)}<br><span class="text-muted">${d.size_kb} KB</span></td>
          <td>${UI.formatDate(d.uploaded_at)}</td>
          <td><span class="badge-status ${UI.statusClass(d.status)}">${UI.escapeHtml(d.status)}</span></td>
          <td>
            <select class="form-select form-select-sm" data-doc-status="${d.id}">
              ${options.map(o => `<option ${o === d.status ? 'selected' : ''}>${o}</option>`).join('')}
            </select>
          </td>
        </tr>`).join('');

      body.querySelectorAll('[data-doc-status]').forEach(sel => sel.addEventListener('change', async () => {
        try {
          const r = await API.patch(`/admin/documents/${sel.dataset.docStatus}/status`, { status: sel.value });
          UI.toast(r.message, 'success');
          loadDocuments(); loadStats();
        } catch (e) { UI.toast(e.message, 'error'); }
      }));
    } catch (e) {
      body.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">${UI.escapeHtml(e.message)}</td></tr>`;
    }
  }

  async function loadTransactions() {
    const body = document.getElementById('admin-transactions');
    try {
      const data = await API.get('/admin/transactions');
      if (!data.transactions.length) {
        body.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No transactions yet.</td></tr>`;
        return;
      }
      body.innerHTML = data.transactions.map(t => `
        <tr>
          <td>${UI.escapeHtml(t.txn_no)}</td>
          <td>${UI.escapeHtml(t.farmer_name)}<br><span class="small text-muted">${UI.escapeHtml(t.farmer_code)}</span></td>
          <td>${UI.escapeHtml(t.crop)}</td>
          <td>${t.quantity} ${UI.escapeHtml(t.unit)}</td>
          <td>${UI.escapeHtml(t.centre_name)}</td>
          <td class="text-end fw-semibold">${UI.money(t.amount)}</td>
          <td>${UI.formatDate(t.created_at)}</td>
        </tr>`).join('');
    } catch (e) {
      body.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">${UI.escapeHtml(e.message)}</td></tr>`;
    }
  }
});
