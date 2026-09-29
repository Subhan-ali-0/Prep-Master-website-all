'use strict';

/* =========================================================
   PREP MASTER - USER APP JS
   ========================================================= */

const API = '/api';

const STORAGE = {
  TOKEN: 'pm_token',
  USER: 'pm_user',
  UNLOCKED: 'pm_unlocked',
  CLIENT_ID: 'pm_client_id',
  THEME: 'pm_theme'
};

const TELEGRAM_URL = 'https://t.me/prepmaster0';

/* =========================================================
   HELPERS
   ========================================================= */

const $ = (selector, parent = document) =>
  parent.querySelector(selector);

const $$ = (selector, parent = document) =>
  [...parent.querySelectorAll(selector)];

function byId(id) {
  return document.getElementById(id);
}

function safeJSON(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function escapeHTML(value) {
  if (value === null || value === undefined) return '';

  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getErrorMessage(error, fallback = 'Something went wrong') {
  if (!error) return fallback;

  if (typeof error === 'string') return error;

  return (
    error.message ||
    error.error ||
    error.details ||
    fallback
  );
}

/* =========================================================
   GLOBAL STATE
   ========================================================= */

let apps = [];
let notifications = [];
let currentApp = null;
let currentUser = null;
let currentTab = 'apps';
let searchTerm = '';
let isLoadingApps = false;

/* =========================================================
   CLIENT ID
   ========================================================= */

function generateClientId() {
  return (
    'client_' +
    Date.now().toString(36) +
    '_' +
    Math.random().toString(36).substring(2, 12)
  );
}

function getClientId() {
  let clientId = localStorage.getItem(STORAGE.CLIENT_ID);

  if (!clientId) {
    clientId = generateClientId();
    localStorage.setItem(STORAGE.CLIENT_ID, clientId);
  }

  return clientId;
}

/* =========================================================
   AUTH STORAGE
   ========================================================= */

function getToken() {
  return localStorage.getItem(STORAGE.TOKEN);
}

function getSavedUser() {
  const raw = localStorage.getItem(STORAGE.USER);

  if (!raw) return null;

  return safeJSON(raw, null);
}

function saveLogin(token, user) {
  if (token) {
    localStorage.setItem(STORAGE.TOKEN, token);
  }

  if (user) {
    localStorage.setItem(STORAGE.USER, JSON.stringify(user));
  }

  currentUser = user || null;

  updateAccountUI();
}

function clearLogin() {
  localStorage.removeItem(STORAGE.TOKEN);
  localStorage.removeItem(STORAGE.USER);

  currentUser = null;

  updateAccountUI();
}

/* =========================================================
   UNLOCK STORAGE
   ========================================================= */

function getUnlockedApps() {
  const raw = localStorage.getItem(STORAGE.UNLOCKED);

  if (!raw) return [];

  const data = safeJSON(raw, []);

  return Array.isArray(data) ? data : [];
}

function saveUnlockedApps(list) {
  const clean = [...new Set(
    list
      .filter(Boolean)
      .map(String)
  )];

  localStorage.setItem(
    STORAGE.UNLOCKED,
    JSON.stringify(clean)
  );
}

function isAppUnlocked(appId) {
  if (!appId) return false;

  const unlocked = getUnlockedApps();

  return unlocked.includes(String(appId));
}

function markAppUnlocked(appId) {
  if (!appId) return;

  const unlocked = getUnlockedApps();

  if (!unlocked.includes(String(appId))) {
    unlocked.push(String(appId));
    saveUnlockedApps(unlocked);
  }
}

/* =========================================================
   API
   ========================================================= */

function apiHeaders(extra = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Client-Id': getClientId(),
    ...extra
  };

  const token = getToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function apiFetch(endpoint, options = {}) {
  const config = {
    method: options.method || 'GET',
    headers: {
      ...apiHeaders(),
      ...(options.headers || {})
    }
  };

  if (
    options.body !== undefined &&
    options.body !== null
  ) {
    config.body =
      typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body);
  }

  const response = await fetch(
    `${API}${endpoint}`,
    config
  );

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (
      response.status === 401 &&
      endpoint !== '/auth/login' &&
      endpoint !== '/auth/register'
    ) {
      clearLogin();
    }

    throw new Error(
      getErrorMessage(
        data,
        `Request failed (${response.status})`
      )
    );
  }

  return data;
}

/* =========================================================
   TOAST
   ========================================================= */

function showToast(message, type = 'info') {
  let toast = byId('toast');

  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }

  toast.className = `toast ${type}`;
  toast.textContent = message;

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  clearTimeout(window.__pmToastTimer);

  window.__pmToastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

/* =========================================================
   THEME
   ========================================================= */

function getSavedTheme() {
  return localStorage.getItem(STORAGE.THEME) || 'light';
}

function applyTheme(theme) {
  const finalTheme =
    theme === 'dark' ? 'dark' : 'light';

  document.documentElement.setAttribute(
    'data-theme',
    finalTheme
  );

  document.body.classList.toggle(
    'dark',
    finalTheme === 'dark'
  );

  localStorage.setItem(
    STORAGE.THEME,
    finalTheme
  );

  updateThemeButtons(finalTheme);
}

function updateThemeButtons(theme) {
  const buttons = [
    byId('themeBtn'),
    byId('themeToggle'),
    byId('drawerThemeBtn')
  ].filter(Boolean);

  buttons.forEach(button => {
    button.setAttribute(
      'aria-label',
      theme === 'dark'
        ? 'Switch to light mode'
        : 'Switch to dark mode'
    );

    const icon =
      button.querySelector('.theme-icon') ||
      button.querySelector('i');

    if (icon) {
      icon.textContent =
        theme === 'dark' ? '☀' : '☾';
    }
  });
}

function toggleTheme() {
  const current =
    document.documentElement.getAttribute('data-theme') ||
    'light';

  applyTheme(
    current === 'dark' ? 'light' : 'dark'
  );
}

/* =========================================================
   DRAWER
   ========================================================= */

function openDrawer() {
  const drawer =
    byId('drawer') ||
    $('.drawer');

  const overlay =
    byId('drawerOverlay') ||
    $('.drawer-overlay');

  if (drawer) {
    drawer.classList.add('open');
    drawer.classList.add('active');
  }

  if (overlay) {
    overlay.classList.add('open');
    overlay.classList.add('active');
  }

  document.body.classList.add('drawer-open');
}

function closeDrawer() {
  const drawer =
    byId('drawer') ||
    $('.drawer');

  const overlay =
    byId('drawerOverlay') ||
    $('.drawer-overlay');

  if (drawer) {
    drawer.classList.remove('open');
    drawer.classList.remove('active');
  }

  if (overlay) {
    overlay.classList.remove('open');
    overlay.classList.remove('active');
  }

  document.body.classList.remove('drawer-open');
}

/* =========================================================
   MODAL HELPERS
   ========================================================= */

function openModal(modal) {
  if (!modal) return;

  modal.classList.add('open');
  modal.classList.add('active');

  modal.removeAttribute('hidden');

  document.body.classList.add('modal-open');
}

function closeModal(modal) {
  if (!modal) return;

  modal.classList.remove('open');
  modal.classList.remove('active');

  modal.setAttribute('hidden', '');

  document.body.classList.remove('modal-open');
}

function closeAllModals() {
  $$('.modal, .popup, .dialog').forEach(modal => {
    modal.classList.remove('open');
    modal.classList.remove('active');
  });

  document.body.classList.remove('modal-open');
}

/* =========================================================
   ACCOUNT
   ========================================================= */

function getAccountModal() {
  return (
    byId('accountModal') ||
    byId('accountPopup') ||
    $('.account-modal')
  );
}

function updateAccountUI() {
  const accountBtn =
    byId('accountBtn') ||
    byId('accountButton');

  const accountName =
    byId('accountName') ||
    byId('loggedUsername');

  const loggedInArea =
    byId('loggedInArea');

  const loginArea =
    byId('loginArea');

  if (currentUser) {
    if (accountName) {
      accountName.textContent =
        currentUser.username ||
        currentUser.name ||
        currentUser.email ||
        'Account';
    }

    if (loggedInArea) {
      loggedInArea.style.display = '';
    }

    if (loginArea) {
      loginArea.style.display = 'none';
    }

    if (accountBtn) {
      accountBtn.setAttribute(
        'title',
        currentUser.username ||
        currentUser.name ||
        'Account'
      );
    }
  } else {
    if (accountName) {
      accountName.textContent = 'Account';
    }

    if (loggedInArea) {
      loggedInArea.style.display = 'none';
    }

    if (loginArea) {
      loginArea.style.display = '';
    }

    if (accountBtn) {
      accountBtn.setAttribute(
        'title',
        'Login'
      );
    }
  }
}

function openAccountModal() {
  const modal = getAccountModal();

  if (!modal) {
    showToast(
      'Account section not found. Check index.html',
      'error'
    );
    return;
  }

  updateAccountUI();

  openModal(modal);
}

function closeAccountModal() {
  closeModal(getAccountModal());
}

function showLoginForm() {
  const loginArea =
    byId('loginArea');

  const registerArea =
    byId('registerArea');

  const loggedInArea =
    byId('loggedInArea');

  if (loginArea) {
    loginArea.style.display = '';
  }

  if (registerArea) {
    registerArea.style.display = 'none';
  }

  if (loggedInArea) {
    loggedInArea.style.display = 'none';
  }
}

function showRegisterForm() {
  const loginArea =
    byId('loginArea');

  const registerArea =
    byId('registerArea');

  const loggedInArea =
    byId('loggedInArea');

  if (loginArea) {
    loginArea.style.display = 'none';
  }

  if (registerArea) {
    registerArea.style.display = '';
  }

  if (loggedInArea) {
    loggedInArea.style.display = 'none';
  }
}

/* =========================================================
   LOGIN
   ========================================================= */

async function loginUser() {
  const usernameInput =
    byId('loginUsername') ||
    byId('username');

  const passwordInput =
    byId('loginPassword') ||
    byId('password');

  const username =
    usernameInput?.value.trim();

  const password =
    passwordInput?.value || '';

  if (!username || !password) {
    showToast(
      'Username aur password dono bharo',
      'error'
    );
    return;
  }

  const button =
    byId('loginBtn');

  const originalText =
    button?.textContent;

  if (button) {
    button.disabled = true;
    button.textContent = 'Logging in...';
  }

  try {
    const data = await apiFetch(
      '/auth/login',
      {
        method: 'POST',
        body: {
          username,
          password
        }
      }
    );

    if (!data?.token) {
      throw new Error(
        'Login token nahi mila'
      );
    }

    saveLogin(
      data.token,
      data.user || {
        username
      }
    );

    showToast(
      'Login successful!',
      'success'
    );

    updateAccountUI();

    await loadMe();

    setTimeout(() => {
      closeAccountModal();
    }, 500);

  } catch (error) {
    console.error(
      'Login error:',
      error
    );

    showToast(
      getErrorMessage(
        error,
        'Login failed'
      ),
      'error'
    );

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent =
        originalText || 'Login';
    }
  }
}

/* =========================================================
   REGISTER
   ========================================================= */

async function registerUser() {
  const usernameInput =
    byId('registerUsername') ||
    byId('regUsername');

  const passwordInput =
    byId('registerPassword') ||
    byId('regPassword');

  const username =
    usernameInput?.value.trim();

  const password =
    passwordInput?.value || '';

  if (!username || !password) {
    showToast(
      'Username aur password dono bharo',
      'error'
    );
    return;
  }

  if (username.length < 3) {
    showToast(
      'Username kam se kam 3 characters ka hona chahiye',
      'error'
    );
    return;
  }

  if (password.length < 4) {
    showToast(
      'Password kam se kam 4 characters ka hona chahiye',
      'error'
    );
    return;
  }

  const button =
    byId('registerBtn');

  const originalText =
    button?.textContent;

  if (button) {
    button.disabled = true;
    button.textContent = 'Creating...';
  }

  try {
    const data = await apiFetch(
      '/auth/register',
      {
        method: 'POST',
        body: {
          username,
          password
        }
      }
    );

    /*
      Kuch backend versions registration ke baad
      direct token dete hain.
    */

    if (data?.token) {
      saveLogin(
        data.token,
        data.user || {
          username
        }
      );

      showToast(
        'Account created successfully!',
        'success'
      );

      await loadMe();

      setTimeout(() => {
        closeAccountModal();
      }, 500);

    } else {
      /*
        Agar backend sirf account create karta hai,
        to automatically login try karenge.
      */

      showToast(
        'Account created! Logging in...',
        'success'
      );

      const loginData =
        await apiFetch(
          '/auth/login',
          {
            method: 'POST',
            body: {
              username,
              password
            }
          }
        );

      if (!loginData?.token) {
        throw new Error(
          'Account bana hai, lekin automatic login nahi ho saka'
        );
      }

      saveLogin(
        loginData.token,
        loginData.user || {
          username
        }
      );

      await loadMe();

      setTimeout(() => {
        closeAccountModal();
      }, 500);
    }

  } catch (error) {
    console.error(
      'Register error:',
      error
    );

    showToast(
      getErrorMessage(
        error,
        'Registration failed'
      ),
      'error'
    );

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent =
        originalText || 'Create Account';
    }
  }
}

/* =========================================================
   LOAD CURRENT USER
   ========================================================= */

async function loadMe() {
  const token = getToken();

  if (!token) {
    currentUser = null;
    updateAccountUI();
    return null;
  }

  try {
    const data =
      await apiFetch('/me');

    const user =
      data?.user ||
      data?.data ||
      data;

    if (!user) {
      throw new Error(
        'User data not found'
      );
    }

    currentUser = user;

    localStorage.setItem(
      STORAGE.USER,
      JSON.stringify(user)
    );

    updateAccountUI();

    /*
      Server se unlocked apps mile to
      local unlocked list ke saath merge.
    */

    const serverUnlocked =
      user.unlocked_apps ||
      user.unlockedApps ||
      [];

    if (Array.isArray(serverUnlocked)) {
      const localUnlocked =
        getUnlockedApps();

      saveUnlockedApps([
        ...localUnlocked,
        ...serverUnlocked
      ]);
    }

    renderApps();

    return user;

  } catch (error) {
    console.warn(
      'Could not restore login:',
      error
    );

    clearLogin();

    return null;
  }
}

/* =========================================================
   LOGOUT
   ========================================================= */

async function logoutUser() {
  try {
    /*
      Current backend custom JWT hai,
      isliye local token clear karna enough hai.
    */

    clearLogin();

    showToast(
      'Logged out successfully',
      'success'
    );

    closeAccountModal();

    renderApps();

  } catch (error) {
    console.error(
      'Logout error:',
      error
    );

    clearLogin();
  }
}

/* =========================================================
   APPS
   ========================================================= */

async function loadApps() {
  if (isLoadingApps) return;

  isLoadingApps = true;

  renderLoadingApps();

  try {
    let data;

    try {
      data =
        await apiFetch('/apps');
    } catch (error) {
      /*
        Agar public endpoint /apps fail ho,
        to /apps/all try nahi karna unless needed.
      */
      throw error;
    }

    const result =
      data?.apps ||
      data?.data ||
      data;

    apps =
      Array.isArray(result)
        ? result
        : [];

    /*
      Sirf active apps user ko dikhaye jayenge.
    */

    apps = apps.filter(app => {
      if (
        app.active === false ||
        app.is_active === false
      ) {
        return false;
      }

      return true;
    });

    renderApps();

  } catch (error) {
    console.error(
      'Apps loading error:',
      error
    );

    apps = [];

    renderEmptyApps(
      'Apps load nahi ho pa rahe. Backend/API check karo.'
    );

  } finally {
    isLoadingApps = false;
  }
}

function renderLoadingApps() {
  const grid =
    byId('appGrid') ||
    byId('appsGrid') ||
    $('.app-grid');

  if (!grid) return;

  grid.innerHTML = `
    <div class="loading-state">
      <div class="loader"></div>
      <p>Loading apps...</p>
    </div>
  `;
}

function getAppId(app) {
  return String(
    app.id ||
    app._id ||
    app.app_id ||
    ''
  );
}

function getAppName(app) {
  return (
    app.name ||
    app.title ||
    'Untitled App'
  );
}

function getAppLogo(app) {
  return (
    app.logoUrl ||
    app.logo_url ||
    app.logo ||
    '/assets/logo.png'
  );
}

function getAppDescription(app) {
  return (
    app.description ||
    'Premium learning application'
  );
}

function getAppCategory(app) {
  return (
    app.category ||
    'Education'
  );
}

function renderApps() {
  const grid =
    byId('appGrid') ||
    byId('appsGrid') ||
    $('.app-grid');

  if (!grid) return;

  let visibleApps = [...apps];

  /*
    Search
  */

  if (searchTerm) {
    const term =
      searchTerm.toLowerCase();

    visibleApps =
      visibleApps.filter(app => {
        const text = [
          getAppName(app),
          getAppDescription(app),
          getAppCategory(app)
        ]
          .join(' ')
          .toLowerCase();

        return text.includes(term);
      });
  }

  /*
    My Apps
  */

  if (currentTab === 'myapps') {
    visibleApps =
      visibleApps.filter(app =>
        isAppUnlocked(getAppId(app))
      );
  }

  if (!visibleApps.length) {
    if (currentTab === 'myapps') {
      renderEmptyApps(
        searchTerm
          ? 'Matching unlocked app nahi mila.'
          : 'Abhi koi unlocked app nahi hai.'
      );
    } else {
      renderEmptyApps(
        searchTerm
          ? 'Koi matching app nahi mila.'
          : 'Abhi koi app available nahi hai.'
      );
    }

    updateAppCount(0);
    return;
  }

  grid.innerHTML =
    visibleApps
      .map(renderAppCard)
      .join('');

  updateAppCount(
    visibleApps.length
  );
}

function renderAppCard(app) {
  const id =
    getAppId(app);

  const name =
    getAppName(app);

  const logo =
    getAppLogo(app);

  const description =
    getAppDescription(app);

  const category =
    getAppCategory(app);

  const unlocked =
    isAppUnlocked(id);

  return `
    <article
      class="app-card"
      data-app-id="${escapeHTML(id)}"
      tabindex="0"
      role="button"
    >

      <div class="app-card-logo">
        <img
          src="${escapeHTML(logo)}"
          alt="${escapeHTML(name)}"
          loading="lazy"
          onerror="this.onerror=null;this.src='/assets/logo.png';"
        >
      </div>

      <div class="app-card-content">

        <div class="app-card-top">
          <span class="app-category">
            ${escapeHTML(category)}
          </span>

          ${
            unlocked
              ? `
                <span class="app-unlocked">
                  Unlocked
                </span>
              `
              : ''
          }
        </div>

        <h3 class="app-card-title">
          ${escapeHTML(name)}
        </h3>

        <p class="app-card-description">
          ${escapeHTML(description)}
        </p>

        <div class="app-card-bottom">

          <span class="app-open-label">
            ${
              unlocked
                ? 'Open App'
                : 'View App'
            }
          </span>

          <span class="app-arrow">
            →
          </span>

        </div>

      </div>

    </article>
  `;
}

function renderEmptyApps(message) {
  const grid =
    byId('appGrid') ||
    byId('appsGrid') ||
    $('.app-grid');

  if (!grid) return;

  grid.innerHTML = `
    <div class="empty-state">

      <div class="empty-icon">
        📚
      </div>

      <h3>
        No Apps
      </h3>

      <p>
        ${escapeHTML(message)}
      </p>

    </div>
  `;
}

function updateAppCount(count) {
  const elements = [
    byId('appCount'),
    byId('appsCount')
  ].filter(Boolean);

  elements.forEach(element => {
    element.textContent =
      String(count);
  });
}

/* =========================================================
   APP DETAIL
   ========================================================= */

function openAppDetails(app) {
  if (!app) return;

  currentApp = app;

  const modal =
    byId('appModal') ||
    byId('appDetailsModal') ||
    $('.app-modal');

  if (!modal) {
    showToast(
      'App details modal nahi mila',
      'error'
    );
    return;
  }

  const name =
    getAppName(app);

  const logo =
    getAppLogo(app);

  const description =
    getAppDescription(app);

  const title =
    byId('modalAppTitle') ||
    byId('appModalTitle');

  const image =
    byId('modalAppLogo') ||
    byId('appModalLogo');

  const desc =
    byId('modalAppDescription') ||
    byId('appModalDescription');

  const keyInput =
    byId('appKeyInput') ||
    byId('keyInput') ||
    byId('verifyKeyInput');

  const verifyButton =
    byId('verifyKeyBtn') ||
    byId('verifyAppKeyBtn') ||
    byId('verifyKey');

  if (title) {
    title.textContent = name;
  }

  if (image) {
    image.src = logo;
    image.alt = name;

    image.onerror = () => {
      image.onerror = null;
      image.src = '/assets/logo.png';
    };
  }

  if (desc) {
    desc.textContent = description;
  }

  if (keyInput) {
    keyInput.value = '';
  }

  if (verifyButton) {
    verifyButton.disabled =
      false;

    verifyButton.textContent =
      'Verify App Key';
  }

  const unlocked =
    isAppUnlocked(
      getAppId(app)
    );

  updateVerifySection(
    unlocked
  );

  openModal(modal);
}

function updateVerifySection(unlocked) {
  const keyInput =
    byId('appKeyInput') ||
    byId('keyInput') ||
    byId('verifyKeyInput');

  const verifyButton =
    byId('verifyKeyBtn') ||
    byId('verifyAppKeyBtn') ||
    byId('verifyKey');

  const success =
    byId('appUnlockedMessage') ||
    byId('unlockSuccess');

  const openButton =
    byId('openAppBtn') ||
    byId('openUnlockedApp');

  if (unlocked) {
    if (keyInput) {
      keyInput.style.display =
        'none';
    }

    if (verifyButton) {
      verifyButton.style.display =
        'none';
    }

    if (success) {
      success.style.display =
        '';
    }

    if (openButton) {
      openButton.style.display =
        '';
    }

  } else {
    if (keyInput) {
      keyInput.style.display =
        '';
    }

    if (verifyButton) {
      verifyButton.style.display =
        '';
    }

    if (success) {
      success.style.display =
        'none';
    }

    if (openButton) {
      openButton.style.display =
        'none';
    }
  }
}

function closeAppModal() {
  closeModal(
    byId('appModal') ||
    byId('appDetailsModal') ||
    $('.app-modal')
  );

  currentApp = null;
}

/* =========================================================
   VERIFY KEY
   ========================================================= */

async function verifyAppKey() {
  if (!currentApp) {
    showToast(
      'Pehle app select karo',
      'error'
    );
    return;
  }

  const keyInput =
    byId('appKeyInput') ||
    byId('keyInput') ||
    byId('verifyKeyInput');

  const key =
    keyInput?.value.trim();

  if (!key) {
    showToast(
      'App key enter karo',
      'error'
    );
    return;
  }

  const appId =
    getAppId(currentApp);

  if (!appId) {
    showToast(
      'Invalid app',
      'error'
    );
    return;
  }

  const button =
    byId('verifyKeyBtn') ||
    byId('verifyAppKeyBtn') ||
    byId('verifyKey');

  const originalText =
    button?.textContent;

  if (button) {
    button.disabled = true;
    button.textContent =
      'Verifying...';
  }

  try {
    const data =
      await apiFetch(
        '/keys/verify',
        {
          method: 'POST',
          body: {
            appId,
            key
          }
        }
      );

    /*
      Backend success response
      different formats ko support.
    */

    const success =
      data?.success === true ||
      data?.valid === true ||
      data?.verified === true ||
      data?.ok === true ||
      data?.unlocked === true;

    if (!success) {
      throw new Error(
        getErrorMessage(
          data,
          'Invalid app key'
        )
      );
    }

    /*
      Lifetime unlock browser me save.
    */

    markAppUnlocked(appId);

    /*
      Agar backend user unlocked_apps return kare.
    */

    if (data.user) {
      currentUser = data.user;

      localStorage.setItem(
        STORAGE.USER,
        JSON.stringify(currentUser)
      );
    }

    renderApps();

    updateVerifySection(true);

    showPurchaseSuccessPopup();

  } catch (error) {
    console.error(
      'Key verification error:',
      error
    );

    showToast(
      getErrorMessage(
        error,
        'Invalid app key'
      ),
      'error'
    );

  } finally {
    if (button) {
      button.disabled = false;

      button.textContent =
        originalText ||
        'Verify App Key';
    }
  }
}

/* =========================================================
   PURCHASE SUCCESS POPUP
   ========================================================= */

function showPurchaseSuccessPopup() {
  /*
    Agar HTML me dedicated popup hai,
    use open karo.
  */

  const popup =
    byId('purchaseSuccessPopup') ||
    byId('successPopup') ||
    byId('unlockSuccessPopup');

  if (popup) {
    const appName =
      byId('successAppName');

    if (appName && currentApp) {
      appName.textContent =
        getAppName(currentApp);
    }

    openModal(popup);
    return;
  }

  /*
    Agar popup HTML me nahi hai,
    dynamically simple popup banega.
  */

  const existing =
    byId('pmSuccessPopup');

  if (existing) {
    openModal(existing);
    return;
  }

  const overlay =
    document.createElement('div');

  overlay.id =
    'pmSuccessPopup';

  overlay.className =
    'modal success-popup';

  overlay.innerHTML = `
    <div class="modal-content success-content">

      <button
        class="modal-close"
        type="button"
        aria-label="Close"
        data-close-success
      >
        ×
      </button>

      <div class="success-icon">
        ✓
      </div>

      <h2>
        App Unlocked!
      </h2>

      <p>
        ${
          currentApp
            ? escapeHTML(getAppName(currentApp))
            : 'Your app'
        }
        successfully unlock ho gaya.
      </p>

      <button
        class="primary-btn"
        type="button"
        data-open-unlocked
      >
        Open App
      </button>

    </div>
  `;

  document.body.appendChild(
    overlay
  );

  openModal(overlay);
}

function closeSuccessPopup() {
  const popup =
    byId('purchaseSuccessPopup') ||
    byId('successPopup') ||
    byId('unlockSuccessPopup') ||
    byId('pmSuccessPopup');

  closeModal(popup);
}

/* =========================================================
   OPEN APP
   ========================================================= */

function getAppHomeUrl(app) {
  return (
    app.homeUrl ||
    app.home_url ||
    app.url ||
    app.appUrl ||
    app.app_url ||
    ''
  );
}

function openAppUrl(app = currentApp) {
  if (!app) {
    showToast(
      'App select nahi hai',
      'error'
    );
    return;
  }

  const appId =
    getAppId(app);

  if (!isAppUnlocked(appId)) {
    showToast(
      'Pehle app key verify karo',
      'error'
    );
    return;
  }

  const url =
    getAppHomeUrl(app);

  if (!url) {
    showToast(
      'Is app ka URL admin ne set nahi kiya',
      'error'
    );
    return;
  }

  try {
    const parsed =
      new URL(
        url,
        window.location.origin
      );

    window.open(
      parsed.href,
      '_blank',
      'noopener,noreferrer'
    );

  } catch {
    showToast(
      'Invalid app URL',
      'error'
    );
  }
}

/* =========================================================
   PURCHASE VIDEO
   ========================================================= */

function getPurchaseVideoUrl(app) {
  return (
    app.purchaseVideoUrl ||
    app.purchase_video_url ||
    app.purchaseVideo ||
    app.purchase_video ||
    ''
  );
}

function openPurchaseHelp() {
  if (!currentApp) {
    showToast(
      'App select karo',
      'error'
    );
    return;
  }

  const url =
    getPurchaseVideoUrl(
      currentApp
    );

  if (!url) {
    showToast(
      'Purchase video abhi available nahi hai',
      'info'
    );
    return;
  }

  try {
    const parsed =
      new URL(
        url,
        window.location.origin
      );

    window.open(
      parsed.href,
      '_blank',
      'noopener,noreferrer'
    );

  } catch {
    showToast(
      'Purchase video URL invalid hai',
      'error'
    );
  }
}

/* =========================================================
   NOTIFICATIONS
   ========================================================= */

async function loadNotifications() {
  try {
    const data =
      await apiFetch(
        '/notifications'
      );

    const result =
      data?.notifications ||
      data?.data ||
      data;

    notifications =
      Array.isArray(result)
        ? result
        : [];

    renderNotifications();

  } catch (error) {
    console.warn(
      'Notifications error:',
      error
    );

    notifications = [];

    renderNotifications();
  }
}

function renderNotifications() {
  const container =
    byId('notificationList') ||
    byId('notificationsList') ||
    $('.notification-list');

  if (!container) return;

  if (!notifications.length) {
    container.innerHTML = `
      <div class="empty-state small">
        <div class="empty-icon">🔔</div>
        <p>No new notifications</p>
      </div>
    `;

    return;
  }

  container.innerHTML =
    notifications
      .map(notification => {
        const title =
          notification.title ||
          notification.name ||
          'Notification';

        const message =
          notification.message ||
          notification.text ||
          '';

        const date =
          notification.created_at ||
          notification.createdAt ||
          '';

        return `
          <div class="notification-item">

            <div class="notification-icon">
              🔔
            </div>

            <div class="notification-content">

              <h4>
                ${escapeHTML(title)}
              </h4>

              <p>
                ${escapeHTML(message)}
              </p>

              ${
                date
                  ? `
                    <small>
                      ${escapeHTML(
                        formatDate(date)
                      )}
                    </small>
                  `
                  : ''
              }

            </div>

          </div>
        `;
      })
      .join('');
}

function formatDate(value) {
  try {
    return new Date(value)
      .toLocaleString(
        'en-IN',
        {
          dateStyle: 'medium',
          timeStyle: 'short'
        }
      );
  } catch {
    return String(value);
  }
}

function openNotifications() {
  const modal =
    byId('notificationModal') ||
    byId('notificationsModal') ||
    $('.notification-modal');

  if (!modal) {
    showToast(
      'Notifications section nahi mila',
      'error'
    );
    return;
  }

  renderNotifications();

  openModal(modal);
}

function closeNotifications() {
  closeModal(
    byId('notificationModal') ||
    byId('notificationsModal') ||
    $('.notification-modal')
  );
}

/* =========================================================
   SEARCH
   ========================================================= */

function handleSearch(value) {
  searchTerm =
    String(value || '')
      .trim()
      .toLowerCase();

  renderApps();
}

/* =========================================================
   TABS
   ========================================================= */

function setActiveTab(tab) {
  currentTab =
    tab === 'myapps'
      ? 'myapps'
      : 'apps';

  const tabs = $$(
    '[data-tab]'
  );

  tabs.forEach(element => {
    const value =
      element.dataset.tab;

    element.classList.toggle(
      'active',
      value === currentTab
    );

    element.setAttribute(
      'aria-selected',
      value === currentTab
        ? 'true'
        : 'false'
    );
  });

  renderApps();
}

/* =========================================================
   HERO / NAV
   ========================================================= */

function goToApps() {
  const section =
    byId('appsSection') ||
    byId('exploreApps') ||
    byId('apps');

  if (section) {
    section.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
}

/* =========================================================
   SPLASH
   ========================================================= */

function hideSplash() {
  const splash =
    byId('splash') ||
    $('.splash');

  if (!splash) return;

  setTimeout(() => {
    splash.classList.add(
      'hidden'
    );

    splash.classList.remove(
      'active'
    );

    setTimeout(() => {
      splash.style.display =
        'none';
    }, 500);

  }, 500);
}

/* =========================================================
   EVENTS
   ========================================================= */

function setupEvents() {

  /* -----------------------------------------
     Account
  ----------------------------------------- */

  const accountBtn =
    byId('accountBtn') ||
    byId('accountButton');

  if (accountBtn) {
    accountBtn.addEventListener(
      'click',
      event => {
        event.preventDefault();
        openAccountModal();
      }
    );
  }

  const loginBtn =
    byId('loginBtn');

  if (loginBtn) {
    loginBtn.addEventListener(
      'click',
      event => {
        event.preventDefault();
        loginUser();
      }
    );
  }

  const registerBtn =
    byId('registerBtn');

  if (registerBtn) {
    registerBtn.addEventListener(
      'click',
      event => {
        event.preventDefault();
        registerUser();
      }
    );
  }

  const showRegisterBtn =
    byId('showRegisterBtn') ||
    byId('showRegister') ||
    byId('createAccountBtn');

  if (showRegisterBtn) {
    showRegisterBtn.addEventListener(
      'click',
      event => {
        event.preventDefault();
        showRegisterForm();
      }
    );
  }

  const showLoginBtn =
    byId('showLoginBtn') ||
    byId('showLogin');

  if (showLoginBtn) {
    showLoginBtn.addEventListener(
      'click',
      event => {
        event.preventDefault();
        showLoginForm();
      }
    );
  }

  const logoutBtn =
    byId('logoutBtn');

  if (logoutBtn) {
    logoutBtn.addEventListener(
      'click',
      event => {
        event.preventDefault();
        logoutUser();
      }
    );
  }

  /* -----------------------------------------
     Theme
  ----------------------------------------- */

  const themeBtn =
    byId('themeBtn') ||
    byId('themeToggle');

  if (themeBtn) {
    themeBtn.addEventListener(
      'click',
      event => {
        event.preventDefault();
        toggleTheme();
      }
    );
  }

  /* -----------------------------------------
     Menu
  ----------------------------------------- */

  const menuBtn =
    byId('menuBtn') ||
    byId('hamburgerBtn') ||
    byId('hamburger');

  if (menuBtn) {
    menuBtn.addEventListener(
      'click',
      event => {
        event.preventDefault();
        openDrawer();
      }
    );
  }

  const closeDrawerBtn =
    byId('closeDrawer') ||
    byId('drawerClose');

  if (closeDrawerBtn) {
    closeDrawerBtn.addEventListener(
      'click',
      event => {
        event.preventDefault();
        closeDrawer();
      }
    );
  }

  const drawerOverlay =
    byId('drawerOverlay') ||
    $('.drawer-overlay');

  if (drawerOverlay) {
    drawerOverlay.addEventListener(
      'click',
      closeDrawer
    );
  }

  /* -----------------------------------------
     Telegram
  ----------------------------------------- */

  const telegramButtons =
    $$(
      '[data-action="telegram"]'
    );

  telegramButtons.forEach(button => {
    button.addEventListener(
      'click',
      event => {
        event.preventDefault();

        window.open(
          TELEGRAM_URL,
          '_blank',
          'noopener,noreferrer'
        );
      }
    );
  });

  const telegramBtn =
    byId('telegramBtn') ||
    byId('joinTelegram');

  if (telegramBtn) {
    telegramBtn.addEventListener(
      'click',
      event => {
        event.preventDefault();

        window.open(
          TELEGRAM_URL,
          '_blank',
          'noopener,noreferrer'
        );
      }
    );
  }

  /* -----------------------------------------
     Notifications
  ----------------------------------------- */

  const notificationBtn =
    byId('notificationBtn') ||
    byId('notificationsBtn') ||
    byId('bellBtn');

  if (notificationBtn) {
    notificationBtn.addEventListener(
      'click',
      event => {
        event.preventDefault();
        openNotifications();
      }
    );
  }

  const closeNotificationBtn =
    byId('closeNotificationModal') ||
    byId('closeNotifications');

  if (closeNotificationBtn) {
    closeNotificationBtn.addEventListener(
      'click',
      event => {
        event.preventDefault();
        closeNotifications();
      }
    );
  }

  /* -----------------------------------------
     Search
  ----------------------------------------- */

  const searchInputs =
    $$(
      '#searchInput, #appSearch, .search-input'
    );

  searchInputs.forEach(input => {
    input.addEventListener(
      'input',
      event => {
        handleSearch(
          event.target.value
        );
      }
    );
  });

  /* -----------------------------------------
     Tabs
  ----------------------------------------- */

  $$('[data-tab]').forEach(tab => {
    tab.addEventListener(
      'click',
      event => {
        event.preventDefault();

        setActiveTab(
          event.currentTarget.dataset.tab
        );
      }
    );
  });

  /* -----------------------------------------
     App Grid
  ----------------------------------------- */

  document.addEventListener(
    'click',
    event => {

      const card =
        event.target.closest(
          '.app-card'
        );

      if (card) {
        const id =
          card.dataset.appId;

        const app =
          apps.find(
            item =>
              getAppId(item) ===
              String(id)
          );

        if (app) {
          openAppDetails(app);
        }

        return;
      }

      const closeBtn =
        event.target.closest(
          '[data-close-modal]'
        );

      if (closeBtn) {
        const modal =
          closeBtn.closest(
            '.modal'
          );

        closeModal(modal);

        return;
      }

      const closeSuccess =
        event.target.closest(
          '[data-close-success]'
        );

      if (closeSuccess) {
        closeSuccessPopup();
        return;
      }

      const openUnlocked =
        event.target.closest(
          '[data-open-unlocked]'
        );

      if (openUnlocked) {
        closeSuccessPopup();
        openAppUrl();
        return;
      }
    }
  );

  /* -----------------------------------------
     App Modal
  ----------------------------------------- */

  const closeAppBtn =
    byId('closeAppModal') ||
    byId('closeAppDetails');

  if (closeAppBtn) {
    closeAppBtn.addEventListener(
      'click',
      event => {
        event.preventDefault();
        closeAppModal();
      }
    );
  }

  const verifyBtn =
    byId('verifyKeyBtn') ||
    byId('verifyAppKeyBtn') ||
    byId('verifyKey');

  if (verifyBtn) {
    verifyBtn.addEventListener(
      'click',
      event => {
        event.preventDefault();
        verifyAppKey();
      }
    );
  }

  const keyInput =
    byId('appKeyInput') ||
    byId('keyInput') ||
    byId('verifyKeyInput');

  if (keyInput) {
    keyInput.addEventListener(
      'keydown',
      event => {
        if (event.key === 'Enter') {
          event.preventDefault();
          verifyAppKey();
        }
      }
    );
  }

  const openAppBtn =
    byId('openAppBtn') ||
    byId('openUnlockedApp');

  if (openAppBtn) {
    openAppBtn.addEventListener(
      'click',
      event => {
        event.preventDefault();
        openAppUrl();
      }
    );
  }

  const purchaseHelpBtn =
    byId('purchaseHelpBtn') ||
    byId('howToPurchaseBtn') ||
    byId('purchaseVideoBtn');

  if (purchaseHelpBtn) {
    purchaseHelpBtn.addEventListener(
      'click',
      event => {
        event.preventDefault();
        openPurchaseHelp();
      }
    );
  }

  /* -----------------------------------------
     Close modal when clicking outside
  ----------------------------------------- */

  document.addEventListener(
    'click',
    event => {
      const modal =
        event.target.classList?.contains(
          'modal'
        )
          ? event.target
          : null;

      if (modal) {
        closeModal(modal);
      }
    }
  );

  /* -----------------------------------------
     Escape key
  ----------------------------------------- */

  document.addEventListener(
    'keydown',
    event => {
      if (event.key !== 'Escape') {
        return;
      }

      closeDrawer();
      closeAllModals();
    }
  );

  /* -----------------------------------------
     Enter key login
  ----------------------------------------- */

  const loginPassword =
    byId('loginPassword');

  if (loginPassword) {
    loginPassword.addEventListener(
      'keydown',
      event => {
        if (event.key === 'Enter') {
          event.preventDefault();
          loginUser();
        }
      }
    );
  }

  const registerPassword =
    byId('registerPassword');

  if (registerPassword) {
    registerPassword.addEventListener(
      'keydown',
      event => {
        if (event.key === 'Enter') {
          event.preventDefault();
          registerUser();
        }
      }
    );
  }
}

/* =========================================================
   INIT
   ========================================================= */

async function initApp() {

  /*
    Theme first
  */

  applyTheme(
    getSavedTheme()
  );

  /*
    Client ID
  */

  getClientId();

  /*
    Saved user immediately show karo
    taaki refresh par Account state
    instantly visible ho.
  */

  currentUser =
    getSavedUser();

  updateAccountUI();

  /*
    Events
  */

  setupEvents();

  /*
    Apps + notifications
  */

  await Promise.allSettled([
    loadApps(),
    loadNotifications()
  ]);

  /*
    Server se login verify/restore
  */

  if (getToken()) {
    await loadMe();
  }

  /*
    Splash
  */

  hideSplash();

  console.log(
    'Prep Master initialized'
  );
}

/* =========================================================
   GLOBAL FUNCTIONS
   =========================================================
   HTML ke onclick="" ke liye bhi available
   ========================================================= */

window.openAccountModal =
  openAccountModal;

window.closeAccountModal =
  closeAccountModal;

window.loginUser =
  loginUser;

window.registerUser =
  registerUser;

window.logoutUser =
  logoutUser;

window.openDrawer =
  openDrawer;

window.closeDrawer =
  closeDrawer;

window.toggleTheme =
  toggleTheme;

window.loadApps =
  loadApps;

window.openAppDetails =
  openAppDetails;

window.closeAppModal =
  closeAppModal;

window.verifyAppKey =
  verifyAppKey;

window.openAppUrl =
  openAppUrl;

window.openPurchaseHelp =
  openPurchaseHelp;

window.openNotifications =
  openNotifications;

window.closeNotifications =
  closeNotifications;

window.setActiveTab =
  setActiveTab;

window.handleSearch =
  handleSearch;

window.goToApps =
  goToApps;

/* =========================================================
   START
   ========================================================= */

if (
  document.readyState ===
  'loading'
) {
  document.addEventListener(
    'DOMContentLoaded',
    initApp,
    {
      once: true
    }
  );
} else {
  initApp();
}
