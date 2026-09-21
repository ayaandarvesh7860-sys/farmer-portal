/** auth.js - login, registration and the demo password reset. */
document.addEventListener('DOMContentLoaded', () => {

  // Already logged in? Go straight to the dashboard.
  if (API.isLoggedIn() && !API.isAdmin()) {
    const page = UI.currentPage();
    if (page === 'login.html' || page === 'register.html') location.href = 'dashboard.html';
  }

  const params = new URLSearchParams(location.search);
  if (params.get('expired')) document.getElementById('expired-note')?.classList.remove('d-none');

  /* ------------------------------ login ------------------------------ */
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      loginForm.classList.add('was-validated');
      if (!loginForm.checkValidity()) return;

      const btn = document.getElementById('login-submit');
      btn.disabled = true; btn.textContent = 'Checking…';
      try {
        const data = await API.post('/auth/login', {
          loginId: loginForm.loginId.value.trim(),
          password: loginForm.password.value
        });
        API.setSession(data.token, data.user);
        UI.toast(`Welcome back, ${data.user.name}.`, 'success');
        const next = params.get('next');
        setTimeout(() => location.href = next && /^[\w.-]+\.html$/.test(next) ? next : 'dashboard.html', 500);
      } catch (err) {
        UI.toast(err.message, 'error');
        btn.disabled = false; btn.textContent = 'Log in';
      }
    });
  }

  /* ---------------------------- register ----------------------------- */
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    // Keep the mobile field to digits only, which avoids most typing mistakes.
    registerForm.mobile.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
    });

    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      registerForm.classList.add('was-validated');
      if (!registerForm.checkValidity()) return;
      if (!/^[6-9]\d{9}$/.test(registerForm.mobile.value)) {
        registerForm.mobile.classList.add('is-invalid');
        UI.toast('Enter a valid 10-digit Indian mobile number.', 'error');
        return;
      }

      const btn = document.getElementById('register-submit');
      btn.disabled = true; btn.textContent = 'Creating account…';
      try {
        const data = await API.post('/auth/register', {
          name: registerForm.name.value.trim(),
          mobile: registerForm.mobile.value.trim(),
          email: registerForm.email.value.trim(),
          password: registerForm.password.value,
          state: registerForm.state.value,
          district: registerForm.district.value.trim(),
          village: registerForm.village.value.trim()
        });
        API.setSession(data.token, data.user);
        UI.toast(`Account created. Your farmer ID is ${data.user.farmer_code}.`, 'success');
        setTimeout(() => location.href = 'dashboard.html', 900);
      } catch (err) {
        UI.showFieldErrors(registerForm, err.errors);
        UI.toast(err.message, 'error');
        btn.disabled = false; btn.textContent = 'Create account';
      }
    });
  }

  /* ------------------------- forgot password ------------------------- */
  const forgotForm = document.getElementById('forgot-form');
  if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const data = await API.post('/auth/forgot-password', {
          mobile: forgotForm.mobile.value.trim(),
          newPassword: forgotForm.newPassword.value
        });
        UI.toast(data.message, 'success');
        bootstrap.Modal.getInstance(document.getElementById('forgotModal'))?.hide();
        forgotForm.reset();
      } catch (err) {
        UI.toast(err.message, 'error');
      }
    });
  }
});
