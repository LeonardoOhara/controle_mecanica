export function bindAuth() {
  const AUTH_KEY = 'oficina-control-auth';
  const loginForm = document.getElementById('login-form');
  const loginScreen = document.getElementById('login-screen');
  const appScreen = document.getElementById('app-screen');
  const loginError = document.getElementById('login-error');
  const btnLogout = document.getElementById('btn-logout');

  function setLoggedIn(value) {
    localStorage.setItem(AUTH_KEY, value ? 'true' : 'false');
  }

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
    loginForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const user = document.getElementById('login-user')?.value.trim();
      const pass = document.getElementById('login-pass')?.value;

      if (user === 'admin' && pass === 'admin123') {
        setLoggedIn(true);
        if (loginError) loginError.style.display = 'none';
        showApp();
      } else {
        if (loginError) loginError.style.display = 'block';
      }
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      setLoggedIn(false);
      showLogin();
      const loginUser = document.getElementById('login-user');
      const loginPass = document.getElementById('login-pass');
      if (loginUser) loginUser.value = '';
      if (loginPass) loginPass.value = '';
    });
  }
}
