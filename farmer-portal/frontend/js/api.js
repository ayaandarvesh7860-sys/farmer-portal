/**
 * api.js - one place for every call to the backend.
 * The login token is kept in localStorage and attached to each request.
 */
const API = (function () {
  // Works whether you open the site through the Express server (same origin)
  // or through VS Code Live Server on port 5500 (then it points to :5000).
  const BASE = (location.port === '5500' || location.protocol === 'file:')
    ? 'http://localhost:5000/api'
    : '/api';

  const TOKEN_KEY = 'sfp_token';
  const USER_KEY = 'sfp_user';

  function token() { return localStorage.getItem(TOKEN_KEY); }
  function user() {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
    catch (e) { return null; }
  }
  function setSession(t, u) {
    localStorage.setItem(TOKEN_KEY, t);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
  }
  function updateUser(u) { localStorage.setItem(USER_KEY, JSON.stringify(u)); }
  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
  function isLoggedIn() { return !!token(); }
  function isAdmin() { const u = user(); return !!u && u.role === 'admin'; }

  async function request(path, { method = 'GET', body, isForm = false } = {}) {
    const headers = {};
    if (!isForm) headers['Content-Type'] = 'application/json';
    if (token()) headers['Authorization'] = 'Bearer ' + token();

    let response;
    try {
      response = await fetch(BASE + path, {
        method,
        headers,
        body: isForm ? body : (body ? JSON.stringify(body) : undefined)
      });
    } catch (e) {
      throw { message: 'Cannot reach the server. Make sure it is running with "npm start".' };
    }

    let data = {};
    const type = response.headers.get('content-type') || '';
    if (type.includes('application/json')) data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        clearSession();
        if (!location.pathname.endsWith('login.html')) {
          location.href = 'login.html?expired=1';
        }
      }
      throw { message: data.error || 'The request could not be completed.', errors: data.errors, status: response.status };
    }
    return data;
  }

  return {
    BASE, token, user, setSession, updateUser, clearSession, isLoggedIn, isAdmin,
    get: (p) => request(p),
    post: (p, body) => request(p, { method: 'POST', body }),
    put: (p, body) => request(p, { method: 'PUT', body }),
    patch: (p, body) => request(p, { method: 'PATCH', body }),
    del: (p) => request(p, { method: 'DELETE' }),
    upload: (p, formData) => request(p, { method: 'POST', body: formData, isForm: true })
  };
})();
