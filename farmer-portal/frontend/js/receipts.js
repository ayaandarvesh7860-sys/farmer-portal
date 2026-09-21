/** receipts.js - list, view, print, download and share digital receipts. */
document.addEventListener('DOMContentLoaded', () => {
  if (!UI.requireFarmer()) return;

  const listBox = document.getElementById('receipt-list');
  const viewBox = document.getElementById('receipt-view');
  const search = document.getElementById('receipt-search');
  const wanted = new URLSearchParams(location.search).get('txn');

  let all = [];
  load();

  search.addEventListener('input', renderList);

  async function load() {
    try {
      const data = await API.get('/transactions');
      all = data.transactions;
      renderList();
      if (wanted) openReceipt(wanted);
      else if (all.length) openReceipt(all[0].txn_no);
    } catch (e) {
      listBox.innerHTML = `<p class="text-danger small mb-0">${UI.escapeHtml(e.message)}</p>`;
    }
  }

  function renderList() {
    const q = search.value.trim().toLowerCase();
    const rows = all.filter(t => !q ||
      [t.txn_no, t.crop, t.centre_name].join(' ').toLowerCase().includes(q));

    if (!rows.length) {
      listBox.innerHTML = `<div class="empty-state p-3"><i class="bi bi-receipt"></i>
        ${all.length ? 'No receipt matches this search.' : 'No receipt yet. Complete a procurement to get one.'}</div>`;
      return;
    }
    listBox.innerHTML = rows.map(t => `
      <button class="btn w-100 text-start border rounded mb-2 p-2" data-open="${UI.escapeHtml(t.txn_no)}">
        <div class="fw-semibold">${UI.escapeHtml(t.crop)} · ${t.quantity} ${UI.escapeHtml(t.unit)}</div>
        <div class="small text-muted">${UI.escapeHtml(t.txn_no)}</div>
        <div class="small text-muted">${UI.formatDate(t.created_at)} · ${UI.money(t.amount)}</div>
      </button>`).join('');

    listBox.querySelectorAll('[data-open]').forEach(b =>
      b.addEventListener('click', () => openReceipt(b.dataset.open)));
  }

  async function openReceipt(txnNo) {
    try {
      const data = await API.get(`/transactions/${encodeURIComponent(txnNo)}/receipt`);
      renderReceipt(data.receipt);
    } catch (e) {
      viewBox.innerHTML = `<div class="empty-state text-danger"><i class="bi bi-exclamation-circle"></i>${UI.escapeHtml(e.message)}</div>`;
    }
  }

  function renderReceipt(r) {
    viewBox.innerHTML = `
      <div class="receipt" id="receipt-printable">
        <div class="receipt-head text-center">
          <h3>DIGITAL PROCUREMENT RECEIPT</h3>
          <p class="mb-0 text-muted small">Smart Farmer Procurement &amp; Assistance Portal</p>
        </div>
        <dl>
          <dt>Farmer name</dt><dd>${UI.escapeHtml(r.farmer_name)}</dd>
          <dt>Farmer ID</dt><dd>${UI.escapeHtml(r.farmer_code)}</dd>
          <dt>Village</dt><dd>${UI.escapeHtml(r.village)}, ${UI.escapeHtml(r.district)}, ${UI.escapeHtml(r.state)}</dd>
          <dt>Crop</dt><dd>${UI.escapeHtml(r.crop)}${r.variety ? ' · ' + UI.escapeHtml(r.variety) : ''}</dd>
          <dt>Quantity</dt><dd>${r.quantity} ${UI.escapeHtml(r.unit)}</dd>
          <dt>Rate</dt><dd>${UI.money(r.rate)} per ${UI.escapeHtml(r.unit)}</dd>
          <dt>Date</dt><dd>${UI.formatDate(r.created_at)}</dd>
          <dt>Time</dt><dd>${UI.formatTime(r.created_at)}</dd>
          <dt>Procurement centre</dt><dd>${UI.escapeHtml(r.centre_name)}<br>
            <span class="fw-normal text-muted small">${UI.escapeHtml(r.centre_address)} · ${UI.escapeHtml(r.centre_contact)}</span></dd>
          <dt>Procurement ID</dt><dd>${UI.escapeHtml(r.procurement_no)}</dd>
          <dt>Transaction number</dt><dd>${UI.escapeHtml(r.txn_no)}</dd>
          <dt>Vehicle</dt><dd>${UI.escapeHtml(r.vehicle_no || 'Not recorded')}</dd>
          <dt>Status</dt><dd><span class="badge-status st-completed">${UI.escapeHtml(r.status.toUpperCase())}</span></dd>
        </dl>
        <div class="receipt-total">
          <span>Total amount</span><span>${UI.money(r.amount)}</span>
        </div>
        <div class="receipt-foot">
          This is a computer generated receipt from a demonstration project and does not require a
          signature. Keep the transaction number for payment queries and scheme claims.
        </div>
      </div>

      <div class="d-flex flex-wrap gap-2 justify-content-center mt-4 no-print">
        <button class="btn btn-farm" id="btn-print"><i class="bi bi-printer me-1"></i>Print receipt</button>
        <button class="btn btn-outline-farm" id="btn-download"><i class="bi bi-download me-1"></i>Download receipt</button>
        <button class="btn btn-outline-farm" id="btn-share"><i class="bi bi-share me-1"></i>Share receipt</button>
        <a class="btn btn-outline-secondary" href="transactions.html"><i class="bi bi-clock-history me-1"></i>All transactions</a>
      </div>`;

    document.getElementById('btn-print').addEventListener('click', () => window.print());
    document.getElementById('btn-download').addEventListener('click', () => downloadReceipt(r));
    document.getElementById('btn-share').addEventListener('click', () => shareReceipt(r));
  }

  /** Saves the receipt as a standalone HTML file that opens and prints anywhere. */
  function downloadReceipt(r) {
    const body = document.getElementById('receipt-printable').outerHTML;
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
      <title>Receipt ${r.txn_no}</title>
      <style>
        body{font-family:'Mukta',Arial,sans-serif;background:#fff;color:#1B231D;padding:24px}
        .receipt{max-width:720px;margin:0 auto;border:1px solid #D8E2DA;border-radius:16px;padding:28px}
        .receipt-head{border-bottom:3px double #14703A;padding-bottom:12px;margin-bottom:18px;text-align:center}
        .receipt dl{display:grid;grid-template-columns:40% 1fr;gap:8px 16px;margin:0}
        .receipt dt{color:#5E6B62}.receipt dd{margin:0;font-weight:600}
        .receipt-total{background:#E4F3E8;border-radius:10px;padding:14px;margin-top:18px;
          display:flex;justify-content:space-between;font-weight:700}
        .receipt-foot{margin-top:20px;padding-top:12px;border-top:1px dashed #D8E2DA;color:#5E6B62;font-size:13px}
        .badge-status{background:#14703A;color:#fff;padding:3px 10px;border-radius:999px;font-size:13px}
      </style></head><body>${body}</body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `receipt-${r.txn_no}.html`;
    link.click();
    URL.revokeObjectURL(link.href);
    UI.toast('Receipt downloaded. Open the file to print or save it as PDF.', 'success');
  }

  async function shareReceipt(r) {
    const text = `Digital procurement receipt\nFarmer: ${r.farmer_name} (${r.farmer_code})\n` +
      `Crop: ${r.crop}, ${r.quantity} ${r.unit}\nCentre: ${r.centre_name}\n` +
      `Amount: ₹${r.amount}\nTransaction: ${r.txn_no}\nDate: ${UI.formatDate(r.created_at)}`;
    if (navigator.share) {
      try { await navigator.share({ title: `Receipt ${r.txn_no}`, text }); return; }
      catch (e) { /* the farmer closed the share sheet */ }
    }
    try {
      await navigator.clipboard.writeText(text);
      UI.toast('Receipt details copied. Paste them into WhatsApp or SMS.', 'success');
    } catch (e) {
      UI.toast('Sharing is not available in this browser.', 'warning');
    }
  }
});
