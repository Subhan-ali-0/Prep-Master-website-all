'use strict';


/* =========================================================
   CONFIG
========================================================= */

const API = '/api';


/* =========================================================
   STORAGE
========================================================= */

const TOKEN_KEY = 'pm_token';
const USER_KEY = 'pm_user';
const UNLOCKED_KEY = 'pm_unlocked';
const CLIENT_KEY = 'pm_client_id';
const THEME_KEY = 'pm_theme';


/* =========================================================
   STATE
========================================================= */

let apps = [];
let currentApp = null;
let currentUser = null;
let notifications = [];


/* =========================================================
   HELPERS
========================================================= */

function $(id) {
  return document.getElementById(id);
}


function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}


function getUnlocked() {
  try {
    return JSON.parse(
      localStorage.getItem(UNLOCKED_KEY) || '[]'
    );
  } catch {
    return [];
  }
}


function saveUnlocked(list) {
  localStorage.setItem(
    UNLOCKED_KEY,
    JSON.stringify(list)
  );
}


function getClientId() {

  let id =
    localStorage.getItem(CLIENT_KEY);

  if (!id) {

    id =
      'pm-' +
      Date.now() +
      '-' +
      Math.random()
        .toString(36)
        .slice(2, 12);

    localStorage.setItem(
      CLIENT_KEY,
      id
    );
  }

  return id;
}


function escapeHtml(value) {

  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}


/* =========================================================
   TOAST
========================================================= */

let toastTimer;

function showToast(message) {

  const toast = $('toast');

  if (!toast) return;

  toast.textContent = message;

  toast.classList.add('show');

  clearTimeout(toastTimer);

  toastTimer =
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
}


/* =========================================================
   THEME
========================================================= */

function applyTheme(theme) {

  if (theme === 'dark') {
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }

  localStorage.setItem(
    THEME_KEY,
    theme
  );

  updateThemeIcon();
}


function updateThemeIcon() {

  const btn =
    $('themeBtn');

  if (!btn) return;

  btn.textContent =
    document.body.classList.contains('dark')
      ? '☾'
      : '☀';
}


function toggleTheme() {

  const dark =
    document.body.classList.contains('dark');

  applyTheme(
    dark ? 'light' : 'dark'
  );
}


/* =========================================================
   DRAWER
========================================================= */

function openDrawer() {

  $('drawer')?.classList.add('show');

  $('drawerOverlay')?.classList.add('show');
}


function closeDrawer() {

  $('drawer')?.classList.remove('show');

  $('drawerOverlay')?.classList.remove('show');
}


/* =========================================================
   HOME / EXPLORE
========================================================= */

function goHome() {

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });

  setBottomActive('bottomHome');
}


function goToApps() {

  const section =
    $('appsSection');

  if (!section) return;

  setBottomActive('bottomExplore');

  section.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
}


function setBottomActive(id) {

  document
    .querySelectorAll('.bottom-item')
    .forEach(btn => {
      btn.classList.remove('active');
    });

  $(id)?.classList.add('active');
}


/* =========================================================
   LOAD APPS
========================================================= */

async function loadApps() {

  try {

    const response =
      await fetch(
        `${API}/apps`,
        {
          headers: authHeaders()
        }
      );

    if (!response.ok) {
      throw new Error(
        'Apps load failed'
      );
    }

    const data =
      await response.json();

    apps =
      Array.isArray(data)
        ? data
        : (
            data.apps ||
            data.data ||
            []
          );

    renderApps();

  } catch (error) {

    console.error(error);

    apps = [];

    renderApps();

    showToast(
      'Apps load nahi ho paaye.'
    );
  }
}


/* =========================================================
   AUTH HEADERS
========================================================= */

function authHeaders() {

  const headers = {
    'Content-Type':
      'application/json'
  };

  const token =
    getToken();

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  headers['X-Client-Id'] =
    getClientId();

  return headers;
}


/* =========================================================
   RENDER APPS
========================================================= */

function renderApps() {

  const grid =
    $('appGrid');

  const empty =
    $('emptyApps');

  const search =
    (
      $('searchInput')?.value ||
      ''
    )
      .trim()
      .toLowerCase();

  if (!grid) return;

  let list =
    [...apps];


  /* MY APPS */

  if (
    window.pmCurrentTab ===
    'my'
  ) {

    const unlocked =
      getUnlocked();

    list =
      list.filter(app =>
        unlocked.includes(
          String(app.id)
        )
      );
  }


  /* SEARCH */

  if (search) {

    list =
      list.filter(app => {

        const text = [
          app.name,
          app.title,
          app.description,
          app.category
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return text.includes(search);
      });
  }


  $('appCount').textContent =
    `${list.length} Available`;


  if (!list.length) {

    grid.innerHTML = '';

    if (empty) {
      empty.style.display =
        'block';
    }

    return;
  }


  if (empty) {
    empty.style.display =
      'none';
  }


  grid.innerHTML =
    list
      .map(app => {

        const id =
          escapeHtml(app.id);

        const name =
          escapeHtml(
            app.name ||
            app.title ||
            'App'
          );

        const description =
          escapeHtml(
            app.description ||
            'Premium learning app'
          );

        const logo =
          app.logoUrl ||
          app.logo ||
          '/assets/logo-light.png';

        return `
          <article
            class="app-card"
            onclick="openApp('${id}')"
          >

            <img
              src="${escapeHtml(logo)}"
              alt="${name}"
              loading="lazy"
              onerror="this.src='/assets/logo-light.png'"
            />

            <h3>${name}</h3>

            <p>${description}</p>

          </article>
        `;

      })
      .join('');
}


/* =========================================================
   APP TABS
========================================================= */

function showApps() {

  window.pmCurrentTab =
    'apps';

  $('appsTab')?.classList.add(
    'active'
  );

  $('myAppsTab')?.classList.remove(
    'active'
  );

  $('sectionTitle').textContent =
    'All Apps';

  renderApps();
}


function showMyApps() {

  window.pmCurrentTab =
    'my';

  $('myAppsTab')?.classList.add(
    'active'
  );

  $('appsTab')?.classList.remove(
    'active'
  );

  $('sectionTitle').textContent =
    'My Apps';

  renderApps();

  setTimeout(() => {
    $('appsSection')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }, 50);
}


/* =========================================================
   OPEN APP
========================================================= */

function openApp(id) {

  const app =
    apps.find(
      item =>
        String(item.id) ===
        String(id)
    );

  if (!app) return;

  currentApp = app;

  const name =
    app.name ||
    app.title ||
    'App';

  const description =
    app.description ||
    'Premium learning app';


  $('modalAppName').textContent =
    name;

  $('modalAppDescription')
    .textContent =
      description;


  const logo =
    app.logoUrl ||
    app.logo ||
    '/assets/logo-light.png';

  $('modalAppLogo').src =
    logo;


  $('appKeyInput').value =
    '';


  $('appModal').style.display =
    'flex';


  const unlocked =
    getUnlocked()
      .map(String)
      .includes(
        String(app.id)
      );


  if (unlocked) {

    $('verifyArea').innerHTML = `
      <div
        style="
          padding:15px;
          background:#eaf8ef;
          color:#21864b;
          border-radius:15px;
          font-weight:700;
        "
      >
        ✓ Premium already unlocked
      </div>
    `;
  } else {

    $('verifyArea').innerHTML = `
      <label>
        Enter App Key
      </label>

      <input
        id="appKeyInput"
        type="text"
        placeholder="Enter your key"
        autocomplete="off"
      />

      <button
        id="verifyKeyBtn"
        class="primary-btn"
        type="button"
      >
        Verify App Key
      </button>
    `;

    $('verifyKeyBtn')
      .addEventListener(
        'click',
        verifyCurrentApp
      );
  }
}


/* =========================================================
   CLOSE APP
========================================================= */

function closeAppModal() {

  $('appModal').style.display =
    'none';

  currentApp = null;
}


/* =========================================================
   VERIFY APP KEY
========================================================= */

async function verifyCurrentApp() {

  if (!currentApp) return;

  const input =
    $('appKeyInput');

  const key =
    input?.value.trim();

  if (!key) {

    showToast(
      'App key enter karo.'
    );

    return;
  }


  const button =
    $('verifyKeyBtn');

  if (button) {

    button.disabled =
      true;

    button.textContent =
      'Verifying...';
  }


  try {

    const response =
      await fetch(
        `${API}/keys/verify`,
        {
          method: 'POST',

          headers:
            authHeaders(),

          body:
            JSON.stringify({
              key,
              appId:
                currentApp.id
            })
        }
      );


    const data =
      await response.json()
        .catch(() => ({}));


    if (!response.ok) {

      throw new Error(
        data.message ||
        data.error ||
        'Invalid app key'
      );
    }


    const unlocked =
      getUnlocked();


    if (
      !unlocked
        .map(String)
        .includes(
          String(currentApp.id)
        )
    ) {

      unlocked.push(
        currentApp.id
      );

      saveUnlocked(
        unlocked
      );
    }


    showToast(
      'Premium access unlocked!'
    );


    const url =
      data.homeUrl ||
      currentApp.homeUrl ||
      currentApp.url;


    setTimeout(() => {

      closeAppModal();

      if (url) {
        window.location.href =
          url;
      }

    }, 700);


  } catch (error) {

    console.error(error);

    showToast(
      error.message ||
      'Key verification failed.'
    );

  } finally {

    if (button) {

      button.disabled =
        false;

      button.textContent =
        'Verify App Key';
    }
  }
}


/* =========================================================
   PURCHASE HELP
========================================================= */

function openPurchaseHelp() {

  if (!currentApp) return;

  const url =
    currentApp.purchaseVideoUrl ||
    currentApp.purchaseHelpUrl ||
    currentApp.videoUrl;

  if (!url) {

    showToast(
      'Purchase help video available nahi hai.'
    );

    return;
  }

  window.open(
    url,
    '_blank'
  );
}


/* =========================================================
   NOTIFICATIONS
========================================================= */

async function loadNotifications() {

  try {

    const response =
      await fetch(
        `${API}/notifications`,
        {
          headers:
            authHeaders()
        }
      );


    if (!response.ok) {
      throw new Error(
        'Notifications load failed'
      );
    }


    const data =
      await response.json();


    notifications =
      Array.isArray(data)
        ? data
        : (
            data.notifications ||
            data.data ||
            []
          );


    renderNotifications();

  } catch (error) {

    console.error(error);

    notifications = [];

    renderNotifications();

  }
}


function renderNotifications() {

  const list =
    $('notificationList');

  const empty =
    $('notificationEmpty');

  if (!list) return;


  if (!notifications.length) {

    list.innerHTML = '';

    if (empty) {
      empty.style.display =
        'block';
    }

    return;
  }


  if (empty) {
    empty.style.display =
      'none';
  }


  list.innerHTML =
    notifications
      .map(item => {

        const title =
          escapeHtml(
            item.title ||
            item.name ||
            'Update'
          );

        const message =
          escapeHtml(
            item.message ||
            item.description ||
            item.content ||
            ''
          );


        const rawDate =
          item.created_at ||
          item.createdAt ||
          item.date;


        let dateText = '';

        if (rawDate) {

          const date =
            new Date(rawDate);

          if (!Number.isNaN(
            date.getTime()
          )) {

            dateText =
              date.toLocaleString(
                'en-IN',
                {
                  dateStyle:
                    'medium',
                  timeStyle:
                    'short'
                }
              );
          }
        }


        return `
          <div class="notification-item">

            <h3>
              ${title}
            </h3>

            <p>
              ${message}
            </p>

            ${
              dateText
                ? `
                  <div class="notification-date">
                    ${escapeHtml(dateText)}
                  </div>
                `
                : ''
            }

          </div>
        `;

      })
      .join('');
}


function openNotifications() {

  $('notificationModal')
    .style.display =
      'flex';

  loadNotifications();
}


function closeNotifications() {

  $('notificationModal')
    .style.display =
      'none';
}


/* =========================================================
   ACCOUNT
========================================================= */

function openAccount() {

  $('accountModal').style.display =
    'flex';

  updateAccountUI();
}


function closeAccount() {

  $('accountModal').style.display =
    'none';
}


function updateAccountUI() {

  if (currentUser) {

    $('loginArea').style.display =
      'none';

    $('registerArea').style.display =
      'none';

    $('loggedInArea').style.display =
      'block';

    $('loggedUsername')
      .textContent =
        currentUser.username ||
        currentUser.name ||
        '';

  } else {

    $('loginArea').style.display =
      'block';

    $('registerArea').style.display =
      'none';

    $('loggedInArea').style.display =
      'none';
  }
}


/* =========================================================
   LOGIN
========================================================= */

async function login() {

  const username =
    $('loginUsername')
      .value
      .trim();

  const password =
    $('loginPassword')
      .value;


  if (!username || !password) {

    showToast(
      'Username aur password enter karo.'
    );

    return;
  }


  const button =
    $('loginBtn');

  button.disabled =
    true;

  button.textContent =
    'Logging in...';


  try {

    const response =
      await fetch(
        `${API}/auth/login`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify({
              username,
              password
            })
        }
      );


    const data =
      await response.json()
        .catch(() => ({}));


    if (!response.ok) {

      throw new Error(
        data.message ||
        data.error ||
        'Login failed'
      );
    }


    const token =
      data.token ||
      data.accessToken;


    if (!token) {
      throw new Error(
        'Login token nahi mila.'
      );
    }


    localStorage.setItem(
      TOKEN_KEY,
      token
    );


    currentUser =
      data.user ||
      data.data ||
      {
        username
      };


    localStorage.setItem(
      USER_KEY,
      JSON.stringify(
        currentUser
      )
    );


    showToast(
      'Login successful!'
    );


    updateAccountUI();

    await loadMe();

  } catch (error) {

    showToast(
      error.message ||
      'Login failed.'
    );

  } finally {

    button.disabled =
      false;

    button.textContent =
      'Login';
  }
}


/* =========================================================
   REGISTER
========================================================= */

async function register() {

  const username =
    $('registerUsername')
      .value
      .trim();

  const password =
    $('registerPassword')
      .value;


  if (!username || !password) {

    showToast(
      'Username aur password enter karo.'
    );

    return;
  }


  const button =
    $('registerBtn');

  button.disabled =
    true;

  button.textContent =
    'Creating...';


  try {

    const response =
      await fetch(
        `${API}/auth/register`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify({
              username,
              password
            })
        }
      );


    const data =
      await response.json()
        .catch(() => ({}));


    if (!response.ok) {

      throw new Error(
        data.message ||
        data.error ||
        'Registration failed'
      );
    }


    showToast(
      'Account created. Ab login karo.'
    );


    $('registerArea')
      .style.display =
        'none';

    $('loginArea')
      .style.display =
        'block';

    $('loginUsername').value =
      username;

    $('loginPassword').value =
      '';


  } catch (error) {

    showToast(
      error.message ||
      'Registration failed.'
    );

  } finally {

    button.disabled =
      false;

    button.textContent =
      'Create Account';
  }
}


/* =========================================================
   LOAD ME
========================================================= */

async function loadMe() {

  const token =
    getToken();

  if (!token) {

    currentUser = null;

    updateAccountUI();

    return;
  }


  try {

    const response =
      await fetch(
        `${API}/me`,
        {
          headers:
            authHeaders()
        }
      );


    if (!response.ok) {

      throw new Error(
        'Session expired'
      );
    }


    const data =
      await response.json();


    currentUser =
      data.user ||
      data.data ||
      data;


    localStorage.setItem(
      USER_KEY,
      JSON.stringify(
        currentUser
      )
    );


    updateAccountUI();


  } catch (error) {

    localStorage.removeItem(
      TOKEN_KEY
    );

    localStorage.removeItem(
      USER_KEY
    );

    currentUser = null;

    updateAccountUI();
  }
}


/* =========================================================
   LOGOUT
========================================================= */

function logout() {

  localStorage.removeItem(
    TOKEN_KEY
  );

  localStorage.removeItem(
    USER_KEY
  );

  currentUser = null;

  updateAccountUI();

  closeAccount();

  showToast(
    'Logged out successfully.'
  );
}


/* =========================================================
   INIT
========================================================= */

async function initApp() {

  /* theme */

  applyTheme(
    localStorage.getItem(
      THEME_KEY
    ) || 'light'
  );


  /* client ID */

  getClientId();


  /* user */

  await loadMe();


  /* apps */

  await loadApps();


  /* notifications */

  await loadNotifications();


  /* splash */

  setTimeout(() => {

    $('splash')
      ?.classList
      .add('hide');

  }, 700);
}


/* =========================================================
   EVENTS
========================================================= */

function setupEvents() {

  $('themeBtn')
    ?.addEventListener(
      'click',
      toggleTheme
    );


  $('menuBtn')
    ?.addEventListener(
      'click',
      openDrawer
    );


  $('closeDrawer')
    ?.addEventListener(
      'click',
      closeDrawer
    );


  $('drawerOverlay')
    ?.addEventListener(
      'click',
      closeDrawer
    );


  $('notificationBtn')
    ?.addEventListener(
      'click',
      openNotifications
    );


  $('closeNotification')
    ?.addEventListener(
      'click',
      closeNotifications
    );


  $('accountBtn')
    ?.addEventListener(
      'click',
      openAccount
    );


  $('appsTab')
    ?.addEventListener(
      'click',
      showApps
    );


  $('myAppsTab')
    ?.addEventListener(
      'click',
      showMyApps
    );


  $('searchInput')
    ?.addEventListener(
      'input',
      renderApps
    );


  $('purchaseHelpBtn')
    ?.addEventListener(
      'click',
      openPurchaseHelp
    );


  $('loginBtn')
    ?.addEventListener(
      'click',
      login
    );


  $('registerBtn')
    ?.addEventListener(
      'click',
      register
    );


  $('logoutBtn')
    ?.addEventListener(
      'click',
      logout
    );


  $('showRegisterBtn')
    ?.addEventListener(
      'click',
      () => {

        $('loginArea')
          .style.display =
            'none';

        $('registerArea')
          .style.display =
            'block';

      }
    );


  $('showLoginBtn')
    ?.addEventListener(
      'click',
      () => {

        $('registerArea')
          .style.display =
            'none';

        $('loginArea')
          .style.display =
            'block';

      }
    );


  /* close modal by clicking outside */

  $('appModal')
    ?.addEventListener(
      'click',
      event => {

        if (
          event.target ===
          $('appModal')
        ) {
          closeAppModal();
        }

      }
    );


  $('notificationModal')
    ?.addEventListener(
      'click',
      event => {

        if (
          event.target ===
          $('notificationModal')
        ) {
          closeNotifications();
        }

      }
    );


  $('accountModal')
    ?.addEventListener(
      'click',
      event => {

        if (
          event.target ===
          $('accountModal')
        ) {
          closeAccount();
        }

      }
    );
}


/* =========================================================
   INITIALIZE
========================================================= */

if (
  document.readyState ===
  'loading'
) {

  document.addEventListener(
    'DOMContentLoaded',
    () => {

      setupEvents();
      initApp();

    },
    {
      once: true
    }
  );

} else {

  setupEvents();
  initApp();
}


/* =========================================================
   GLOBAL FUNCTIONS
========================================================= */

window.goToApps =
  goToApps;

window.goHome =
  goHome;

window.showMyApps =
  showMyApps;

window.openAccount =
  openAccount;

window.closeAccount =
  closeAccount;

window.openApp =
  openApp;

window.closeAppModal =
  closeAppModal;

window.openNotifications =
  openNotifications;

window.closeNotifications =
  closeNotifications;

window.closeDrawer =
  closeDrawer;

window.logout =
  logout;
