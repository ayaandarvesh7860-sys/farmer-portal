/** home.js - live centre snapshot shown in the hero panel of index.html. */
document.addEventListener('DOMContentLoaded', async () => {
  const box = document.getElementById('hero-centres');
  if (!box) return;
  try {
    const data = await API.get('/centres?sort=queue');
    const open = data.centres.filter(c => c.status !== 'Closed');
    document.getElementById('hero-centre-count').textContent = data.centres.length;
    document.getElementById('hero-queue').textContent =
      data.centres.reduce((s, c) => s + c.queue_count, 0);

    if (!open.length) {
      box.innerHTML = '<p class="mb-0">No centre is open right now. Check again during working hours.</p>';
      return;
    }
    box.innerHTML = open.slice(0, 3).map(c => `
      <div class="d-flex justify-content-between align-items-start gap-2 py-2 border-bottom">
        <div>
          <div class="fw-semibold text-dark">${UI.escapeHtml(c.name)}</div>
          <div class="small">${UI.escapeHtml(c.hours)} · ${c.queue_count} in queue · about ${c.waiting_minutes} min wait</div>
        </div>
        <span class="badge-status ${UI.statusClass(c.status)}">${c.status}</span>
      </div>`).join('');
  } catch (e) {
    box.innerHTML = `<p class="mb-0 text-danger">${UI.escapeHtml(e.message)}</p>`;
  }
});
