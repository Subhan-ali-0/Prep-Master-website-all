/* =========================================
   PREP MASTER - ADMIN PANEL JS
   ========================================= */

(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => document.querySelectorAll(selector);

  let apps = [];
  let editingAppId = null;

  const state = {
    adminToken: localStorage.getItem("prep_admin_token") || ""
  };

  /* =========================================
     HELPERS
     ========================================= */

  async function api(url, options = {}) {
    const headers = {
      ...(options.headers || {})
    };

    if (state.adminToken) {
      headers.Authorization = `Bearer ${state.adminToken}`;
    }

    if (
      options.body &&
      typeof options.body === "object" &&
      !(options.body instanceof FormData)
    ) {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, {
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
      throw new Error(data.error || data.message || "Request failed");
    }

    return data;
  }

  function showMessage(message, type = "info") {
    let box = $("#adminMessage");

    if (!box) {
      box = document.createElement("div");
      box.id = "adminMessage";
      box.className = "status";
      document.body.prepend(box);
    }

    box.textContent = message;

    box.className = "status";

    if (type === "success") {
      box.classList.add("status-success");
    } else if (type === "error") {
      box.classList.add("status-error");
    } else {
      box.classList.add("status-info");
    }

    clearTimeout(showMessage.timer);

    showMessage.timer = setTimeout(() => {
      box.remove();
    }, 4000);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function value(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
  }

  function checked(id) {
    const el = document.getElementById(id);
    return !!el?.checked;
  }

  function setValue(id, val = "") {
    const el = document.getElementById(id);
    if (el) el.value = val ?? "";
  }

  function setChecked(id, val) {
    const el = document.getElementById(id);
    if (el) el.checked = !!val;
  }

  function setDisplay(id, display) {
    const el = document.getElementById(id);
    if (el) el.style.display = display;
  }

  /* =========================================
     LOGIN
     ========================================= */

  function showLogin() {
    setDisplay("loginSection", "flex");
    setDisplay("adminSection", "none");
  }

  function showAdmin() {
    setDisplay("loginSection", "none");
    setDisplay("adminSection", "block");
  }

  async function login() {
    const username = value("adminUsername");
    const password = value("adminPassword");

    if (!username || !password) {
      showMessage("Username aur password enter karo.", "error");
      return;
    }

    try {
      const data = await api("/api/admin/login", {
        method: "POST",
        body: {
          username,
          password
        }
      });

      if (!data.token) {
        throw new Error("Login token nahi mila.");
      }

      state.adminToken = data.token;
      localStorage.setItem("prep_admin_token", data.token);

      showAdmin();
      await loadAll();

      showMessage("Admin login successful.", "success");
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  function logout() {
    state.adminToken = "";
    localStorage.removeItem("prep_admin_token");
    showLogin();
  }

  /* =========================================
     APP LOAD
     ========================================= */

  async function loadApps() {
    const data = await api("/api/apps/all");

    apps = Array.isArray(data)
      ? data
      : Array.isArray(data.apps)
      ? data.apps
      : [];

    renderApps();
  }

  function renderApps() {
    const container =
      $("#appsList") ||
      $("#appList") ||
      $(".apps-list");

    if (!container) return;

    if (!apps.length) {
      container.innerHTML = `
        <div class="empty-state">
          <strong>No apps found</strong>
          <span>Abhi koi app add nahi ki gayi.</span>
        </div>
      `;
      return;
    }

    container.innerHTML = apps
      .map((app) => {
        const logo =
          app.logo_url ||
          "/assets/logo.png";

        return `
          <div class="app-item">
            <div class="app-item-left">
              <img
                class="app-item-logo"
                src="${escapeHtml(logo)}"
                alt=""
                onerror="this.src='/assets/logo.png'"
              >

              <div class="app-item-info">
                <h3 class="app-item-name">
                  ${escapeHtml(app.name)}
                </h3>

                <p class="app-item-description">
                  ${escapeHtml(app.description || "No description")}
                </p>

                ${
                  app.active
                    ? `<span class="badge badge-active">Active</span>`
                    : `<span class="badge badge-inactive">Inactive</span>`
                }
              </div>
            </div>

            <div class="app-item-actions">
              <button
                class="btn btn-secondary btn-small"
                data-edit-app="${escapeHtml(app.id)}"
              >
                Edit
              </button>

              <button
                class="btn btn-danger btn-small"
                data-delete-app="${escapeHtml(app.id)}"
              >
                Delete
              </button>
            </div>
          </div>
        `;
      })
      .join("");

    container.querySelectorAll("[data-edit-app]").forEach((button) => {
      button.addEventListener("click", () => {
        editApp(button.dataset.editApp);
      });
    });

    container.querySelectorAll("[data-delete-app]").forEach((button) => {
      button.addEventListener("click", () => {
        deleteApp(button.dataset.deleteApp);
      });
    });
  }

  /* =========================================
     APP FORM
     ========================================= */

  function clearAppForm() {
    editingAppId = null;

    [
      "appName",
      "appLogoUrl",
      "homeUrl",
      "appCategory",
      "appDescription",
      "purchaseVideoUrl",
      "headerLogoUrl",
      "headerName",
      "headerBadge",
      "batchListUrl",
      "batchOpenUrl"
    ].forEach((id) => setValue(id, ""));

    setChecked("appActive", true);
    setChecked("headerEnabled", false);

    setValue("appTheme", "dark");
    setValue("aiTheme", "dark");
    setValue("communityTheme", "dark");
    setValue("headerSize", "100");

    updateHeaderSizeLabel();

    const title = $("#appFormTitle");
    if (title) title.textContent = "Add App";

    const saveButton =
      $("#saveAppBtn") ||
      $("#saveApp");

    if (saveButton) {
      saveButton.textContent = "Add App";
    }

    const preview = $("#headerLogoPreview");
    if (preview) {
      preview.removeAttribute("src");
      preview.style.display = "none";
    }

    const file = $("#headerLogoFile");
    if (file) file.value = "";

    const appLogoFile = $("#appLogoFile");
    if (appLogoFile) appLogoFile.value = "";
    const appLogoPreview = $("#appLogoPreview");
    if (appLogoPreview) {
      appLogoPreview.removeAttribute("src");
      appLogoPreview.style.display = "none";
    }
  }

  function editApp(id) {
    const app = apps.find((item) => String(item.id) === String(id));

    if (!app) {
      showMessage("App nahi mili.", "error");
      return;
    }

    editingAppId = app.id;

    setValue("appName", app.name);
    setValue("appLogoUrl", app.logo_url);
    const appLogoPreview = $("#appLogoPreview");
    if (appLogoPreview && app.logo_url) {
      appLogoPreview.src = app.logo_url;
      appLogoPreview.style.display = "block";
    }
    setValue("homeUrl", app.home_url);
    setValue("appCategory", app.category);
    setValue("appDescription", app.description);
    setValue("purchaseVideoUrl", app.purchase_video_url);

    setValue("appTheme", app.app_theme || "dark");
    setValue("aiTheme", app.ai_theme || "dark");
    setValue(
      "communityTheme",
      app.community_theme || "dark"
    );

    setChecked(
      "headerEnabled",
      app.header_enabled
    );

    setValue(
      "headerLogoUrl",
      app.header_logo_url
    );

    setValue(
      "headerName",
      app.header_name
    );

    setValue(
      "headerBadge",
      app.header_badge
    );

    setValue(
      "headerSize",
      app.header_size || 100
    );

    setValue(
      "batchListUrl",
      app.batch_list_url
    );

    setValue(
      "batchOpenUrl",
      app.batch_open_url
    );

    setChecked(
      "appActive",
      app.active !== false
    );

    updateHeaderSizeLabel();

    const title = $("#appFormTitle");
    if (title) title.textContent = "Edit App";

    const saveButton =
      $("#saveAppBtn") ||
      $("#saveApp");

    if (saveButton) {
      saveButton.textContent = "Update App";
    }

    const preview = $("#headerLogoPreview");

    if (preview && app.header_logo_url) {
      preview.src = app.header_logo_url;
      preview.style.display = "block";
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  async function saveApp() {
    const name = value("appName");

    if (!name) {
      showMessage("App name required hai.", "error");
      return;
    }

    const payload = {
      name,
      logo_url: value("appLogoUrl"),
      home_url: value("homeUrl"),
      category: value("appCategory"),
      description: value("appDescription"),
      purchase_video_url: value("purchaseVideoUrl"),
      active: checked("appActive"),

      app_theme: value("appTheme") || "dark",
      ai_theme: value("aiTheme") || "dark",
      community_theme:
        value("communityTheme") || "dark",

      header_enabled: checked("headerEnabled"),
      header_logo_url: value("headerLogoUrl"),
      header_name: value("headerName"),
      header_badge: value("headerBadge"),

      header_size:
        Number(value("headerSize")) || 100,

      batch_list_url: value("batchListUrl"),
      batch_open_url: value("batchOpenUrl")
    };

    try {
      if (editingAppId) {
        await api(`/api/apps/${editingAppId}`, {
          method: "PUT",
          body: payload
        });

        showMessage(
          "App successfully update ho gayi.",
          "success"
        );
      } else {
        await api("/api/apps", {
          method: "POST",
          body: payload
        });

        showMessage(
          "App successfully add ho gayi.",
          "success"
        );
      }

      clearAppForm();
      await loadApps();
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  async function deleteApp(id) {
    const app = apps.find(
      (item) => String(item.id) === String(id)
    );

    if (!app) return;

    const confirmed = confirm(
      `"${app.name}" ko delete karna hai?`
    );

    if (!confirmed) return;

    try {
      await api(`/api/apps/${id}`, {
        method: "DELETE"
      });

      if (String(editingAppId) === String(id)) {
        clearAppForm();
      }

      await loadApps();

      showMessage(
        "App delete ho gayi.",
        "success"
      );
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  /* =========================================
     APP LOGO UPLOAD
     ========================================= */

  async function uploadAppLogo() {
    const input = $("#appLogoFile");
    const file = input?.files?.[0];
    if (!file) {
      showMessage("Pehle app logo image select karo.", "error");
      return;
    }
    if (!file.type.startsWith("image/")) {
      showMessage("Sirf image file upload karo.", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showMessage("Image maximum 5MB ki ho sakti hai.", "error");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    try {
      showMessage("App logo upload ho raha hai...");
      const data = await api("/api/admin/upload-app-logo", { method: "POST", body: formData });
      if (!data.url) throw new Error("Upload URL nahi mili.");
      setValue("appLogoUrl", data.url);
      const preview = $("#appLogoPreview");
      if (preview) { preview.src = data.url; preview.style.display = "block"; }
      showMessage("App logo upload ho gaya.", "success");
    } catch (error) { showMessage(error.message, "error"); }
  }

  /* =========================================
     HEADER LOGO UPLOAD
     ========================================= */

  async function uploadHeaderLogo() {
    const input = $("#headerLogoFile");

    if (!input || !input.files?.length) {
      showMessage(
        "Pehle header logo file select karo.",
        "error"
      );
      return;
    }

    const file = input.files[0];

    if (!file.type.startsWith("image/")) {
      showMessage(
        "Sirf image file upload karo.",
        "error"
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showMessage(
        "Image maximum 5MB ki ho sakti hai.",
        "error"
      );
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      showMessage("Logo upload ho raha hai...");

      const data = await api(
        "/api/admin/upload-header-logo",
        {
          method: "POST",
          body: formData
        }
      );

      if (!data.url) {
        throw new Error(
          "Upload URL nahi mili."
        );
      }

      setValue(
        "headerLogoUrl",
        data.url
      );

      const preview =
        $("#headerLogoPreview");

      if (preview) {
        preview.src = data.url;
        preview.style.display = "block";
      }

      showMessage(
        "Header logo upload ho gaya.",
        "success"
      );
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  /* =========================================
     HEADER SIZE
     ========================================= */

  function updateHeaderSizeLabel() {
    const slider = $("#headerSize");
    const label =
      $("#headerSizeValue") ||
      $("#headerSizeLabel");

    if (!slider || !label) return;

    label.textContent =
      `${slider.value}%`;
  }

  /* =========================================
     KEYS
     ========================================= */

  async function loadKeys(appId) {
    if (!appId) return;

    const container =
      $("#keysList") ||
      $("#keyList") ||
      $(".key-list");

    if (!container) return;

    try {
      const data = await api(
        `/api/keys?appId=${encodeURIComponent(appId)}`
      );

      const keys = Array.isArray(data)
        ? data
        : Array.isArray(data.keys)
        ? data.keys
        : [];

      if (!keys.length) {
        container.innerHTML = `
          <div class="empty-state">
            <strong>No keys</strong>
            <span>Is app ke liye abhi koi key nahi hai.</span>
          </div>
        `;
        return;
      }

      container.innerHTML = keys
        .map(
          (key) => `
            <div class="key-item">
              <div>
                <div class="key-value">
                  ${escapeHtml(key.key)}
                </div>

                <div class="key-meta">
                  ${
                    key.active
                      ? "Active"
                      : "Inactive"
                  }
                  ${
                    key.used_by
                      ? ` • Used by ${escapeHtml(
                          key.used_by
                        )}`
                      : ""
                  }
                </div>
              </div>

              <button
                class="btn btn-danger btn-small"
                data-delete-key="${escapeHtml(
                  key.id
                )}"
              >
                Delete
              </button>
            </div>
          `
        )
        .join("");

      container
        .querySelectorAll("[data-delete-key]")
        .forEach((button) => {
          button.addEventListener(
            "click",
            () => deleteKey(button.dataset.deleteKey)
          );
        });
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  async function generateKeys() {
    const appId =
      value("keyAppId") ||
      value("selectedAppId") ||
      value("appKeyApp");

    const count =
      Number(
        value("keyCount") ||
        value("generateKeyCount") ||
        "1"
      ) || 1;

    if (!appId) {
      showMessage(
        "Pehle app select karo.",
        "error"
      );
      return;
    }

    if (count < 1 || count > 500) {
      showMessage(
        "Keys 1 se 500 ke beech honi chahiye.",
        "error"
      );
      return;
    }

    try {
      const data = await api(
        "/api/keys/generate",
        {
          method: "POST",
          body: {
            app_id: appId,
            count
          }
        }
      );

      const keys =
        data.keys ||
        data.generated ||
        [];

      if (keys.length) {
        const text = keys
          .map((item) =>
            typeof item === "string"
              ? item
              : item.key
          )
          .filter(Boolean)
          .join("\n");

        const output =
          $("#generatedKeys") ||
          $("#keyOutput");

        if (output) {
          if ("value" in output) {
            output.value = text;
          } else {
            output.textContent = text;
          }
        }

        try {
          await navigator.clipboard.writeText(text);
        } catch {}
      }

      await loadKeys(appId);

      showMessage(
        `${keys.length || count} key generate ho gayi.`,
        "success"
      );
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  async function deleteKey(id) {
    if (!id) return;

    if (!confirm("Is key ko delete karna hai?")) {
      return;
    }

    try {
      await api(`/api/keys/${id}`, {
        method: "DELETE"
      });

      const appId =
        value("keyAppId") ||
        value("selectedAppId") ||
        value("appKeyApp");

      if (appId) {
        await loadKeys(appId);
      }

      showMessage(
        "Key delete ho gayi.",
        "success"
      );
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  /* =========================================
     NOTIFICATIONS
     ========================================= */

  async function loadNotifications() {
    const container =
      $("#notificationsList") ||
      $("#notificationList") ||
      $(".notification-list");

    if (!container) return;

    try {
      const data = await api(
        "/api/notifications"
      );

      const notifications =
        Array.isArray(data)
          ? data
          : Array.isArray(data.notifications)
          ? data.notifications
          : [];

      if (!notifications.length) {
        container.innerHTML = `
          <div class="empty-state">
            <strong>No notifications</strong>
            <span>Abhi koi notification nahi hai.</span>
          </div>
        `;
        return;
      }

      container.innerHTML = notifications
        .map(
          (item) => `
            <div class="notification-item">
              <div class="notification-title">
                ${escapeHtml(item.title)}
              </div>

              <div class="notification-message">
                ${escapeHtml(item.message)}
              </div>

              <div class="notification-date">
                ${item.created_at
                  ? new Date(
                      item.created_at
                    ).toLocaleString()
                  : ""}
              </div>

              <div class="button-row">
                <button
                  class="btn btn-danger btn-small"
                  data-delete-notification="${escapeHtml(
                    item.id
                  )}"
                >
                  Delete
                </button>
              </div>
            </div>
          `
        )
        .join("");

      container
        .querySelectorAll(
          "[data-delete-notification]"
        )
        .forEach((button) => {
          button.addEventListener(
            "click",
            () =>
              deleteNotification(
                button.dataset.deleteNotification
              )
          );
        });
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  async function createNotification() {
    const title = value("notificationTitle");
    const message = value("notificationMessage");

    if (!title || !message) {
      showMessage(
        "Title aur message dono required hain.",
        "error"
      );
      return;
    }

    try {
      await api("/api/notifications", {
        method: "POST",
        body: {
          title,
          message
        }
      });

      setValue("notificationTitle", "");
      setValue("notificationMessage", "");

      await loadNotifications();

      showMessage(
        "Notification add ho gaya.",
        "success"
      );
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  async function deleteNotification(id) {
    if (!confirm("Notification delete karna hai?")) {
      return;
    }

    try {
      await api(
        `/api/notifications/${id}`,
        {
          method: "DELETE"
        }
      );

      await loadNotifications();

      showMessage(
        "Notification delete ho gaya.",
        "success"
      );
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  /* =========================================
     APP SELECT DROPDOWNS
     ========================================= */

  function populateAppSelects() {
    const selects = [
      $("#keyAppId"),
      $("#selectedAppId"),
      $("#appKeyApp")
    ].filter(Boolean);

    selects.forEach((select) => {
      const current = select.value;

      select.innerHTML = `
        <option value="">Select App</option>
        ${apps
          .map(
            (app) => `
              <option value="${escapeHtml(
                app.id
              )}">
                ${escapeHtml(app.name)}
              </option>
            `
          )
          .join("")}
      `;

      if (
        apps.some(
          (app) =>
            String(app.id) === String(current)
        )
      ) {
        select.value = current;
      }
    });
  }

  /* =========================================
     LOAD ALL
     ========================================= */

  async function loadAll() {
    await loadApps();
    populateAppSelects();
    await loadNotifications();

    const appId =
      value("keyAppId") ||
      value("selectedAppId") ||
      value("appKeyApp");

    if (appId) {
      await loadKeys(appId);
    }
  }

  /* =========================================
     EVENT LISTENERS
     ========================================= */

  function bindEvents() {
    const loginButton =
      $("#adminLoginBtn") ||
      $("#loginBtn");

    if (loginButton) {
      loginButton.addEventListener(
        "click",
        login
      );
    }

    const logoutButton =
      $("#adminLogoutBtn") ||
      $("#logoutBtn");

    if (logoutButton) {
      logoutButton.addEventListener(
        "click",
        logout
      );
    }

    const saveButton =
      $("#saveAppBtn") ||
      $("#saveApp");

    if (saveButton) {
      saveButton.addEventListener(
        "click",
        saveApp
      );
    }

    const newAppButton =
      $("#newAppBtn") ||
      $("#addNewAppBtn");

    if (newAppButton) {
      newAppButton.addEventListener(
        "click",
        clearAppForm
      );
    }

    const appLogoUploadButton = $("#uploadAppLogoBtn");
    if (appLogoUploadButton) appLogoUploadButton.addEventListener("click", uploadAppLogo);

    const appLogoFileInput = $("#appLogoFile");
    if (appLogoFileInput) {
      appLogoFileInput.addEventListener("change", () => {
        const file = appLogoFileInput.files?.[0];
        const preview = $("#appLogoPreview");
        if (file && preview && file.type.startsWith("image/")) {
          preview.src = URL.createObjectURL(file);
          preview.style.display = "block";
        }
      });
    }

    const uploadButton =
      $("#uploadHeaderLogoBtn") ||
      $("#uploadLogoBtn");

    if (uploadButton) {
      uploadButton.addEventListener(
        "click",
        uploadHeaderLogo
      );
    }

    const sizeSlider =
      $("#headerSize");

    if (sizeSlider) {
      sizeSlider.addEventListener(
        "input",
        updateHeaderSizeLabel
      );
    }

    const generateButton =
      $("#generateKeysBtn") ||
      $("#generateKeyBtn");

    if (generateButton) {
      generateButton.addEventListener(
        "click",
        generateKeys
      );
    }

    const notificationButton =
      $("#createNotificationBtn") ||
      $("#addNotificationBtn");

    if (notificationButton) {
      notificationButton.addEventListener(
        "click",
        createNotification
      );
    }

    [
      $("#keyAppId"),
      $("#selectedAppId"),
      $("#appKeyApp")
    ]
      .filter(Boolean)
      .forEach((select) => {
        select.addEventListener(
          "change",
          () => loadKeys(select.value)
        );
      });

    const passwordInput =
      $("#adminPassword");

    if (passwordInput) {
      passwordInput.addEventListener(
        "keydown",
        (event) => {
          if (event.key === "Enter") {
            login();
          }
        }
      );
    }

    const fileInput =
      $("#headerLogoFile");

    if (fileInput) {
      fileInput.addEventListener(
        "change",
        () => {
          const file = fileInput.files?.[0];

          if (!file) return;

          const preview =
            $("#headerLogoPreview");

          if (
            preview &&
            file.type.startsWith("image/")
          ) {
            preview.src =
              URL.createObjectURL(file);

            preview.style.display =
              "block";
          }
        }
      );
    }
  }

  /* =========================================
     START
     ========================================= */

  async function init() {
    bindEvents();
    updateHeaderSizeLabel();

    if (!state.adminToken) {
      showLogin();
      return;
    }

    try {
      await api("/api/admin/me");
      showAdmin();
      await loadAll();
    } catch {
      state.adminToken = "";
      localStorage.removeItem(
        "prep_admin_token"
      );
      showLogin();
    }
  }

  document.addEventListener(
    "DOMContentLoaded",
    init
  );

  /* =========================================
     GLOBAL HELPERS
     ========================================= */

  window.PrepMasterAdmin = {
    loadApps,
    loadAll,
    loadKeys,
    clearAppForm,
    editApp,
    deleteApp,
    saveApp,
    uploadHeaderLogo,
    uploadAppLogo,
    generateKeys,
    loadNotifications,
    createNotification,
    deleteNotification,
    logout
  };
})();
