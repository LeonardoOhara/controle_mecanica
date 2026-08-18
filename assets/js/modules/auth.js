export function bindAuth() {
  const AUTH_KEY = 'oficina-control-auth';
  const loginForm = document.getElementById('login-form');
  const loginScreen = document.getElementById('login-screen');
  const appScreen = document.getElementById('app-screen');
  const loginError = document.getElementById('login-error');
  const btnLogout = document.getElementById('btn-logout');

  function showApp() {
    if (loginScreen) loginScreen.classList.add('hidden');
    if (appScreen) appScreen.classList.remove('hidden');
  }

  function showLogin() {
    if (appScreen) appScreen.classList.add('hidden');
    if (loginScreen) loginScreen.classList.remove('hidden');
  }

  if (localStorage.getItem(AUTH_KEY) === 'true') {
    showApp();
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const user = document.getElementById('login-user')?.value.trim();
      const pass = document.getElementById('login-pass')?.value;

      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user, password: pass })
        });
        if (!response.ok) throw new Error('login failed');
        localStorage.setItem(AUTH_KEY, 'true');
        if (loginError) loginError.style.display = 'none';
        showApp();
      } catch {
        if (loginError) loginError.style.display = 'block';
      }
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      fetch('/api/logout', { method: 'POST' }).catch(() => {});
      localStorage.setItem(AUTH_KEY, 'false');
      showLogin();
      const loginUser = document.getElementById('login-user');
      const loginPass = document.getElementById('login-pass');
      if (loginUser) loginUser.value = '';
      if (loginPass) loginPass.value = '';
    });
  }
}
