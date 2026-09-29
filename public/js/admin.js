/* =========================================================
   PREP MASTER — ADMIN PANEL JAVASCRIPT
   ========================================================= */

const API_BASE = "/api";

let adminToken = localStorage.getItem("pm_admin_token") || "";
let apps = [];
let editingAppId = null;


/* =========================================================
   HELPERS
   ========================================================= */

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => document.querySelectorAll(selector);


function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return map[char];
  });
}


function authHeaders(json = false) {
  const headers = {};

  if (json) {
    headers["Content-Type"] = "application/json";
  }

  if (adminToken) {
    headers["Authorization"] = `Bearer ${adminToken}`;
  }

  return headers;
}


async function api(url, options = {}) {
  const response = await fetch(API_BASE + url, {
    ...options,
    headers: {
      ...authHeaders(Boolean(options.body)),
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(message, type = "success") {
  let toast = document.getElementById("adminToast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "adminToast";

    toast.style.position = "fixed";
    toast.style.left = "50%";
    toast.style.bottom = "25px";
    toast.style.transform = "translateX(-50%)";
    toast.style.zIndex = "9999";
    toast.style.padding = "12px 18px";
    toast.style.borderRadius = "12px";
    toast.style.fontSize = "13px";
    toast.style.fontWeight = "700";
    toast.style.boxShadow = "0 10px 30px rgba(0,0,0,.18)";
    toast.style.transition = "opacity .2s ease";

    document.body.appendChild(toast);
  }

  toast.textContent = message;

  toast.style.background =
    type === "error" ? "#fee2e2" : "#dcfce7";

  toast.style.color =
    type === "error" ? "#b91c1c" : "#166534";

  toast.style.opacity = "1";

  clearTimeout(window.__adminToastTimer);

  window.__adminToastTimer = setTimeout(() => {
    toast.style.opacity = "0";
  }, 3000);
}


/* =========================================================
   LOGIN
   ========================================================= */

async function handleAdminLogin(event) {
  event.preventDefault();

  const username = $("#adminUsername")?.value.trim();
  const password = $("#adminPassword")?.value;

  if (!username || !password) {
    showToast("Username aur password enter karo.", "error");
    return;
  }

  const button = document.querySelector(
    "#adminLoginForm button[type='submit']"
  );

  const originalText = button?.textContent;

  if (button) {
    button.disabled = true;
    button.textContent = "Logging in...";
  }

  try {
    const data = await api("/admin/login", {
      method: "POST",
      body: JSON.stringify({
        username,
        password
      })
    });

    if (!data.token) {
      throw new Error("Login token nahi mila.");
    }

    adminToken = data.token;

    localStorage.setItem(
      "pm_admin_token",
      adminToken
    );

    showAdminDashboard();

    await loadEverything();

    showToast("Admin login successful.");

  } catch (error) {
    console.error("Admin login error:", error);

    showToast(
      error.message || "Login failed.",
      "error"
    );

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalText || "Login to Admin Panel";
    }
  }
}


/* =========================================================
   SHOW / HIDE DASHBOARD
   ========================================================= */

function showAdminDashboard() {
  const login = $("#adminLogin");
  const dashboard = $("#adminDashboard");

  if (login) {
    login.style.display = "none";
  }

  if (dashboard) {
    dashboard.style.display = "flex";
  }
}


function showLoginScreen() {
  const login = $("#adminLogin");
  const dashboard = $("#adminDashboard");

  if (login) {
    login.style.display = "flex";
  }

  if (dashboard) {
    dashboard.style.display = "none";
  }
}


/* =========================================================
   LOAD EVERYTHING
   ========================================================= */

async function loadEverything() {
  try {
    await Promise.all([
      loadApps(),
      loadKeys(),
      loadNotifications()
    ]);

  } catch (error) {
    console.error("Load error:", error);

    if (
      error.message.includes("401") ||
      error.message.toLowerCase().includes("unauthorized") ||
      error.message.toLowerCase().includes("token")
    ) {
      logoutAdmin(false);
      return;
    }

    showToast(
      error.message || "Data load nahi ho paya.",
      "error"
    );
  }
}


/* =========================================================
   APPS
   ========================================================= */

async function loadApps() {
  const data = await api("/apps/all");

  apps = Array.isArray(data)
    ? data
    : data.apps || [];

  updateDashboardStats();

  renderApps();

  populateKeyAppSelect();
}


function updateDashboardStats() {
  const totalApps = document.getElementById("totalApps");
  const activeApps = document.getElementById("activeApps");

  if (totalApps) {
    totalApps.textContent = apps.length;
  }

  if (activeApps) {
    activeApps.textContent =
      apps.filter((app) => app.active).length;
  }
}


function renderApps() {
  const container = $("#appsList");

  if (!container) return;

  const search =
    ($("#appSearch")?.value || "")
      .trim()
      .toLowerCase();

  const filteredApps = apps.filter((app) => {
    const text = [
      app.name,
      app.category,
      app.description
    ]
      .join(" ")
      .toLowerCase();

    return text.includes(search);
  });

  if (!filteredApps.length) {
    container.innerHTML = `
      <div class="loading-state">
        No apps found.
      </div>
    `;

    return;
  }

  container.innerHTML = filteredApps.map((app) => {
    const logo =
      app.logoUrl ||
      app.logo_url ||
      "/assets/logo.png";

    const active =
      app.active !== false;

    return `
      <div class="content-card admin-app-card">

        <div style="
          display:flex;
          align-items:center;
          gap:14px;
        ">

          <img
            src="${escapeHtml(logo)}"
            alt="${escapeHtml(app.name)}"
            style="
              width:58px;
              height:58px;
              border-radius:14px;
              object-fit:contain;
              background:#f1f5f9;
              padding:6px;
            "
            onerror="this.src='/assets/logo.png'"
          >

          <div style="flex:1;min-width:0;">

            <h3 style="
              margin:0 0 4px;
              font-size:17px;
            ">
              ${escapeHtml(app.name)}
            </h3>

            <div style="
              font-size:12px;
              color:#64748b;
            ">
              ${escapeHtml(app.category || "Education")}
              ·
              ${active ? "Active" : "Hidden"}
            </div>

          </div>

        </div>


        <p style="
          margin:14px 0;
          color:#64748b;
          font-size:13px;
        ">
          ${escapeHtml(
            app.description || "No description."
          )}
        </p>


        <div style="
          display:flex;
          gap:8px;
          flex-wrap:wrap;
        ">

          <button
            type="button"
            class="secondary-btn"
            onclick="editApp('${app.id}')"
          >
            Edit
          </button>

          <button
            type="button"
            class="secondary-btn"
            onclick="deleteApp('${app.id}')"
            style="
              color:#b91c1c;
              border-color:#fecaca;
            "
          >
            Delete
          </button>

        </div>

      </div>
    `;
  }).join("");
}


function populateKeyAppSelect() {
  const select = $("#keyAppId");

  if (!select) return;

  select.innerHTML = `
    <option value="">
      Select App
    </option>
  `;

  apps.forEach((app) => {
    const option = document.createElement("option");

    option.value = app.id;
    option.textContent = app.name;

    select.appendChild(option);
  });
}


/* =========================================================
   APP MODAL
   ========================================================= */

function openAppModal(app = null) {
  const modal = $("#appModal");

  if (!modal) return;

  editingAppId = app?.id || null;

  $("#appModalTitle").textContent =
    app ? "Edit App" : "Add New App";

  $("#appId").value = app?.id || "";

  $("#appName").value =
    app?.name || "";

  $("#appCategory").value =
    app?.category || "Education";

  $("#appLogo").value =
    app?.logoUrl ||
    app?.logo_url ||
    "";

  $("#appDescription").value =
    app?.description || "";

  $("#appHomeUrl").value =
    app?.homeUrl ||
    app?.home_url ||
    "";

  $("#appPurchaseVideo").value =
    app?.purchaseVideoUrl ||
    app?.purchase_video_url ||
    "";

  $("#appActive").checked =
    app?.active !== false;

  modal.style.display = "flex";
}


function closeAppModal() {
  const modal = $("#appModal");

  if (modal) {
    modal.style.display = "none";
  }

  editingAppId = null;
}


window.editApp = function (id) {
  const app = apps.find(
    (item) => item.id === id
  );

  if (!app) return;

  openAppModal(app);
};


function clearAppForm() {
  editingAppId = null;

  $("#appId").value = "";
  $("#appName").value = "";
  $("#appCategory").value = "Education";
  $("#appLogo").value = "";
  $("#appDescription").value = "";
  $("#appHomeUrl").value = "";
  $("#appPurchaseVideo").value = "";
  $("#appActive").checked = true;

  $("#appModalTitle").textContent =
    "Add New App";
}


/* =========================================================
   SAVE APP
   ========================================================= */

async function saveApp(event) {
  event.preventDefault();

  const body = {
    name: $("#appName").value.trim(),

    logoUrl:
      $("#appLogo").value.trim(),

    description:
      $("#appDescription").value.trim(),

    homeUrl:
      $("#appHomeUrl").value.trim(),

    category:
      $("#appCategory").value.trim() ||
      "Education",

    purchaseVideoUrl:
      $("#appPurchaseVideo").value.trim(),

    active:
      $("#appActive").checked
  };

  if (!body.name) {
    showToast("App name enter karo.", "error");
    return;
  }

  if (!body.homeUrl) {
    showToast("App Home URL enter karo.", "error");
    return;
  }

  try {
    if (editingAppId) {
      await api(`/apps/${editingAppId}`, {
        method: "PUT",
        body: JSON.stringify(body)
      });

      showToast("App updated successfully.");

    } else {
      await api("/apps", {
        method: "POST",
        body: JSON.stringify(body)
      });

      showToast("New app added successfully.");
    }

    closeAppModal();

    await loadApps();

  } catch (error) {
    console.error(error);

    showToast(
      error.message || "App save nahi hua.",
      "error"
    );
  }
}


/* =========================================================
   DELETE APP
   ========================================================= */

window.deleteApp = async function (id) {
  const app = apps.find(
    (item) => item.id === id
  );

  const name =
    app?.name || "this app";

  const confirmed = confirm(
    `"${name}" ko delete karna hai?\n\nIske saath is app ki keys bhi delete ho sakti hain.`
  );

  if (!confirmed) return;

  try {
    await api(`/apps/${id}`, {
      method: "DELETE"
    });

    showToast("App deleted.");

    await loadApps();
    await loadKeys();

  } catch (error) {
    console.error(error);

    showToast(
      error.message || "App delete nahi hua.",
      "error"
    );
  }
};


/* =========================================================
   KEYS
   ========================================================= */

async function loadKeys() {
  const data = await api("/keys");

  const keys =
    Array.isArray(data)
      ? data
      : data.keys || [];

  const totalKeys = $("#totalKeys");

  if (totalKeys) {
    totalKeys.textContent =
      keys.length;
  }

  renderKeys(keys);
}


function renderKeys(keys) {
  const container = $("#keysList");

  if (!container) return;

  const search =
    ($("#keySearch")?.value || "")
      .trim()
      .toLowerCase();

  const filtered = keys.filter((key) => {
    const text = [
      key.key,
      key.appName,
      key.used_by,
      key.usedBy
    ]
      .join(" ")
      .toLowerCase();

    return text.includes(search);
  });

  if (!filtered.length) {
    container.innerHTML = `
      <div class="loading-state">
        No keys found.
      </div>
    `;

    return;
  }

  container.innerHTML = filtered.map((item) => {

    const used =
      Boolean(item.used_by || item.usedBy);

    return `
      <div style="
        padding:13px 0;
        border-bottom:1px solid #e5e7eb;
      ">

        <div style="
          display:flex;
          justify-content:space-between;
          gap:10px;
          align-items:center;
        ">

          <code style="
            font-size:12px;
            word-break:break-all;
          ">
            ${escapeHtml(item.key)}
          </code>

          <span style="
            font-size:11px;
            font-weight:700;
            color:${used ? "#b91c1c" : "#15803d"};
          ">
            ${used ? "USED" : "AVAILABLE"}
          </span>

        </div>

      </div>
    `;

  }).join("");
}


async function generateKeys(event) {
  event.preventDefault();

  const appId =
    $("#keyAppId").value;

  const count =
    Number($("#keyCount").value);

  if (!appId) {
    showToast("App select karo.", "error");
    return;
  }

  if (!count || count < 1) {
    showToast("Valid key count enter karo.", "error");
    return;
  }

  try {
    const data = await api(
      "/keys/generate",
      {
        method: "POST",
        body: JSON.stringify({
          appId,
          count
        })
      }
    );

    const generated =
      data.keys || [];

    $("#generatedKeys").value =
      generated.join("\n");

    $("#keysResultModal").style.display =
      "flex";

    await loadKeys();

    showToast(
      `${generated.length} keys generated.`
    );

  } catch (error) {
    console.error(error);

    showToast(
      error.message || "Keys generate nahi hui.",
      "error"
    );
  }
}


/* =========================================================
   COPY GENERATED KEYS
   ========================================================= */

async function copyGeneratedKeys() {
  const textarea =
    $("#generatedKeys");

  if (!textarea) return;

  try {
    await navigator.clipboard.writeText(
      textarea.value
    );

    showToast("All keys copied.");

  } catch (error) {
    textarea.select();
    document.execCommand("copy");

    showToast("All keys copied.");
  }
}


/* =========================================================
   NOTIFICATIONS
   ========================================================= */

async function loadNotifications() {
  const data =
    await api("/notifications");

  const notifications =
    Array.isArray(data)
      ? data
      : data.notifications || [];

  const total =
    $("#totalNotifications");

  if (total) {
    total.textContent =
      notifications.length;
  }

  renderNotifications(
    notifications
  );
}


function renderNotifications(
  notifications
) {
  const container =
    $("#notificationsList");

  if (!container) return;

  if (!notifications.length) {
    container.innerHTML = `
      <div class="loading-state">
        No notifications published yet.
      </div>
    `;

    return;
  }

  container.innerHTML =
    notifications.map((item) => `
      <div
        style="
          padding:15px 0;
          border-bottom:1px solid #e5e7eb;
        "
      >

        <div style="
          display:flex;
          justify-content:space-between;
          gap:12px;
        ">

          <div>

            <strong style="
              font-size:15px;
            ">
              ${escapeHtml(item.title)}
            </strong>

            <p style="
              margin:6px 0 0;
              color:#64748b;
              font-size:13px;
              white-space:pre-wrap;
            ">
              ${escapeHtml(item.message)}
            </p>

          </div>

          <button
            type="button"
            class="secondary-btn"
            onclick="deleteNotification('${item.id}')"
            style="
              color:#b91c1c;
              border-color:#fecaca;
              white-space:nowrap;
            "
          >
            Delete
          </button>

        </div>

      </div>
    `).join("");
}


async function publishNotification(event) {
  event.preventDefault();

  const title =
    $("#notificationTitle").value.trim();

  const message =
    $("#notificationMessage").value.trim();

  if (!title || !message) {
    showToast(
      "Title aur message dono enter karo.",
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

    $("#notificationTitle").value = "";
    $("#notificationMessage").value = "";

    await loadNotifications();

    showToast(
      "Notification published successfully."
    );

  } catch (error) {
    console.error(error);

    showToast(
      error.message ||
      "Notification publish nahi hua.",
      "error"
    );
  }
}


window.deleteNotification =
  async function (id) {

    if (
      !confirm(
        "Is notification ko delete karna hai?"
      )
    ) {
      return;
    }

    try {
      await api(
        `/notifications/${id}`,
        {
          method: "DELETE"
        }
      );

      await loadNotifications();

      showToast(
        "Notification deleted."
      );

    } catch (error) {
      console.error(error);

      showToast(
        error.message ||
        "Notification delete nahi hua.",
        "error"
      );
    }
  };


/* =========================================================
   SECTION NAVIGATION
   ========================================================= */

function openSection(sectionName) {
  $$("[data-admin-section]").forEach(
    (section) => {
      section.style.display =
        section.dataset.adminSection === sectionName
          ? "
