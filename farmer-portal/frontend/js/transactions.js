/** transactions.js - searchable and filterable history table. */
document.addEventListener('DOMContentLoaded', () => {
  if (!UI.requireFarmer()) return;

  const body = document.getElementById('t-body');
  const search = document.getElementById('t-search');
  const cropSel = document.getElementById('t-crop');
  const from = document.getElementById('t-from');
  const to = document.getElementById('t-to');

  loadCrops();
  load();

  let timer;
  search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(load, 300); });
  [cropSel, from, to].forEach(el => el.addEventListener('change', load));
  document.getElementById('t-clear').addEventListener('click', () => {
    search.value = ''; cropSel.value = ''; from.value = ''; to.value = ''; load();
  });

  async function loadCrops() {
    try {
      const data = await API.get('/crops');
      data.crops.forEach(c => cropSel.insertAdjacentHTML('beforeend', `<option>${UI.escapeHtml(c.name_en)}</option>`));
    } catch (e) { /* filter stays as all crops */ }
  }

  async function load() {
    const qs = new URLSearchParams();
    if (search.value.trim()) qs.set('q', search.value.trim());
    if (cropSel.value) qs.set('crop', cropSel.value);
    if (from.value) qs.set('from', from.value);
    if (to.value) qs.set('to', to.value);

    try {
      const data = await API.get('/transactions?' + qs.toString());
      document.getElementById('t-count').textContent = data.count;
      document.getElementById('t-total').textContent = UI.money(data.totalAmount);
      document.getElementById('t-latest').textContent =
        data.transactions.length ? UI.formatDate(data.transactions[0].created_at) : '–';

      if (!data.transactions.length) {
        body.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">
          No transaction matches these filters.</td></tr>`;
        return;
      }
      body.innerHTML = data.transactions.map(t => `
        <tr>
          <td><span class="fw-semibold">${UI.escapeHtml(t.txn_no)}</span><br>
              <span class="small text-muted">${UI.escapeHtml(t.procurement_no)}</span></td>
          <td>${UI.formatDate(t.created_at)}</td>
          <td>${UI.escapeHtml(t.crop)}</td>
          <td>${t.quantity} ${UI.escapeHtml(t.unit)}</td>
          <td>${UI.escapeHtml(t.centre_name)}</td>
          <td class="text-end fw-semibold">${UI.money(t.amount)}</td>
          <td><span class="badge-status ${UI.statusClass(t.status)}">${UI.escapeHtml(t.status)}</span></td>
          <td><a class="btn btn-sm btn-outline-farm" href="receipts.html?txn=${encodeURIComponent(t.txn_no)}">View</a></td>
        </tr>`).join('');
    } catch (e) {
      body.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-danger">${UI.escapeHtml(e.message)}</td></tr>`;
    }
  }
});
