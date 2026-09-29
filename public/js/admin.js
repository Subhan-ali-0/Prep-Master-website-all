/* =========================================================
   PREP MASTER — ADMIN PANEL JS
   Supabase + Express Backend
   ========================================================= */

const API = "/api";

let adminToken = localStorage.getItem("pm_admin_token") || "";
let apps = [];
let keys = [];
let notifications = [];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

/* =========================================================
   HELPERS
   ========================================================= */

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showMessage(message, type = "success") {
  let box = $("#adminMessage");

  if (!box) {
    box = document.createElement("div");
    box.id = "adminMessage";
    box.className = "admin-message";
    document.body.appendChild(box);
  }

  box.textContent = message;
  box.className = `admin-message ${type} show`;

  clearTimeout(window.adminMessageTimer);

  window.adminMessageTimer = setTimeout(() => {
    box.classList.remove("show");
  }, 3000);
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (adminToken) {
    headers.Authorization = `Bearer ${adminToken}`;
  }

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.error || data.message || "Something went wrong");
  }

  return data;
}

/* =========================================================
   LOGIN
   ========================================================= */

function showLogin() {
  const loginScreen = $("#adminLogin");
  const dashboard = $("#adminDashboard");

  if (loginScreen) loginScreen.style.display = "flex";
  if (dashboard) dashboard.style.display = "none";
}

function showDashboard() {
  const loginScreen = $("#adminLogin");
  const dashboard = $("#adminDashboard");

  if (loginScreen) loginScreen.style.display = "none";
  if (dashboard) dashboard.style.display = "block";
}

async function adminLogin(event) {
  event?.preventDefault();

  const username = $("#adminUsername")?.value.trim();
  const password = $("#adminPassword")?.value;

  if (!username || !password) {
    showMessage("Username aur password enter karo.", "error");
    return;
  }

  try {
    const result = await api("/admin/login", {
      method: "POST",
      headers: {
        Authorization: ""
      },
      body: JSON.stringify({
        username,
        password
      })
    });

    adminToken = result.token;

    localStorage.setItem("pm_admin_token", adminToken);

    showMessage("Admin login successful.");

    showDashboard();

    await loadDashboard();
  } catch (error) {
    showMessage(error.message || "Login failed.", "error");
  }
}

/* =========================================================
   LOGOUT
   ========================================================= */

function adminLogout() {
  localStorage.removeItem("pm_admin_token");
  adminToken = "";

  apps = [];
  keys = [];
  notifications = [];

  showLogin();
}

/* =========================================================
   DASHBOARD LOAD
   ========================================================= */

async function loadDashboard() {
  if (!adminToken) {
    showLogin();
    return;
  }

  showDashboard();

  try {
    await Promise.all([
      loadApps(),
      loadKeys(),
      loadNotifications()
    ]);

    updateStats();
  } catch (error) {
    if (
      error.message.toLowerCase().includes("token") ||
      error.message.toLowerCase().includes("unauthorized") ||
      error.message.toLowerCase().includes("admin")
    ) {
      adminLogout();
      return;
    }

    showMessage(error.message, "error");
  }
}

/* =========================================================
   APPS
   ========================================================= */

async function loadApps() {
  const data = await api("/apps/all");

  apps = Array.isArray(data) ? data : data.apps || [];

  renderApps();
  populateAppSelect();
  updateStats();
}

function renderApps() {
  const container =
    $("#appsList") ||
    $("#adminAppsList") ||
    $("#appTableBody");

  if (!container) return;

  if (!apps.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No apps available</h3>
        <p>Admin panel se pehla app add karo.</p>
      </div>
    `;
    return;
  }

  /*
   * Table body support
   */
  if (container.id === "appTableBody") {
    container.innerHTML = apps
      .map(
        (app) => `
        <tr>
          <td>
            <div class="admin-app-name">
              ${
                app.logo_url
                  ? `<img src="${escapeHTML(app.logo_url)}" alt="">`
                  : `<div class="admin-app-placeholder">PM</div>`
              }
              <span>${escapeHTML(app.name)}</span>
            </div>
          </td>

          <td>
            <span class="status-badge ${
              app.active ? "active" : "inactive"
            }">
              ${app.active ? "Active" : "Inactive"}
            </span>
          </td>

          <td>${escapeHTML(app.category || "General")}</td>

          <td>
            <div class="table-actions">
              <button onclick="editApp('${app.id}')">
                Edit
              </button>

              <button onclick="toggleApp('${app.id}')">
                ${app.active ? "Disable" : "Enable"}
              </button>

              <button class="danger" onclick="deleteApp('${app.id}')">
                Delete
              </button>
            </div>
          </td>
        </tr>
      `
      )
      .join("");

    return;
  }

  container.innerHTML = apps
    .map(
      (app) => `
      <div class="admin-app-card">

        <div class="admin-app-card-top">

          <div class="admin-app-icon">
            ${
              app.logo_url
                ? `<img src="${escapeHTML(app.logo_url)}" alt="">`
                : `<span>PM</span>`
            }
          </div>

          <div class="admin-app-info">
            <h3>${escapeHTML(app.name)}</h3>
            <p>${escapeHTML(app.category || "General")}</p>
          </div>

          <span class="status-badge ${
            app.active ? "active" : "inactive"
          }">
            ${app.active ? "Active" : "Inactive"}
          </span>

        </div>

        <p class="admin-app-description">
          ${escapeHTML(app.description || "No description")}
        </p>

        <div class="admin-app-actions">

          <button
            type="button"
            onclick="editApp('${app.id}')"
          >
            Edit
          </button>

          <button
            type="button"
            onclick="toggleApp('${app.id}')"
          >
            ${app.active ? "Disable" : "Enable"}
          </button>

          <button
            type="button"
            class="danger"
            onclick="deleteApp('${app.id}')"
          >
            Delete
          </button>

        </div>

      </div>
    `
    )
    .join("");
}

/* =========================================================
   APP FORM
   ========================================================= */

function openAppForm(app = null) {
  const modal =
    $("#appModal") ||
    $("#appFormModal");

  if (!modal) return;

  const title = $("#appModalTitle");

  if (title) {
    title.textContent = app ? "Edit App" : "Add New App";
  }

  setValue("appId", app?.id || "");
  setValue("appName", app?.name || "");
  setValue("appLogo", app?.logo_url || "");
  setValue("appDescription", app?.description || "");
  setValue("appHomeUrl", app?.home_url || "");
  setValue("appCategory", app?.category || "");
  setValue("appPurchaseVideo", app?.purchase_video_url || "");

  const active = $("#appActive");

  if (active) {
    active.checked = app ? Boolean(app.active) : true;
  }

  modal.classList.add("show");
  modal.style.display = "flex";
}

function closeAppForm() {
  const modal =
    $("#appModal") ||
    $("#appFormModal");

  if (!modal) return;

  modal.classList.remove("show");
  modal.style.display = "none";
}

function setValue(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.value = value ?? "";
  }
}

function editApp(id) {
  const app = apps.find((item) => item.id === id);

  if (!app) {
    showMessage("App nahi mila.", "error");
    return;
  }

  openAppForm(app);
}

async function saveApp(event) {
  event?.preventDefault();

  const id = $("#appId")?.value.trim();

  const payload = {
    name: $("#appName")?.value.trim(),
    logo_url: $("#appLogo")?.value.trim(),
    description: $("#appDescription")?.value.trim(),
    home_url: $("#appHomeUrl")?.value.trim(),
    category: $("#appCategory")?.value.trim(),
    purchase_video_url: $("#appPurchaseVideo")?.value.trim(),
    active: $("#appActive")
      ? $("#appActive").checked
      : true
  };

  if (!payload.name) {
    showMessage("App name enter karo.", "error");
    return;
  }

  if (!payload.home_url) {
    showMessage("App URL enter karo.", "error");
    return;
  }

  try {
    if (id) {
      await api(`/apps/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });

      showMessage("App updated successfully.");
    } else {
      await api("/apps", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      showMessage("App added successfully.");
    }

    closeAppForm();

    await loadApps();
    updateStats();
  } catch (error) {
    showMessage(error.message, "error");
  }
}

/* =========================================================
   TOGGLE APP
   ========================================================= */

async function toggleApp(id) {
  const app = apps.find((item) => item.id === id);

  if (!app) return;

  const action = app.active ? "disable" : "enable";

  if (
    !confirm(
      `Kya aap "${app.name}" ko ${action} karna chahte ho?`
    )
  ) {
    return;
  }

  try {
    await api(`/apps/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({
        active: !app.active
      })
    });

    showMessage(
      app.active
        ? "App disabled."
        : "App enabled."
    );

    await loadApps();
    updateStats();
  } catch (error) {
    showMessage(error.message, "error");
  }
}

/* =========================================================
   DELETE APP
   ========================================================= */

async function deleteApp(id) {
  const app = apps.find((item) => item.id === id);

  if (!app) return;

  const confirmed = confirm(
    `"${app.name}" ko permanently delete karna hai?\n\nIs app ke keys bhi affect ho sakte hain.`
  );

  if (!confirmed) return;

  try {
    await api(`/apps/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });

    showMessage("App deleted.");

    await loadApps();
    await loadKeys();

    updateStats();
  } catch (error) {
    showMessage(error.message, "error");
  }
}

/* =========================================================
   KEYS
   ========================================================= */

async function loadKeys() {
  const data = await api("/keys");

  keys = Array.isArray(data) ? data : data.keys || [];

  renderKeys();
  updateStats();
}

function populateAppSelect() {
  const selects = [
    $("#keyAppId"),
    $("#generateAppId"),
    $("#selectedAppId")
  ];

  selects.forEach((select) => {
    if (!select) return;

    const currentValue = select.value;

    select.innerHTML = `
      <option value="">Select App</option>
      ${apps
        .map(
          (app) =>
            `<option value="${escapeHTML(app.id)}">
              ${escapeHTML(app.name)}
            </option>`
        )
        .join("")}
    `;

    if (currentValue) {
      select.value = currentValue;
    }
  });
}

function renderKeys() {
  const container =
    $("#keysList") ||
    $("#adminKeysList") ||
    $("#keyTableBody");

  if (!container) return;

  if (!keys.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No keys generated</h3>
        <p>App select karke new keys generate karo.</p>
      </div>
    `;
    return;
  }

  const appMap = new Map(
    apps.map((app) => [app.id, app.name])
  );

  if (container.id === "keyTableBody") {
    container.innerHTML = keys
      .map(
        (key) => `
        <tr>
          <td>
            <code>${escapeHTML(key.key)}</code>
          </td>

          <td>
            ${escapeHTML(
              appMap.get(key.app_id) || "Unknown App"
            )}
          </td>

          <td>
            <span class="status-badge ${
              key.active ? "active" : "inactive"
            }">
              ${key.active ? "Active" : "Used/Disabled"}
            </span>
          </td>

          <td>
            ${
              key.used_by
                ? escapeHTML(key.used_by)
                : "Not used"
            }
          </td>

          <td>
            <button
              class="danger"
              onclick="deleteKey('${key.id}')"
            >
              Delete
            </button>
          </td>
        </tr>
      `
      )
      .join("");

    return;
  }

  container.innerHTML = keys
    .map(
      (key) => `
      <div class="admin-key-card">

        <div class="key-main">

          <code>${escapeHTML(key.key)}</code>

          <span class="status-badge ${
            key.active ? "active" : "inactive"
          }">
            ${key.active ? "Active" : "Used"}
          </span>

        </div>

        <div class="key-info">
          <span>
            App:
            <strong>
              ${escapeHTML(
                appMap.get(key.app_id) || "Unknown"
              )}
            </strong>
          </span>

          <span>
            ${
              key.used_by
                ? `Used by: ${escapeHTML(key.used_by)}`
                : "Not used"
            }
          </span>
        </div>

        <div class="key-actions">

          <button
            type="button"
            onclick="copyKey('${escapeHTML(key.key)}')"
          >
            Copy
          </button>

          <button
            type="button"
            class="danger"
            onclick="deleteKey('${key.id}')"
          >
            Delete
          </button>

        </div>

      </div>
    `
    )
    .join("");
}

/* =========================================================
   GENERATE KEYS
   ========================================================= */

async function generateKeys(event) {
  event?.preventDefault();

  const appId =
    $("#keyAppId")?.value ||
    $("#generateAppId")?.value ||
    $("#selectedAppId")?.value;

  const count = Number(
    $("#keyCount")?.value ||
    $("#generateKeyCount")?.value ||
    1
  );

  if (!appId) {
    showMessage("Pehle app select karo.", "error");
    return;
  }

  if (!Number.isInteger(count) || count < 1 || count > 1000) {
    showMessage(
      "Keys ki quantity 1 se 1000 ke beech honi chahiye.",
      "error"
    );
    return;
  }

  try {
    const result = await api("/keys/generate", {
      method: "POST",
      body: JSON.stringify({
        appId,
        count
      })
    });

    const generated =
      result.keys ||
      result.generated ||
      [];

    showGeneratedKeys(generated);

    showMessage(
      `${generated.length || count} key generate ho gayi.`
    );

    await loadKeys();
  } catch (error) {
    showMessage(error.message, "error");
  }
}

function showGeneratedKeys(generatedKeys) {
  if (!generatedKeys?.length) return;

  const text = generatedKeys
    .map((item) =>
      typeof item === "string"
        ? item
        : item.key
    )
    .filter(Boolean)
    .join("\n");

  const box =
    $("#generatedKeys") ||
    $("#generatedKeysOutput");

  if (box) {
    box.value = text;
    box.textContent = text;
  }

  const modal =
    $("#keysResultModal") ||
    $("#generatedKeysModal");

  if (modal) {
    modal.classList.add("show");
    modal.style.display = "flex";
  }
}

function closeGeneratedKeys() {
  const modal =
    $("#keysResultModal") ||
    $("#generatedKeysModal");

  if (!modal) return;

  modal.classList.remove("show");
  modal.style.display = "none";
}

async function copyGeneratedKeys() {
  const box =
    $("#generatedKeys") ||
    $("#generatedKeysOutput");

  if (!box) return;

  const text = box.value || box.textContent || "";

  try {
    await navigator.clipboard.writeText(text);
    showMessage("Keys copied.");
  } catch {
    showMessage("Keys copy nahi hui.", "error");
  }
}

async function copyKey(key) {
  try {
    await navigator.clipboard.writeText(key);
    showMessage("Key copied.");
  } catch {
    showMessage("Key copy nahi hui.", "error");
  }
}

/* =========================================================
   DELETE KEY
   ========================================================= */

async function deleteKey(id) {
  if (!confirm("Kya ye key delete karni hai?")) {
    return;
  }

  try {
    await api(`/keys/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });

    showMessage("Key deleted.");

    await loadKeys();
    updateStats();
  } catch (error) {
    showMessage(error.message, "error");
  }
}

/* =========================================================
   NOTIFICATIONS
   ========================================================= */

async function loadNotifications() {
  const data = await api("/notifications");

  notifications = Array.isArray(data)
    ? data
    : data.notifications || [];

  renderNotifications();
  updateStats();
}

function renderNotifications() {
  const container =
    $("#notificationsList") ||
    $("#adminNotificationsList");

  if (!container) return;

  if (!notifications.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No notifications</h3>
        <p>Abhi koi notification publish nahi hui.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = notifications
    .map(
      (notification) => `
      <div class="admin-notification-card">

        <div>
          <h3>
            ${escapeHTML(notification.title)}
          </h3>

          <p>
            ${escapeHTML(notification.message)}
          </p>

          <small>
            ${formatDate(notification.created_at)}
          </small>
        </div>

        <button
          type="button"
          class="danger"
          onclick="deleteNotification('${notification.id}')"
        >
          Delete
        </button>

      </div>
    `
    )
    .join("");
}

async function publishNotification(event) {
  event?.preventDefault();

  const title =
    $("#notificationTitle")?.value.trim();

  const message =
    $("#notificationMessage")?.value.trim();

  if (!title || !message) {
    showMessage(
      "Notification title aur message dono enter karo.",
      "error"
    );
    return;
  }

  try {
    await api("/notifications", {
      method: "POST",
      body: JSON.stringify({
        title,
        message
      })
    });

    setValue("notificationTitle", "");
    setValue("notificationMessage", "");

    showMessage("Notification published.");

    await loadNotifications();
  } catch (error) {
    showMessage(error.message, "error");
  }
}

async function deleteNotification(id) {
  if (!confirm("Notification delete karni hai?")) {
    return;
  }

  try {
    await api(
      `/notifications/${encodeURIComponent(id)}`,
      {
        method: "DELETE"
      }
    );

    showMessage("Notification deleted.");

    await loadNotifications();
  } catch (error) {
    showMessage(error.message, "error");
  }
}

/* =========================================================
   STATS
   ========================================================= */

function updateStats() {
  const activeApps = apps.filter(
    (app) => app.active
  ).length;

  const inactiveApps = apps.filter(
    (app) => !app.active
  ).length;

  const activeKeys = keys.filter(
    (key) => key.active
  ).length;

  const usedKeys = keys.filter(
    (key) => !key.active
  ).length;

  setText("totalApps", apps.length);
  setText("activeApps", activeApps);
  setText("inactiveApps", inactiveApps);

  setText("totalKeys", keys.length);
  setText("activeKeys", activeKeys);
  setText("usedKeys", usedKeys);

  setText(
    "totalNotifications",
    notifications.length
  );
}

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

/* =========================================================
   SEARCH
   ========================================================= */

function searchApps(value) {
  const query = value
    .trim()
    .toLowerCase();

  const cards = $$(".admin-app-card");

  cards.forEach((card) => {
    const text = card.textContent.toLowerCase();

    card.style.display =
      !query || text.includes(query)
        ? ""
        : "none";
  });
}

function searchKeys(value) {
  const query = value
    .trim()
    .toLowerCase();

  const cards = $$(".admin-key-card");

  cards.forEach((card) => {
    const text = card.textContent.toLowerCase();

    card.style.display =
      !query || text.includes(query)
        ? ""
        : "none";
  });
}

/* =========================================================
   DATE
   ========================================================= */

function formatDate(date) {
  if (!date) return "";

  try {
    return new Date(date).toLocaleString(
      "en-IN",
      {
        dateStyle: "medium",
        timeStyle: "short"
      }
    );
  } catch {
    return date;
  }
}

/* =========================================================
   SIDEBAR / MOBILE MENU
   ========================================================= */

function toggleAdminMenu() {
  const sidebar =
    $("#adminSidebar") ||
    $(".admin-sidebar");

  const overlay =
    $("#adminOverlay") ||
    $(".admin-overlay");

  if (sidebar) {
    sidebar.classList.toggle("open");
  }

  if (overlay) {
    overlay.classList.toggle("show");
  }
}

function closeAdminMenu() {
  const sidebar =
    $("#adminSidebar") ||
    $(".admin-sidebar");

  const overlay =
    $("#adminOverlay") ||
    $(".admin-overlay");

  sidebar?.classList.remove("open");
  overlay?.classList.remove("show");
}

/* =========================================================
   SECTION SWITCH
   ========================================================= */

function showSection(sectionName) {
  const sections = $$(
    "[data-admin-section]"
  );

  sections.forEach((section) => {
    section.style.display =
      section.dataset.adminSection === sectionName
        ? ""
        : "none";
  });

  const navItems = $$(
    "[data-section]"
  );

  navItems.forEach((item) => {
    item.classList.toggle(
      "active",
      item.dataset.section === sectionName
    );
  });

  closeAdminMenu();
}

/* =========================================================
   THEME
   ========================================================= */

function initTheme() {
  const savedTheme =
    localStorage.getItem("pm_admin_theme");

  if (savedTheme === "dark") {
    document.body.classList.add("dark");
  }

  updateThemeButton();
}

function toggleTheme() {
  document.body.classList.toggle("dark");

  const dark =
    document.body.classList.contains("dark");

  localStorage.setItem(
    "pm_admin_theme",
    dark ? "dark" : "light"
  );

  updateThemeButton();
}

function updateThemeButton() {
  const dark =
    document.body.classList.contains("dark");

  const buttons = [
    $("#themeToggle"),
    $("#adminThemeToggle")
  ];

  buttons.forEach((button) => {
    if (!button) return;

    button.textContent = dark
      ? "☀️"
      : "🌙";

    button.setAttribute(
      "aria-label",
      dark
        ? "Switch to light mode"
        : "Switch to dark mode"
    );
  });
}

/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function initEvents() {
  /*
   * Login
   */
  const loginForm =
    $("#adminLoginForm") ||
    $("#loginForm");

  loginForm?.addEventListener(
    "submit",
    adminLogin
  );

  /*
   * App form
   */
  const appForm =
    $("#appForm") ||
    $("#appEditorForm");

  appForm?.addEventListener(
    "submit",
    saveApp
  );

  /*
   * Key generator
   */
  const keyForm =
    $("#keyGeneratorForm") ||
    $("#generateKeysForm");

  keyForm?.addEventListener(
    "submit",
    generateKeys
  );

  /*
   * Notification form
   */
  const notificationForm =
    $("#notificationForm") ||
    $("#publishNotificationForm");

  notificationForm?.addEventListener(
    "submit",
    publishNotification
  );

  /*
   * Logout
   */
  $$("#adminLogout").forEach((button) => {
    button.addEventListener(
      "click",
      adminLogout
    );
  });

  /*
   * Theme
   */
  $$("#themeToggle, #adminThemeToggle").forEach(
    (button) => {
      button.addEventListener(
        "click",
        toggleTheme
      );
    }
  );

  /*
   * Mobile menu
   */
  $$("#adminMenuToggle").forEach(
    (button) => {
      button.addEventListener(
        "click",
        toggleAdminMenu
      );
    }
  );

  $$("#adminOverlay").forEach(
    (overlay) => {
      overlay.addEventListener(
        "click",
        closeAdminMenu
      );
    }
  );

  /*
   * Add app buttons
   */
  $$("#addAppBtn, #newAppBtn").forEach(
    (button) => {
      button.addEventListener(
        "click",
        () => openAppForm()
      );
    }
  );

  /*
   * Close app modal
   */
  $$("#closeAppModal, #cancelApp").forEach(
    (button) => {
      button.addEventListener(
        "click",
        closeAppForm
      );
    }
  );

  /*
   * Generated keys modal
   */
  $$("#closeKeysModal").forEach(
    (button) => {
      button.addEventListener(
        "click",
        closeGeneratedKeys
      );
    }
  );

  $$("#copyGeneratedKeys").forEach(
    (button) => {
      button.addEventListener(
        "click",
        copyGeneratedKeys
      );
    }
  );

  /*
   * Search
   */
  $("#appSearch")?.addEventListener(
    "input",
    (event) =>
      searchApps(event.target.value)
  );

  $("#keySearch")?.addEventListener(
    "input",
    (event) =>
      searchKeys(event.target.value)
  );

  /*
   * Navigation
   */
  $$("[data-section]").forEach((item) => {
    item.addEventListener(
      "click",
      () => {
        const section =
          item.dataset.section;

        if (section) {
          showSection(section);
        }
      }
    );
  });
}

/* =========================================================
   GLOBAL FUNCTIONS
   HTML onclick KE LIYE
   ========================================================= */

window.adminLogin = adminLogin;
window.adminLogout = adminLogout;

window.openAppForm = openAppForm;
window.closeAppForm = closeAppForm;
window.editApp = editApp;
window.saveApp = saveApp;
window.toggleApp = toggleApp;
window.deleteApp = deleteApp;

window.generateKeys = generateKeys;
window.copyKey = copyKey;
window.copyGeneratedKeys =
  copyGeneratedKeys;
window.closeGeneratedKeys =
  closeGeneratedKeys;
window.deleteKey = deleteKey;

window.publishNotification =
  publishNotification;
window.deleteNotification =
  deleteNotification;

window.toggleAdminMenu =
  toggleAdminMenu;
window.closeAdminMenu =
  closeAdminMenu;

window.showSection =
  showSection;

window.toggleTheme =
  toggleTheme;

/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    initTheme();
    initEvents();

    if (adminToken) {
      await loadDashboard();
    } else {
      showLogin();
    }
  }
);
