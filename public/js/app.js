/* =========================================
   PREP MASTER - HOME APP JS
   ========================================= */

(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);

  let apps = [];
  let currentTab = "apps";

  const state = {
    token: localStorage.getItem("prep_token") || "",
    user: null
  };

  /* =========================================
     API
     ========================================= */

  async function api(url, options = {}) {
    const headers = {
      ...(options.headers || {})
    };

    if (state.token) {
      headers.Authorization = `Bearer ${state.token}`;
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
      throw new Error(
        data.error ||
        data.message ||
        "Request failed"
      );
    }

    return data;
  }

  /* =========================================
     HELPERS
     ========================================= */

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function showMessage(message, type = "info") {
    let box = $("#appMessage");

    if (!box) {
      box = document.createElement("div");
      box.id = "appMessage";

      Object.assign(box.style, {
        position: "fixed",
        top: "78px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: "9999",
        maxWidth: "calc(100% - 30px)",
        padding: "11px 15px",
        borderRadius: "10px",
        fontSize: "13px",
        fontWeight: "700",
        boxShadow: "0 8px 25px rgba(0,0,0,.12)"
      });

      document.body.appendChild(box);
    }

    box.textContent = message;

    box.style.background =
      type === "error"
        ? "#fee2e2"
        : type === "success"
        ? "#dcfce7"
        : "#dbeafe";

    box.style.color =
      type === "error"
        ? "#b91c1c"
        : type === "success"
        ? "#15803d"
        : "#1d4ed8";

    clearTimeout(showMessage.timer);

    showMessage.timer = setTimeout(() => {
      box.remove();
    }, 3500);
  }

  function getUnlockedApps() {
    try {
      return JSON.parse(
        localStorage.getItem(
          "prep_unlocked_apps"
        ) || "[]"
      );
    } catch {
      return [];
    }
  }

  function isUnlocked(appId) {
    return getUnlockedApps().some(
      (id) => String(id) === String(appId)
    );
  }

  function saveUnlocked(appId) {
    const unlocked = getUnlockedApps();

    if (
      !unlocked.some(
        (id) => String(id) === String(appId)
      )
    ) {
      unlocked.push(appId);
    }

    localStorage.setItem(
      "prep_unlocked_apps",
      JSON.stringify(unlocked)
    );
  }

  /* =========================================
     LOAD USER
     ========================================= */

  async function loadUser() {
    if (!state.token) return;

    try {
      const data = await api("/api/me");

      state.user =
        data.user ||
        data;

      updateAccountUI();
    } catch {
      state.token = "";
      state.user = null;

      localStorage.removeItem("prep_token");

      updateAccountUI();
    }
  }

  function updateAccountUI() {
    const accountButton =
      $("#accountBtn");

    if (accountButton) {
      accountButton.textContent =
        state.user
          ? `Account (${state.user.username || "User"})`
          : "Account";
    }

    const accountName =
      $("#accountName");

    if (accountName) {
      accountName.textContent =
        state.user?.username ||
        "Guest";
    }

    const loginButton =
      $("#accountLoginBtn");

    if (loginButton) {
      loginButton.textContent =
        state.user
          ? "Logout"
          : "Login";
    }
  }

  /* =========================================
     LOAD APPS
     ========================================= */

  async function loadApps() {
    const container =
      $("#appsGrid") ||
      $(".apps-grid");

    if (container) {
      container.innerHTML = `
        <div class="loading">
          Loading apps...
        </div>
      `;
    }

    try {
      const data = await api("/api/apps");

      apps = Array.isArray(data)
        ? data
        : Array.isArray(data.apps)
        ? data.apps
        : [];

      renderApps();
    } catch (error) {
      if (container) {
        container.innerHTML = `
          <div class="empty-state">
            <strong>Apps load nahi ho paaye</strong>
            <span>${escapeHtml(
              error.message
            )}</span>
          </div>
        `;
      }
    }
  }

  function renderApps() {
    const container =
      $("#appsGrid") ||
      $(".apps-grid");

    if (!container) return;

    const searchInput =
      $("#searchInput") ||
      $("#appSearch");

    const search =
      searchInput?.value
        ?.trim()
        .toLowerCase() || "";

    let list = apps;

    if (currentTab === "myapps") {
      list = apps.filter((app) =>
        isUnlocked(app.id)
      );
    }

    if (search) {
      list = list.filter((app) => {
        const text = [
          app.name,
          app.description,
          app.category
        ]
          .join(" ")
          .toLowerCase();

        return text.includes(search);
      });
    }

    if (!list.length) {
      container.innerHTML = `
        <div class="empty-state">
          <strong>
            ${
              currentTab === "myapps"
                ? "No unlocked apps"
                : "No apps found"
            }
          </strong>

          <span>
            ${
              currentTab === "myapps"
                ? "Key verify karne ke baad app yahan dikhegi."
                : "Search change karke dekho."
            }
          </span>
        </div>
      `;

      return;
    }

    container.innerHTML = list
      .map((app) => {
        const unlocked =
          isUnlocked(app.id);

        const logo =
          app.logo_url ||
          "/assets/logo.png";

        return `
          <article
            class="app-card"
            data-app-id="${escapeHtml(app.id)}"
          >
            <img
              class="app-logo"
              src="${escapeHtml(logo)}"
              alt=""
              onerror="this.src='/assets/logo.png'"
            >

            <h3 class="app-name">
              ${escapeHtml(app.name)}
            </h3>

            <p class="app-description">
              ${escapeHtml(
                app.description ||
                "Open this app"
              )}
            </p>

            ${
              app.category
                ? `
                  <span class="app-category">
                    ${escapeHtml(
                      app.category
                    )}
                  </span>
                `
                : ""
            }

            ${
              unlocked
                ? `
                  <div style="
                    margin-top:10px;
                    color:#16a34a;
                    font-size:11px;
                    font-weight:800;
                  ">
                    ✓ Unlocked
                  </div>
                `
                : ""
            }
          </article>
        `;
      })
      .join("");

    container
      .querySelectorAll("[data-app-id]")
      .forEach((card) => {
        card.addEventListener(
          "click",
          () => {
            openApp(card.dataset.appId);
          }
        );
      });
  }

  /* =========================================
     OPEN APP
     ========================================= */

  function openApp(appId) {
  if (!appId) return;

  window.location.href =
    `/app?appId=${encodeURIComponent(appId)}`;
  }

  /* =========================================
     KEY MODAL
     ========================================= */

  function getModal() {
    let modal =
      $("#keyModal");

    if (modal) return modal;

    modal = document.createElement("div");

    modal.id = "keyModal";
    modal.className = "modal-overlay";

    modal.innerHTML = `
      <div class="modal">
        <div class="modal-head">
          <h3>Enter App Key</h3>

          <button
            type="button"
            class="modal-close"
            id="closeKeyModal"
          >
            ×
          </button>
        </div>

        <div class="form-group">
          <label>Premium Key</label>

          <input
            id="appKeyInput"
            type="text"
            placeholder="Enter your key"
            autocomplete="off"
          >
        </div>

        <button
          id="verifyKeyBtn"
          class="btn btn-primary btn-block"
        >
          Verify Key
        </button>
      </div>
    `;

    document.body.appendChild(modal);

    $("#closeKeyModal")?.addEventListener(
      "click",
      closeKeyModal
    );

    modal.addEventListener(
      "click",
      (event) => {
        if (
          event.target === modal
        ) {
          closeKeyModal();
        }
      }
    );

    $("#verifyKeyBtn")?.addEventListener(
      "click",
      verifyKey
    );

    $("#appKeyInput")?.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Enter") {
          verifyKey();
        }
      }
    );

    return modal;
  }

  let selectedAppId = null;

  function openKeyModal(appId) {
    selectedAppId = appId;

    const modal = getModal();

    modal.classList.add("open");

    const input =
      $("#appKeyInput");

    if (input) {
      input.value = "";
      setTimeout(
        () => input.focus(),
        100
      );
    }
  }

  function closeKeyModal() {
    const modal =
      $("#keyModal");

    if (modal) {
      modal.classList.remove("open");
    }

    selectedAppId = null;
  }

  async function verifyKey() {
    const input =
      $("#appKeyInput");

    const button =
      $("#verifyKeyBtn");

    const key =
      input?.value.trim() || "";

    if (!selectedAppId) {
      showMessage(
        "App select nahi hai.",
        "error"
      );
      return;
    }

    if (!key) {
      showMessage(
        "Key enter karo.",
        "error"
      );
      input?.focus();
      return;
    }

    try {
      if (button) {
        button.disabled = true;
        button.textContent =
          "Checking...";
      }

      const data = await api(
        "/api/keys/verify",
        {
          method: "POST",
          body: {
            app_id: selectedAppId,
            key
          }
        }
      );

      if (
        data.success === false ||
        data.valid === false
      ) {
        throw new Error(
          data.error ||
          "Invalid key"
        );
      }

      saveUnlocked(selectedAppId);

      const appId =
        selectedAppId;

      closeKeyModal();

      renderApps();

      showMessage(
        "App unlock ho gayi.",
        "success"
      );

      setTimeout(() => {
        window.location.href =
          `/app?appId=${encodeURIComponent(
            appId
          )}`;
      }, 400);
    } catch (error) {
      showMessage(
        error.message ||
          "Invalid key",
        "error"
      );
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent =
          "Verify Key";
      }
    }
  }

  /* =========================================
     ACCOUNT MODAL
     ========================================= */

  function getAccountModal() {
    let modal =
      $("#accountModal");

    if (modal) return modal;

    modal = document.createElement("div");

    modal.id = "accountModal";
    modal.className = "modal-overlay";

    modal.innerHTML = `
      <div class="modal">

        <div class="modal-head">
          <h3>Account</h3>

          <button
            class="modal-close"
            id="closeAccountModal"
          >
            ×
          </button>
        </div>

        <div id="accountContent"></div>

      </div>
    `;

    document.body.appendChild(modal);

    $("#closeAccountModal")
      ?.addEventListener(
        "click",
        closeAccountModal
      );

    modal.addEventListener(
      "click",
      (event) => {
        if (
          event.target === modal
        ) {
          closeAccountModal();
        }
      }
    );

    return modal;
  }

  function openAccountModal() {
    const modal =
      getAccountModal();

    const content =
      $("#accountContent");

    if (state.user) {
      content.innerHTML = `
        <div class="account-info">
          <strong>
            ${escapeHtml(
              state.user.username ||
                "User"
            )}
          </strong>

          <span>
            Account logged in
          </span>
        </div>

        <button
          id="logoutUserBtn"
          class="btn btn-danger btn-block"
        >
          Logout
        </button>
      `;

      $("#logoutUserBtn")
        ?.addEventListener(
          "click",
          logout
        );
    } else {
      content.innerHTML = `
        <div class="form-group">
          <label>Username</label>
          <input
            id="userUsername"
            type="text"
            placeholder="Username"
            autocomplete="username"
          >
        </div>

        <div class="form-group">
          <label>Password</label>
          <input
            id="userPassword"
            type="password"
            placeholder="Password"
            autocomplete="current-password"
          >
        </div>

        <div class="button-row">
          <button
            id="userLoginBtn"
            class="btn btn-primary"
            style="flex:1"
          >
            Login
          </button>

          <button
            id="userRegisterBtn"
            class="btn btn-secondary"
            style="flex:1"
          >
            Create Account
          </button>
        </div>
      `;

      $("#userLoginBtn")
        ?.addEventListener(
          "click",
          loginUser
        );

      $("#userRegisterBtn")
        ?.addEventListener(
          "click",
          registerUser
        );
    }

    modal.classList.add("open");
  }

  function closeAccountModal() {
    $("#accountModal")
      ?.classList.remove("open");
  }

  async function loginUser() {
    const username =
      $("#userUsername")
        ?.value.trim();

    const password =
      $("#userPassword")
        ?.value || "";

    if (!username || !password) {
      showMessage(
        "Username aur password enter karo.",
        "error"
      );
      return;
    }

    try {
      const data = await api(
        "/api/auth/login",
        {
          method: "POST",
          body: {
            username,
            password
          }
        }
      );

      if (!data.token) {
        throw new Error(
          "Login token nahi mila."
        );
      }

      state.token = data.token;

      localStorage.setItem(
        "prep_token",
        data.token
      );

      state.user =
        data.user || null;

      closeAccountModal();
      updateAccountUI();

      showMessage(
        "Login successful.",
        "success"
      );
    } catch (error) {
      showMessage(
        error.message,
        "error"
      );
    }
  }

  async function registerUser() {
    const username =
      $("#userUsername")
        ?.value.trim();

    const password =
      $("#userPassword")
        ?.value || "";

    if (!username || !password) {
      showMessage(
        "Username aur password enter karo.",
        "error"
      );
      return;
    }

    if (username.length < 3) {
      showMessage(
        "Username kam se kam 3 characters ka hona chahiye.",
        "error"
      );
      return;
    }

    if (password.length < 6) {
      showMessage(
        "Password kam se kam 6 characters ka hona chahiye.",
        "error"
      );
      return;
    }

    try {
      const data = await api(
        "/api/auth/register",
        {
          method: "POST",
          body: {
            username,
            password
          }
        }
      );

      if (data.token) {
        state.token =
          data.token;

        localStorage.setItem(
          "prep_token",
          data.token
        );

        state.user =
          data.user || null;

        closeAccountModal();
        updateAccountUI();

        showMessage(
          "Account create ho gaya.",
          "success"
        );

        return;
      }

      showMessage(
        "Account create ho gaya. Ab login karo.",
        "success"
      );
    } catch (error) {
      showMessage(
        error.message,
        "error"
      );
    }
  }

  function logout() {
    state.token = "";
    state.user = null;

    localStorage.removeItem(
      "prep_token"
    );

    closeAccountModal();
    updateAccountUI();

    showMessage(
      "Logout successful.",
      "success"
    );
  }

  /* =========================================
     NOTIFICATIONS
     ========================================= */

  async function openNotifications() {
    const modal =
      document.createElement("div");

    modal.className =
      "modal-overlay open";

    modal.innerHTML = `
      <div class="modal">

        <div class="modal-head">
          <h3>Notifications</h3>

          <button
            class="modal-close"
            id="closeNotifications"
          >
            ×
          </button>
        </div>

        <div id="notificationContent">
          <div class="loading">
            Loading...
          </div>
        </div>

      </div>
    `;

    document.body.appendChild(modal);

    modal
      .querySelector(
        "#closeNotifications"
      )
      .addEventListener(
        "click",
        () => modal.remove()
      );

    try {
      const data = await api(
        "/api/notifications"
      );

      const notifications =
        Array.isArray(data)
          ? data
          : Array.isArray(
              data.notifications
            )
          ? data.notifications
          : [];

      const content =
        modal.querySelector(
          "#notificationContent"
        );

      if (!notifications.length) {
        content.innerHTML = `
          <div class="empty-state">
            No notifications.
          </div>
        `;

        return;
      }

      content.innerHTML = `
        <div class="notification-list">
          ${notifications
            .map(
              (item) => `
                <div class="notification-item">
                  <strong>
                    ${escapeHtml(
                      item.title
                    )}
                  </strong>

                  <p>
                    ${escapeHtml(
                      item.message
                    )}
                  </p>
                </div>
              `
            )
            .join("")}
        </div>
      `;
    } catch (error) {
      modal.querySelector(
        "#notificationContent"
      ).innerHTML = `
        <div class="empty-state">
          ${escapeHtml(
            error.message
          )}
        </div>
      `;
    }
  }

  /* =========================================
     DRAWER
     ========================================= */

  function createDrawer() {
    if ($("#homeDrawer")) {
      return;
    }

    const overlay =
      document.createElement("div");

    overlay.id =
      "homeDrawerOverlay";

    overlay.className =
      "drawer-overlay";

    const drawer =
      document.createElement("aside");

    drawer.id =
      "homeDrawer";

    drawer.className =
      "drawer";

    drawer.innerHTML = `
      <div class="drawer-head">
        <strong>Prep Master</strong>

        <button
          class="drawer-close"
          id="closeDrawer"
        >
          ×
        </button>
      </div>

      <button
        class="drawer-item"
        data-drawer-action="apps"
      >
        Apps
      </button>

      <button
        class="drawer-item"
        data-drawer-action="myapps"
      >
        My Apps
      </button>

      <button
        class="drawer-item"
        data-drawer-action="telegram"
      >
        Join Telegram
      </button>

      <button
        class="drawer-item"
        data-drawer-action="account"
      >
        Account
      </button>
    `;

    document.body.appendChild(
      overlay
    );

    document.body.appendChild(
      drawer
    );

    $("#closeDrawer")
      ?.addEventListener(
        "click",
        closeDrawer
      );

    overlay.addEventListener(
      "click",
      closeDrawer
    );

    drawer
      .querySelectorAll(
        "[data-drawer-action]"
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            const action =
              button.dataset
                .drawerAction;

            closeDrawer();

            if (action === "apps") {
              setTab("apps");
            }

            if (action === "myapps") {
              setTab("myapps");
            }

            if (action === "telegram") {
              window.open(
                "https://t.me/prepmaster0",
                "_blank"
              );
            }

            if (action === "account") {
              openAccountModal();
            }
          }
        );
      });
  }

  function openDrawer() {
    createDrawer();

    $("#homeDrawer")
      ?.classList.add("open");

    $("#homeDrawerOverlay")
      ?.classList.add("open");
  }

  function closeDrawer() {
    $("#homeDrawer")
      ?.classList.remove("open");

    $("#homeDrawerOverlay")
      ?.classList.remove("open");
  }

  /* =========================================
     TABS
     ========================================= */

  function setTab(tab) {
    currentTab = tab;

    document
      .querySelectorAll(
        ".tab[data-tab]"
      )
      .forEach((button) => {
        button.classList.toggle(
          "active",
          button.dataset.tab === tab
        );
      });

    renderApps();
  }

  /* =========================================
     EVENTS
     ========================================= */

  function bindEvents() {
    createDrawer();

    const menuButton =
      $("#menuBtn") ||
      $("#menuButton") ||
      $(".menu-btn");

    menuButton?.addEventListener(
      "click",
      openDrawer
    );

    const notificationButton =
      $("#notificationBtn") ||
      $("#notificationsBtn");

    notificationButton?.addEventListener(
      "click",
      openNotifications
    );

    const accountButton =
      $("#accountBtn");

    accountButton?.addEventListener(
      "click",
      openAccountModal
    );

    const search =
      $("#searchInput") ||
      $("#appSearch");

    search?.addEventListener(
      "input",
      renderApps
    );

    document
      .querySelectorAll(
        ".tab[data-tab]"
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            setTab(
              button.dataset.tab
            );
          }
        );
      });
  }

  /* =========================================
     INIT
     ========================================= */

  async function init() {
    bindEvents();

    await loadUser();
    await loadApps();

    updateAccountUI();
  }

  document.addEventListener(
    "DOMContentLoaded",
    init
  );

  /* =========================================
     GLOBAL
     ========================================= */

  window.PrepMasterApp = {
    loadApps,
    renderApps,
    openApp,
    openAccountModal,
    closeAccountModal,
    openDrawer,
    closeDrawer,
    setTab,
    logout
  };
})();
