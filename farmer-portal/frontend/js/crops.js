/** crops.js - crop information guides. */
document.addEventListener('DOMContentLoaded', () => {
  const select = document.getElementById('crop-select');
  const buttons = document.getElementById('crop-buttons');
  const detail = document.getElementById('crop-detail');
  const wanted = new URLSearchParams(location.search).get('crop');

  load();

  async function load() {
    try {
      const data = await API.get('/crops');
      select.innerHTML = '<option value="">Select a crop</option>' + data.crops.map(c =>
        `<option value="${UI.escapeHtml(c.slug)}">${UI.escapeHtml(c.name_en)} · ${UI.escapeHtml(c.name_hi)} · ${UI.escapeHtml(c.name_mr)}</option>`).join('');
      buttons.innerHTML = data.crops.map(c =>
        `<button class="crop-chip border-0" data-crop="${UI.escapeHtml(c.slug)}">${UI.escapeHtml(c.name_en)}</button>`).join('');

      select.addEventListener('change', () => select.value && open(select.value));
      buttons.querySelectorAll('[data-crop]').forEach(b =>
        b.addEventListener('click', () => { select.value = b.dataset.crop; open(b.dataset.crop); }));

      if (wanted) { select.value = wanted; open(wanted); }
    } catch (e) {
      detail.innerHTML = `<div class="empty-state text-danger"><i class="bi bi-wifi-off"></i>${UI.escapeHtml(e.message)}</div>`;
    }
  }

  async function open(slug) {
    try {
      const data = await API.get('/crops/' + encodeURIComponent(slug));
      const c = data.crop;
      const block = (icon, title, text) => `
        <div class="col-md-6">
          <div class="card p-3 h-100">
            <h3 class="h6"><i class="bi ${icon} me-2 text-success"></i>${title}</h3>
            <p class="mb-0">${UI.escapeHtml(text)}</p>
          </div>
        </div>`;

      detail.innerHTML = `
        <div class="card p-4 mb-3">
          <h2 class="h4 mb-1">${UI.escapeHtml(c.name_en)}</h2>
          <p class="text-muted mb-2">${UI.escapeHtml(c.name_hi)} · ${UI.escapeHtml(c.name_mr)}</p>
          <p class="mb-0"><strong>Season.</strong> ${UI.escapeHtml(c.season)}</p>
          ${c.msp_note ? `<div class="demo-banner mt-3"><i class="bi bi-cash-coin me-1"></i>${UI.escapeHtml(c.msp_note)}</div>` : ''}
        </div>
        <div class="row g-3">
          ${block('bi-tools', 'Cultivation', c.cultivation)}
          ${block('bi-layers', 'Soil requirement', c.soil)}
          ${block('bi-droplet', 'Irrigation', c.irrigation)}
          ${block('bi-scissors', 'Harvesting', c.harvest)}
          ${block('bi-box-seam', 'Storage', c.storage)}
          ${block('bi-bug', 'Common problems', c.issues)}
          ${block('bi-shield-check', 'Precautions', c.precautions)}
        </div>
        <div class="d-flex flex-wrap gap-2 mt-3">
          <a class="btn btn-farm" href="procurement.html">Sell this crop</a>
          <a class="btn btn-outline-farm" href="assistant.html">Ask the assistant about it</a>
        </div>`;
      detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (e) {
      detail.innerHTML = `<div class="empty-state text-danger"><i class="bi bi-exclamation-circle"></i>${UI.escapeHtml(e.message)}</div>`;
    }
  }
});
