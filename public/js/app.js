/* =========================================================
   PREP MASTER — USER APP JS
   ========================================================= */

const API = "/api";

let apps = [];
let notifications = [];
let currentApp = null;
let currentUser = null;

let token = localStorage.getItem("pm_token") || "";
let unlockedApps = JSON.parse(
  localStorage.getItem("pm_unlocked") || "[]"
);

let clientId =
  localStorage.getItem("pm_client_id");

if (!clientId) {
  clientId =
    crypto.randomUUID?.() ||
    "guest-" +
      Date.now() +
      "-" +
      Math.random()
        .toString(36)
        .slice(2);

  localStorage.setItem(
    "pm_client_id",
    clientId
  );
}

/* =========================================================
   HELPERS
   ========================================================= */

const $ = (selector) =>
  document.querySelector(selector);

const $$ = (selector) =>
  document.querySelectorAll(selector);

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function saveUnlockedApps() {
  localStorage.setItem(
    "pm_unlocked",
    JSON.stringify(unlockedApps)
  );
}

function isUnlocked(appId) {
  return unlockedApps.includes(appId);
}

function showToast(message, type = "success") {
  let toast = $("#toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.className = `toast ${type} show`;

  clearTimeout(window.toastTimer);

  window.toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function apiHeaders() {
  const headers = {
    "Content-Type": "application/json",
    "X-Client-Id": clientId
  };

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  return headers;
}

async function api(path, options = {}) {
  const response = await fetch(
    `${API}${path}`,
    {
      ...options,
      headers: {
        ...apiHeaders(),
        ...(options.headers || {})
      }
    }
  );

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.message ||
      "Request failed"
    );
  }

  return data;
}

/* =========================================================
   SPLASH SCREEN
   ========================================================= */

function hideSplash() {
  const splash = $("#splash");

  if (!splash) return;

  setTimeout(() => {
    splash.classList.add("hide");

    setTimeout(() => {
      splash.style.display = "none";
    }, 500);
  }, 900);
}

/* =========================================================
   LOAD APPS
   ========================================================= */

async function loadApps() {
  try {
    const data = await api("/apps");

    apps = Array.isArray(data)
      ? data
      : data.apps || [];

    renderApps();
    updateAppCount();
  } catch (error) {
    console.error(error);

    showToast(
      "Apps load nahi ho paayi.",
      "error"
    );
  }
}

/* =========================================================
   APP CARD
   ========================================================= */

function createAppCard(app) {
  const unlocked = isUnlocked(app.id);

  const logo = app.logo_url
    ? `
      <img
        src="${escapeHTML(app.logo_url)}"
        alt="${escapeHTML(app.name)}"
        class="app-card-logo"
      >
    `
    : `
      <div class="app-card-logo placeholder">
        PM
      </div>
    `;

  return `
    <article
      class="app-card ${
        unlocked ? "unlocked" : ""
      }"
      data-app-id="${escapeHTML(app.id)}"
    >

      <div class="app-card-image">
        ${logo}

        ${
          unlocked
            ? `
              <span class="app-status unlocked">
                Unlocked
              </span>
            `
            : `
              <span class="app-status locked">
                Premium
              </span>
            `
        }
      </div>

      <div class="app-card-body">

        <div class="app-card-title-row">

          <h3>
            ${escapeHTML(app.name)}
          </h3>

        </div>

        ${
          app.category
            ? `
              <span class="app-category">
                ${escapeHTML(app.category)}
              </span>
            `
            : ""
        }

        <p>
          ${escapeHTML(
            app.description ||
              "Premium educational app"
          )}
        </p>

        <button
          class="app-open-btn"
          type="button"
          onclick="handleAppClick('${escapeHTML(
            app.id
          )}')"
        >
          ${
            unlocked
              ? "Open App"
              : "View App"
          }
        </button>

      </div>

    </article>
  `;
}

/* =========================================================
   RENDER APPS
   ========================================================= */

function renderApps(list = apps) {
  const container =
    $("#appsGrid") ||
    $("#appGrid") ||
    $("#appsList");

  if (!container) return;

  if (!list.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📱</div>
        <h3>No apps available</h3>
        <p>
          Abhi koi app available nahi hai.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML = list
    .map(createAppCard)
    .join("");
}

/* =========================================================
   HANDLE APP CLICK
   ========================================================= */

function handleAppClick(appId) {
  const app = apps.find(
    (item) => item.id === appId
  );

  if (!app) {
    showToast(
      "App nahi mili.",
      "error"
    );
    return;
  }

  if (isUnlocked(app.id)) {
    openAppUrl(app);
    return;
  }

  openAppDetails(app);
}

/* =========================================================
   OPEN APP URL
   ========================================================= */

function openAppUrl(app) {
  if (!app.home_url) {
    showToast(
      "Is app ka URL admin ne set nahi kiya.",
      "error"
    );
    return;
  }

  /*
   * Admin ke saved URL ki home screen open hogi.
   */
  window.location.href = app.home_url;
}

/* =========================================================
   APP DETAILS MODAL
   ========================================================= */

function openAppDetails(app) {
  currentApp = app;

  const modal =
    $("#appModal") ||
    $("#appDetailsModal");

  if (!modal) {
    console.error(
      "App modal nahi mila."
    );
    return;
  }

  const title =
    $("#modalAppTitle");

  const description =
    $("#modalAppDescription");

  const logo =
    $("#modalAppLogo");

  const keyInput =
    $("#appKey");

  const purchaseVideo =
    $("#purchaseVideoBtn");

  if (title) {
    title.textContent =
      app.name || "App";
  }

  if (description) {
    description.textContent =
      app.description || "";
  }

  if (logo) {
    logo.innerHTML = app.logo_url
      ? `
        <img
          src="${escapeHTML(
            app.logo_url
          )}"
          alt="${escapeHTML(
            app.name
          )}"
        >
      `
      : `
        <span>PM</span>
      `;
  }

  if (keyInput) {
    keyInput.value = "";
  }

  if (purchaseVideo) {
    if (app.purchase_video_url) {
      purchaseVideo.style.display =
        "inline-flex";

      purchaseVideo.onclick =
        () => {
          window.open(
            app.purchase_video_url,
            "_blank",
            "noopener,noreferrer"
          );
        };
    } else {
      purchaseVideo.style.display =
        "none";
    }
  }

  modal.classList.add("show");
  modal.style.display = "flex";

  setTimeout(() => {
    keyInput?.focus();
  }, 100);
}

function closeAppDetails() {
  const modal =
    $("#appModal") ||
    $("#appDetailsModal");

  if (!modal) return;

  modal.classList.remove("show");

  setTimeout(() => {
    modal.style.display = "none";
  }, 200);

  currentApp = null;
}

/* =========================================================
   VERIFY APP KEY
   ========================================================= */

async function verifyAppKey(event) {
  event?.preventDefault();

  if (!currentApp) {
    showToast(
      "App select nahi hui.",
      "error"
    );
    return;
  }

  const input =
    $("#appKey") ||
    $("#keyInput");

  const key =
    input?.value.trim();

  if (!key) {
    showToast(
      "App key enter karo.",
      "error"
    );

    input?.focus();
    return;
  }

  const button =
    $("#verifyKeyBtn") ||
    $("#verifyBtn");

  if (button) {
    button.disabled = true;
    button.textContent =
      "Verifying...";
  }

  try {
    const result =
      await api("/keys/verify", {
        method: "POST",
        body: JSON.stringify({
          appId: currentApp.id,
          key
        })
      });

    if (
      result.success === false
    ) {
      throw new Error(
        result.error ||
          "Invalid key"
      );
    }

    /*
     * App unlock save karo.
     */
    if (
      !unlockedApps.includes(
        currentApp.id
      )
    ) {
      unlockedApps.push(
        currentApp.id
      );
    }

    saveUnlockedApps();

    showToast(
      "App successfully unlocked."
    );

    closeAppDetails();

    renderApps();

    /*
     * Agar server ne direct URL diya hai
     * to wahi open karo.
     */
    if (
      result.homeUrl ||
      result.home_url
    ) {
      window.location.href =
        result.homeUrl ||
        result.home_url;
      return;
    }

    /*
     * Otherwise current app ka
     * saved URL open karo.
     */
    openAppUrl(currentApp);

  } catch (error) {
    console.error(error);

    showToast(
      error.message ||
        "Invalid app key.",
      "error"
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent =
        "Verify App Key";
    }
  }
}

/* =========================================================
   NOTIFICATIONS
   ========================================================= */

async function loadNotifications() {
  try {
    const data =
      await api("/notifications");

    notifications =
      Array.isArray(data)
        ? data
        : data.notifications || [];

    renderNotifications();

    updateNotificationCount();
  } catch (error) {
    console.error(error);
  }
}

function renderNotifications() {
  const container =
    $("#notificationsList") ||
    $("#notificationList");

  if (!container) return;

  if (!notifications.length) {
    container.innerHTML = `
      <div class="empty-state small">
        <p>
          No notifications available.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML =
    notifications
      .map(
        (notification) => `
          <div class="notification-item">

            <div class="notification-icon">
              🔔
            </div>

            <div class="notification-content">

              <h3>
                ${escapeHTML(
                  notification.title
                )}
              </h3>

              <p>
                ${escapeHTML(
                  notification.message
                )}
              </p>

              <small>
                ${formatDate(
                  notification.created_at
                )}
              </small>

            </div>

          </div>
        `
      )
      .join("");
}

function updateNotificationCount() {
  const count =
    notifications.length;

  const badges = $$(
    ".notification-count"
  );

  badges.forEach((badge) => {
    badge.textContent = count;

    badge.style.display =
      count > 0
        ? ""
        : "none";
  });
}

function openNotifications() {
  const modal =
    $("#notificationModal") ||
    $("#notificationsModal");

  if (!modal) return;

  modal.classList.add("show");
  modal.style.display = "flex";

  renderNotifications();
}

function closeNotifications() {
  const modal =
    $("#notificationModal") ||
    $("#notificationsModal");

  if (!modal) return;

  modal.classList.remove("show");

  setTimeout(() => {
    modal.style.display = "none";
  }, 200);
}

/* =========================================================
   SEARCH
   ========================================================= */

function searchApps(value) {
  const query =
    value.trim().toLowerCase();

  const filtered = apps.filter(
    (app) => {
      const name =
        app.name?.toLowerCase() ||
        "";

      const description =
        app.description
          ?.toLowerCase() ||
        "";

      const category =
        app.category
          ?.toLowerCase() ||
        "";

      return (
        name.includes(query) ||
        description.includes(query) ||
        category.includes(query)
      );
    }
  );

  renderApps(filtered);
}

/* =========================================================
   TABS
   ========================================================= */

function showAppsTab() {
  setActiveTab("apps");

  renderApps(apps);
}

function showMyAppsTab() {
  setActiveTab("myapps");

  const myApps = apps.filter(
    (app) =>
      unlockedApps.includes(
        app.id
      )
  );

  renderApps(myApps);
}

function setActiveTab(tab) {
  const tabs = $$(
    "[data-tab]"
  );

  tabs.forEach((item) => {
    item.classList.toggle(
      "active",
      item.dataset.tab === tab
    );
  });
}

/* =========================================================
   DRAWER / MENU
   ========================================================= */

function openDrawer() {
  const drawer =
    $("#drawer") ||
    $("#sideMenu");

  const shade =
    $("#drawerShade") ||
    $("#menuShade");

  drawer?.classList.add(
    "open"
  );

  shade?.classList.add(
    "show"
  );
}

function closeDrawer() {
  const drawer =
    $("#drawer") ||
    $("#sideMenu");

  const shade =
    $("#drawerShade") ||
    $("#menuShade");

  drawer?.classList.remove(
    "open"
  );

  shade?.classList.remove(
    "show"
  );
}

/* =========================================================
   TELEGRAM
   ========================================================= */

function openTelegram() {
  window.open(
    "https://t.me/prepmaster0",
    "_blank",
    "noopener,noreferrer"
  );
}

/* =========================================================
   ACCOUNT
   ========================================================= */

function openAccountModal() {
  const modal =
    $("#accountModal");

  if (!modal) return;

  updateAccountUI();

  modal.classList.add("show");
  modal.style.display = "flex";
}

function closeAccountModal() {
  const modal =
    $("#accountModal");

  if (!modal) return;

  modal.classList.remove("show");

  setTimeout(() => {
    modal.style.display = "none";
  }, 200);
}

function updateAccountUI() {
  const loggedIn =
    Boolean(token);

  const loginBox =
    $("#loginBox");

  const registerBox =
    $("#registerBox");

  const accountBox =
    $("#loggedInBox");

  if (loginBox) {
    loginBox.style.display =
      loggedIn
        ? "none"
        : "";
  }

  if (registerBox) {
    registerBox.style.display =
      loggedIn
        ? "none"
        : "";
  }

  if (accountBox) {
    accountBox.style.display =
      loggedIn
        ? ""
        : "none";
  }

  const username =
    $("#accountUsername");

  if (
    username &&
    currentUser
  ) {
    username.textContent =
      currentUser.username ||
      "";
  }
}

/* =========================================================
   REGISTER
   ========================================================= */

async function register(event) {
  event?.preventDefault();

  const username =
    $("#registerUsername")
      ?.value.trim();

  const password =
    $("#registerPassword")
      ?.value;

  if (!username || !password) {
    showToast(
      "Username aur password enter karo.",
      "error"
    );
    return;
  }

  try {
    const result =
      await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          username,
          password
        })
      });

    if (result.token) {
      token = result.token;

      localStorage.setItem(
        "pm_token",
        token
      );
    }

    currentUser =
      result.user || null;

    await loadMe();

    showToast(
      "Account successfully created."
    );

    updateAccountUI();

  } catch (error) {
    showToast(
      error.message ||
        "Registration failed.",
      "error"
    );
  }
}

/* =========================================================
   LOGIN
   ========================================================= */

async function login(event) {
  event?.preventDefault();

  const username =
    $("#loginUsername")
      ?.value.trim();

  const password =
    $("#loginPassword")
      ?.value;

  if (!username || !password) {
    showToast(
      "Username aur password enter karo.",
      "error"
    );
    return;
  }

  try {
    const result =
      await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username,
          password
        })
      });

    token = result.token || "";

    if (token) {
      localStorage.setItem(
        "pm_token",
        token
      );
    }

    currentUser =
      result.user || null;

    await loadMe();

    showToast(
      "Login successful."
    );

    updateAccountUI();

  } catch (error) {
    showToast(
      error.message ||
        "Login failed.",
      "error"
    );
  }
}

/* =========================================================
   CURRENT USER
   ========================================================= */

async function loadMe() {
  if (!token) return;

  try {
    const result =
      await api("/me");

    currentUser =
      result.user ||
      result;

    /*
     * Server par saved unlocked apps
     * ko localStorage ke saath sync karo.
     */
    const serverUnlocked =
      currentUser.unlocked_apps ||
      currentUser.unlockedApps ||
      [];

    if (Array.isArray(
      serverUnlocked
    )) {
      unlockedApps =
        Array.from(
          new Set([
            ...unlockedApps,
            ...serverUnlocked
          ])
        );

      saveUnlockedApps();
    }

    updateAccountUI();

    renderApps();

  } catch (error) {
    console.error(
      "loadMe:",
      error
    );

    /*
     * Invalid token hone par logout.
     */
    if (
      error.message
        ?.toLowerCase()
        .includes("token")
    ) {
      logout();
    }
  }
}

/* =========================================================
   LOGOUT
   ========================================================= */

function logout() {
  token = "";
  currentUser = null;

  localStorage.removeItem(
    "pm_token"
  );

  /*
   * Unlocked apps ko delete nahi kar rahe.
   * Guest unlocks browser me remembered rahenge.
   */

  updateAccountUI();

  showToast(
    "Logout successful."
  );
}

/* =========================================================
   THEME
   ========================================================= */

function initTheme() {
  const saved =
    localStorage.getItem(
      "pm_theme"
    );

  if (saved === "dark") {
    document.body.classList.add(
      "dark"
    );
  } else {
    document.body.classList.remove(
      "dark"
    );
  }

  updateThemeIcon();
}

function toggleTheme() {
  document.body.classList.toggle(
    "dark"
  );

  const dark =
    document.body.classList.contains(
      "dark"
    );

  localStorage.setItem(
    "pm_theme",
    dark ? "dark" : "light"
  );

  updateThemeIcon();
}

function updateThemeIcon() {
  const dark =
    document.body.classList.contains(
      "dark"
    );

  const buttons = $$(
    "#themeToggle, .theme-toggle"
  );

  buttons.forEach((button) => {
    button.textContent =
      dark ? "☀️" : "🌙";
  });
}

/* =========================================================
   FORMAT DATE
   ========================================================= */

function formatDate(date) {
  if (!date) return "";

  try {
    return new Date(
      date
    ).toLocaleString(
      "en-IN",
      {
        dateStyle: "medium",
        timeStyle: "short"
      }
    );
  } catch {
    return "";
  }
}

/* =========================================================
   APP COUNT
   ========================================================= */

function updateAppCount() {
  const count =
    apps.length;

  $$(".app-count").forEach(
    (element) => {
      element.textContent =
        count;
    }
  );
}

/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function initEvents() {

  /*
   * Theme
   */
  $$("#themeToggle").forEach(
    (button) => {
      button.addEventListener(
        "click",
        toggleTheme
      );
    }
  );

  /*
   * Search
   */
  $("#searchInput")
    ?.addEventListener(
      "input",
      (event) => {
        searchApps(
          event.target.value
        );
      }
    );

  /*
   * Tabs
   */
  $$("[data-tab]").forEach(
    (tab) => {
      tab.addEventListener(
        "click",
        () => {
          if (
            tab.dataset.tab ===
            "myapps"
          ) {
            showMyAppsTab();
          } else {
            showAppsTab();
          }
        }
      );
    }
  );

  /*
   * Notification button
   */
  $$("#notificationBtn").forEach(
    (button) => {
      button.addEventListener(
        "click",
        openNotifications
      );
    }
  );

  /*
   * Close notification
   */
  $$("#closeNotificationModal").forEach(
    (button) => {
      button.addEventListener(
        "click",
        closeNotifications
      );
    }
  );

  /*
   * Drawer
   */
  $$("#menuBtn, #hamburgerBtn").forEach(
    (button) => {
      button.addEventListener(
        "click",
        openDrawer
      );
    }
  );

  $$("#drawerShade, #menuShade").forEach(
    (element) => {
      element.addEventListener(
        "click",
        closeDrawer
      );
    }
  );

  /*
   * Telegram
   */
  $$("#telegramBtn").forEach(
    (button) => {
      button.addEventListener(
        "click",
        openTelegram
      );
    }
  );

  /*
   * Account
   */
  $$("#accountBtn").forEach(
    (button) => {
      button.addEventListener(
        "click",
        openAccountModal
      );
    }
  );

  $$("#closeAccountModal").forEach(
    (button) => {
      button.addEventListener(
        "click",
        closeAccountModal
      );
    }
  );

  /*
   * Login
   */
  $("#loginForm")
    ?.addEventListener(
      "submit",
      login
    );

  /*
   * Register
   */
  $("#registerForm")
    ?.addEventListener(
      "submit",
      register
    );

  /*
   * Logout
   */
  $$("#logoutBtn").forEach(
    (button) => {
      button.addEventListener(
        "click",
        logout
      );
    }
  );

  /*
   * App key verification
   */
  $("#appKeyForm")
    ?.addEventListener(
      "submit",
      verifyAppKey
    );

  /*
   * Alternative verify buttons
   */
  $$("#verifyKeyBtn").forEach(
    (button) => {
      button.addEventListener(
        "click",
        verifyAppKey
      );
    }
  );

  /*
   * Close app modal
   */
  $$("#closeAppModal, #closeAppDetails")
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          closeAppDetails
        );
      }
    );

  /*
   * Purchase video
   * Actual URL currentApp se set hota hai.
   */
  $$("#purchaseVideoBtn").forEach(
    (button) => {
      button.addEventListener(
        "click",
        () => {
          if (
            currentApp?.purchase_video_url
          ) {
            window.open(
              currentApp.purchase_video_url,
              "_blank",
              "noopener,noreferrer"
            );
          }
        }
      );
    }
  );

  /*
   * Escape key
   */
  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key !== "Escape"
      ) {
        return;
      }

      closeAppDetails();
      closeNotifications();
      closeAccountModal();
      closeDrawer();
    }
  );

  /*
   * Modal background click
   */
  $$(".modal").forEach(
    (modal) => {
      modal.addEventListener(
        "click",
        (event) => {
          if (
            event.target === modal
          ) {
            modal.classList.remove(
              "show"
            );

            setTimeout(() => {
              modal.style.display =
                "none";
            }, 200);
          }
        }
      );
    }
  );
}

/* =========================================================
   GLOBAL FUNCTIONS
   ========================================================= */

window.handleAppClick =
  handleAppClick;

window.openAppDetails =
  openAppDetails;

window.closeAppDetails =
  closeAppDetails;

window.verifyAppKey =
  verifyAppKey;

window.openNotifications =
  openNotifications;

window.closeNotifications =
  closeNotifications;

window.openDrawer =
  openDrawer;

window.closeDrawer =
  closeDrawer;

window.openTelegram =
  openTelegram;

window.openAccountModal =
  openAccountModal;

window.closeAccountModal =
  closeAccountModal;

window.login =
  login;

window.register =
  register;

window.logout =
  logout;

window.toggleTheme =
  toggleTheme;

window.showAppsTab =
  showAppsTab;

window.showMyAppsTab =
  showMyAppsTab;

window.searchApps =
  searchApps;

/* =========================================================
   START
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    initTheme();
    initEvents();

    /*
     * Splash
     */
    hideSplash();

    /*
     * User account restore
     */
    if (token) {
      await loadMe();
    }

    /*
     * Apps + notifications
     */
    await Promise.all([
      loadApps(),
      loadNotifications()
    ]);

    /*
     * Default tab
     */
    showAppsTab();
  }
);
