/** documents.js - upload, replace, view and delete the six required documents. */
document.addEventListener('DOMContentLoaded', () => {
  if (!UI.requireFarmer()) return;

  const listBox = document.getElementById('doc-list');
  const picker = document.getElementById('file-picker');
  let pendingType = null;

  load();

  picker.addEventListener('change', async () => {
    const file = picker.files[0];
    if (!file || !pendingType) return;

    // Client-side checks first, so the farmer gets an instant, clear message.
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(file.type)) {
      UI.toast('Only PDF, JPG, JPEG and PNG files can be uploaded.', 'error');
      picker.value = ''; return;
    }
    if (file.size > 5 * 1024 * 1024) {
      UI.toast('This file is larger than 5 MB. Upload a smaller file.', 'error');
      picker.value = ''; return;
    }

    const form = new FormData();
    form.append('file', file);
    try {
      const data = await API.upload(`/documents/${pendingType}`, form);
      UI.toast(data.message, 'success');
      load();
    } catch (e) {
      UI.toast(e.message, 'error');
    } finally {
      picker.value = ''; pendingType = null;
    }
  });

  async function load() {
    try {
      const data = await API.get('/documents');
      document.getElementById('progress-title').textContent =
        `${data.uploadedCount} / ${data.totalCount} documents uploaded`;
      document.getElementById('verified-count').textContent = `${data.verifiedCount} verified`;
      const bar = document.getElementById('doc-progress');
      bar.style.width = data.percent + '%';
      bar.setAttribute('aria-valuenow', data.percent);

      listBox.innerHTML = data.documents.map(d => `
        <div class="doc-row">
          <div class="doc-icon"><i class="bi ${iconFor(d.key)}"></i></div>
          <div class="flex-grow-1">
            <div class="d-flex flex-wrap align-items-center gap-2">
              <strong>${UI.escapeHtml(d.label)}</strong>
              <span class="badge-status ${UI.statusClass(d.status)}">${UI.escapeHtml(d.status)}</span>
            </div>
            <div class="text-muted small">${UI.escapeHtml(d.hint)}</div>
            ${d.uploaded ? `<div class="small mt-1">
                <i class="bi bi-paperclip me-1"></i>${UI.escapeHtml(d.file_name)}
                <span class="text-muted">· ${d.size_kb} KB · uploaded ${UI.formatDate(d.uploaded_at)}</span>
              </div>` : ''}
            <div class="d-flex flex-wrap gap-2 mt-2">
              <button class="btn btn-sm ${d.uploaded ? 'btn-outline-farm' : 'btn-farm'}" data-upload="${d.key}">
                <i class="bi bi-upload me-1"></i>${d.uploaded ? 'Replace file' : 'Upload'}
              </button>
              ${d.uploaded ? `
                <a class="btn btn-sm btn-outline-secondary" data-view="${d.id}" href="#"><i class="bi bi-eye me-1"></i>View</a>
                <button class="btn btn-sm btn-outline-danger" data-delete="${d.id}"><i class="bi bi-trash me-1"></i>Delete</button>` : ''}
            </div>
          </div>
        </div>`).join('');

      listBox.querySelectorAll('[data-upload]').forEach(btn => btn.addEventListener('click', () => {
        pendingType = btn.dataset.upload;
        picker.click();
      }));

      listBox.querySelectorAll('[data-delete]').forEach(btn => btn.addEventListener('click', async () => {
        if (!confirm('Delete this document? You can upload it again afterwards.')) return;
        try {
          const r = await API.del(`/documents/${btn.dataset.delete}`);
          UI.toast(r.message, 'success');
          load();
        } catch (e) { UI.toast(e.message, 'error'); }
      }));

      // Opening a file needs the auth header, so it is fetched and shown as a blob.
      listBox.querySelectorAll('[data-view]').forEach(link => link.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          const res = await fetch(`${API.BASE}/documents/${link.dataset.view}/file`, {
            headers: { Authorization: 'Bearer ' + API.token() }
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw { message: err.error || 'The file could not be opened.' };
          }
          const blob = await res.blob();
          window.open(URL.createObjectURL(blob), '_blank');
        } catch (err) { UI.toast(err.message, 'warning'); }
      }));

    } catch (e) {
      listBox.innerHTML = `<div class="empty-state text-danger"><i class="bi bi-wifi-off"></i>${UI.escapeHtml(e.message)}</div>`;
    }
  }

  function iconFor(key) {
    return {
      aadhaar: 'bi-person-vcard', farmer_id: 'bi-card-heading', land: 'bi-map',
      bank: 'bi-bank', crop_record: 'bi-journal-text', photo: 'bi-person-square'
    }[key] || 'bi-file-earmark';
  }
});
