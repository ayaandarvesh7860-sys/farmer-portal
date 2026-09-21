/**
 * centres.js - nearby procurement centre finder.
 *
 * GOOGLE MAPS HOOK: the map below uses Leaflet + OpenStreetMap because it needs
 * no API key. To switch to Google Maps later, replace renderMap() with the
 * Google Maps JavaScript API and read your key from a config value.
 */
document.addEventListener('DOMContentLoaded', () => {
  const listBox = document.getElementById('centre-list');
  const noteBox = document.getElementById('location-note');
  const searchInput = document.getElementById('search');
  const cropFilter = document.getElementById('crop-filter');
  const statusFilter = document.getElementById('status-filter');
  const sortSelect = document.getElementById('sort');

  let position = null;          // { lat, lng } once the farmer shares location
  let centres = [];
  let map = null, markerLayer = null;

  loadCropOptions();
  load();

  // Debounced search so the list updates while typing without flooding the API.
  let timer;
  searchInput.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(load, 300); });
  [cropFilter, statusFilter, sortSelect].forEach(el => el.addEventListener('change', load));
  document.getElementById('use-location').addEventListener('click', askLocation);
  document.getElementById('map-tab').addEventListener('shown.bs.tab', () => renderMap());

  async function loadCropOptions() {
    try {
      const data = await API.get('/centres/crops');
      data.crops.forEach(c => cropFilter.insertAdjacentHTML('beforeend', `<option>${UI.escapeHtml(c)}</option>`));
    } catch (e) { /* the filter simply stays as "All crops" */ }
  }

  function askLocation() {
    if (!navigator.geolocation) {
      UI.toast('This browser cannot read your location. Search by village name instead.', 'warning');
      return;
    }
    noteBox.textContent = 'Asking your browser for permission to read your location…';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        position = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        noteBox.innerHTML = `Using your current location (${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}).
          Centres are now sorted by distance from you.`;
        UI.toast('Location found. Centres sorted by distance.', 'success');
        load();
      },
      (err) => {
        // Permission refused or unavailable: fall back to the demo location so
        // that distances can still be demonstrated in class.
        position = { lat: 19.9975, lng: 73.7898 };     // Nashik, demo fallback
        noteBox.innerHTML = `Location access was not available (${UI.escapeHtml(err.message)}).
          Showing distances from the demo location, Nashik. You can also search by village name.`;
        UI.toast('Using the demo location instead.', 'warning');
        load();
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }

  async function load() {
    const params = new URLSearchParams();
    if (position) { params.set('lat', position.lat); params.set('lng', position.lng); }
    if (searchInput.value.trim()) params.set('q', searchInput.value.trim());
    if (cropFilter.value) params.set('crop', cropFilter.value);
    if (statusFilter.value) params.set('status', statusFilter.value);
    params.set('sort', sortSelect.value);

    try {
      const data = await API.get('/centres?' + params.toString());
      centres = data.centres;
      renderList();
      if (map) renderMap();
    } catch (e) {
      listBox.innerHTML = `<div class="empty-state text-danger"><i class="bi bi-wifi-off"></i>${UI.escapeHtml(e.message)}</div>`;
    }
  }

  function renderList() {
    if (!centres.length) {
      listBox.innerHTML = `<div class="empty-state"><i class="bi bi-search"></i>
        No centre matches this search. Try another village name or clear the crop filter.</div>`;
      return;
    }
    listBox.innerHTML = centres.map(c => `
      <div class="card centre-card p-3 p-md-4 mb-3">
        <div class="d-flex flex-wrap justify-content-between gap-2">
          <div class="flex-grow-1">
            <div class="d-flex flex-wrap align-items-center gap-2 mb-1">
              <h3 class="h5 mb-0">${UI.escapeHtml(c.name)}</h3>
              <span class="badge-status ${UI.statusClass(c.status)}">${UI.escapeHtml(c.status)}</span>
            </div>
            <p class="text-muted mb-2">${UI.escapeHtml(c.address)}</p>
            <div class="centre-meta mb-2">
              <span><i class="bi bi-clock me-1"></i>${UI.escapeHtml(c.hours)}</span>
              <span><i class="bi bi-people me-1"></i>${c.queue_count} farmers in queue</span>
              <span><i class="bi bi-hourglass-split me-1"></i>${c.status === 'Closed' ? 'Closed today' : 'about ' + c.waiting_minutes + ' min wait'}</span>
              <span><i class="bi bi-telephone me-1"></i>${UI.escapeHtml(c.contact)}</span>
            </div>
            <div class="d-flex flex-wrap gap-2">
              ${c.crops.map(x => `<span class="crop-chip">${UI.escapeHtml(x)}</span>`).join('')}
            </div>
          </div>
          <div class="text-lg-end">
            ${c.distance_km !== null
              ? `<div class="distance-chip mb-2"><i class="bi bi-signpost-split me-1"></i>${c.distance_km} km away</div>`
              : `<div class="text-muted small mb-2">Share your location for distance</div>`}
            <div class="d-flex flex-wrap gap-2 justify-content-lg-end">
              <a class="btn btn-sm btn-outline-farm"
                 href="https://www.openstreetmap.org/directions?to=${c.latitude}%2C${c.longitude}"
                 target="_blank" rel="noopener"><i class="bi bi-signpost-2 me-1"></i>Get directions</a>
              <a class="btn btn-sm btn-farm" href="procurement.html?centre=${c.id}">Select this centre</a>
            </div>
          </div>
        </div>
      </div>`).join('');
  }

  function renderMap() {
    if (!centres.length) return;
    if (!map) {
      map = L.map('centre-map');
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18, attribution: '© OpenStreetMap contributors'
      }).addTo(map);
      markerLayer = L.layerGroup().addTo(map);
    }
    markerLayer.clearLayers();

    const points = [];
    centres.forEach(c => {
      const marker = L.marker([c.latitude, c.longitude]).bindPopup(
        `<strong>${UI.escapeHtml(c.name)}</strong><br>${UI.escapeHtml(c.address)}<br>
         ${UI.escapeHtml(c.hours)} · ${c.queue_count} in queue<br>
         <a href="procurement.html?centre=${c.id}">Select this centre</a>`);
      markerLayer.addLayer(marker);
      points.push([c.latitude, c.longitude]);
    });
    if (position) {
      markerLayer.addLayer(L.circleMarker([position.lat, position.lng],
        { radius: 9, color: '#E0A02C', fillColor: '#E0A02C', fillOpacity: .9 }).bindPopup('Your location'));
      points.push([position.lat, position.lng]);
    }
    map.fitBounds(L.latLngBounds(points).pad(0.2));
    setTimeout(() => map.invalidateSize(), 150);
  }
});
