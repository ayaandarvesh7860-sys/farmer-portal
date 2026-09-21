/** profile.js - view and edit the farmer profile. */
document.addEventListener('DOMContentLoaded', () => {
  if (!UI.requireFarmer()) return;

  const form = document.getElementById('profile-form');
  let current = null;

  load();

  document.getElementById('change-photo').addEventListener('click', () => document.getElementById('photo-input').click());

  document.getElementById('photo-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { UI.toast('Choose a photo smaller than 5 MB.', 'error'); return; }
    const data = new FormData();
    data.append('photo', file);
    try {
      const r = await API.upload('/farmers/me/photo', data);
      UI.toast(r.message, 'success');
      load();
    } catch (err) { UI.toast(err.message, 'error'); }
    e.target.value = '';
  });

  document.getElementById('reset-profile').addEventListener('click', (e) => {
    e.preventDefault();
    if (current) fill(current);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    form.classList.add('was-validated');
    if (!form.checkValidity()) return;
    try {
      const data = await API.put('/farmers/me', {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        state: form.state.value,
        district: form.district.value.trim(),
        village: form.village.value.trim()
      });
      current = data.farmer;
      API.updateUser(data.farmer);
      UI.toast(data.message, 'success');
      fill(current);
    } catch (err) {
      UI.showFieldErrors(form, err.errors);
      UI.toast(err.message, 'error');
    }
  });

  async function load() {
    try {
      const data = await API.get('/farmers/me');
      current = data.farmer;
      API.updateUser(current);
      fill(current);
    } catch (e) { UI.toast(e.message, 'error'); }
  }

  function fill(f) {
    document.getElementById('p-name').textContent = f.name;
    document.getElementById('p-code').textContent = `Farmer ID ${f.farmer_code}`;
    form.name.value = f.name;
    form.mobile.value = f.mobile;
    form.email.value = f.email || '';
    form.state.value = f.state;
    form.district.value = f.district;
    form.village.value = f.village;
    if (f.photo) {
      document.getElementById('profile-photo').src = `${API.BASE}/farmers/photo/${encodeURIComponent(f.photo)}`;
    }
  }
});
