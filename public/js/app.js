/* =========================================================
   PREP MASTER — HOME PAGE
   ========================================================= */

const $ = (selector) =>
  document.querySelector(selector);


const state = {
  apps: [],
  view: "explore",
  selected: null,

  token:
    localStorage.getItem("pm_token") || "",

  unlocked:
    new Set(
      JSON.parse(
        localStorage.getItem("pm_unlocked") || "[]"
      )
    )
};


/* =========================================================
   CLIENT ID
   ========================================================= */

function clientId() {

  let id =
    localStorage.getItem(
      "pm_client_id"
    );

  if (!id) {

    id =
      crypto.randomUUID();

    localStorage.setItem(
      "pm_client_id",
      id
    );
  }

  return id;
}


/* =========================================================
   HEADERS
   ========================================================= */

function headers(json = false) {

  const h = {
    "X-Client-Id": clientId()
  };

  if (json) {
    h["Content-Type"] =
      "application/json";
  }

  if (state.token) {
    h.Authorization =
      `Bearer ${state.token}`;
  }

  return h;
}


/* =========================================================
   API
   ========================================================= */

async function api(url, options = {}) {

  const response =
    await fetch(url, {
      ...options,

      headers: {
        ...headers(
          Boolean(options.body)
        ),

        ...(options.headers || {})
      }
    });


  const data =
    await response
      .json()
      .catch(() => ({}));


  if (!response.ok) {

    throw new Error(
      data.error ||
      "Something went wrong"
    );
  }


  return data;
}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function esc(value) {

  return String(value ?? "")
    .replace(
      /[&<>"']/g,
      (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char])
    );
}


/* =========================================================
   LOAD APPS
   ========================================================= */

async function loadApps() {

  try {

    state.apps =
      await api("/api/apps");

    render();

  } catch (error) {

    console.error(error);

    $("#appsGrid").innerHTML = `
      <div class="empty">
        ${esc(error.message)}
      </div>
    `;
  }
}


/* =========================================================
   SAVE UNLOCKED
   ========================================================= */

function saveUnlocked() {

  localStorage.setItem(
    "pm_unlocked",
    JSON.stringify(
      [...state.unlocked]
    )
  );
}


function isUnlocked(id) {

  return state.unlocked.has(id);
}


/* =========================================================
   RENDER
   ========================================================= */

function render() {

  const search =
    ($("#search")?.value || "")
      .trim()
      .toLowerCase();


  let list =
    state.apps.filter(
      (app) => {

        const text = [
          app.name,
          app.description,
          app.category
        ]
          .join(" ")
          .toLowerCase();

        return text.includes(search);
      }
    );


  /* MY APPS */

  if (
    state.view === "myapps"
  ) {

    list =
      list.filter(
        (app) =>
          isUnlocked(app.id)
      );
  }


  /* TITLE */

  $("#viewTitle").textContent =
    state.view === "myapps"
      ? "My Apps"
      : "Apps";


  $("#appCount").textContent =
    `${list.length} ${
      list.length === 1
        ? "app"
        : "apps"
    }`;


  /* EMPTY */

  $("#empty").classList.toggle(
    "hidden",
    list.length !== 0
  );


  /* CARDS */

  $("#appsGrid").innerHTML =
    list
      .map(
        (app) => `

        <article
          class="card"
          data-id="${esc(app.id)}"
        >

          <img
            class="app-logo"
            src="${esc(
              app.logoUrl ||
              "/assets/logo.png"
            )}"
            onerror="
              this.src='/assets/logo.png'
            "
            alt=""
          >


          <div>

            <h3>
              ${esc(app.name)}
            </h3>

            <p>
              ${esc(
                app.description ||
                "Learning app"
              )}
            </p>

          </div>

        </article>

      `
      )
      .join("");


  /* CLICK */

  document
    .querySelectorAll(".card")
    .forEach(
      (card) => {

        card.onclick = () =>
          openApp(
            card.dataset.id
          );

      }
    );
}


/* =========================================================
   OPEN APP
   ========================================================= */

function openApp(id) {

  const app =
    state.apps.find(
      (item) =>
        item.id === id
    );


  if (!app) return;


  /*
    Agar app pehle unlock hai
    to direct home URL open hoga.
  */

  if (
    isUnlocked(id)
  ) {

    if (app.homeUrl) {

      window.location.href =
        app.homeUrl;

    } else {

      alert(
        "Admin has not added an App URL yet."
      );
    }

    return;
  }


  state.selected = app;


  $("#detailName")
    .textContent =
    app.name;


  $("#detailDesc")
    .textContent =
    app.description || "";


  $("#detailLogo").src =
    app.logoUrl ||
    "/assets/logo.png";


  $("#keyInput").value =
    "";


  $("#keyStatus")
    .textContent =
    "";


  $("#verifyBtn")
    .textContent =
    "Verify App Key";


  const video =
    app.purchaseVideoUrl;


  if (video) {

    $("#purchaseVideo")
      .href = video;

    $("#purchaseVideo")
      .classList.remove(
        "hidden"
      );

  } else {

    $("#purchaseVideo")
      .classList.add(
        "hidden"
      );
  }


  $("#appModal")
    .classList.add("show");
}


/* =========================================================
   VERIFY APP KEY
   ========================================================= */

async function verify() {

  if (!state.selected)
    return;


  const key =
    $("#keyInput")
      .value
      .trim();


  if (!key) {

    $("#keyStatus")
      .textContent =
      "Please enter your app key.";

    return;
  }


  const button =
    $("#verifyBtn");


  button.disabled = true;

  button.textContent =
    "Checking...";


  $("#keyStatus")
    .textContent =
    "Checking your key...";


  try {

    await api(
      "/api/keys/verify",
      {
        method: "POST",

        body:
          JSON.stringify({
            appId:
              state.selected.id,

            key
          })
      }
    );


    /* SAVE UNLOCK */

    state.unlocked.add(
      state.selected.id
    );

    saveUnlocked();


    $("#keyStatus")
      .textContent =
      "Access unlocked successfully.";


    button.textContent =
      "Unlocked";


    const url =
      state.selected.homeUrl;


    setTimeout(
      () => {

        $("#appModal")
          .classList.remove(
            "show"
          );


        if (url) {

          window.location.href =
            url;

        } else {

          render();
        }

      },
      500
    );


  } catch (error) {

    console.error(error);

    $("#keyStatus")
      .textContent =
      error.message;

    button.textContent =
      "Verify App Key";


  } finally {

    button.disabled =
      false;
  }
}


/* =========================================================
   SET VIEW
   ========================================================= */

function setView(view) {

  state.view =
    view;


  /*
    Menu close
  */

  $("#drawer")
    .classList.remove(
      "open"
    );

  $("#shade")
    .classList.remove(
      "open"
    );


  render();
}


/* =========================================================
   ACCOUNT
   ========================================================= */

async function account() {

  $("#accountModal")
    .classList.add(
      "show"
    );


  if (!state.token) {

    showLoggedOut();

    return;
  }


  try {

    const user =
      await api(
        "/api/me"
      );


    state.unlocked =
      new Set(
        user.unlockedApps ||
        []
      );


    saveUnlocked();

    showAccount(user);

    render();


  } catch (error) {

    console.error(error);

    state.token = "";

    localStorage.removeItem(
      "pm_token"
    );

    showLoggedOut();
  }
}


function showAccount(user) {

  $("#accountLoggedOut")
    .classList.add(
      "hidden"
    );


  $("#accountLoggedIn")
    .classList.remove(
      "hidden"
    );


  $("#accountInfo")
    .textContent =
    `Logged in as ${user.username}`;


  $("#accountStatus")
    .textContent = "";
}


function showLoggedOut() {

  $("#accountLoggedOut")
    .classList.remove(
      "hidden"
    );


  $("#accountLoggedIn")
    .classList.add(
      "hidden"
    );


  $("#accountStatus")
    .textContent = "";
}


/* =========================================================
   LOGIN / REGISTER
   ========================================================= */

async function login(
  register = false
) {

  const username =
    $("#username")
      .value
      .trim();


  const password =
    $("#password")
      .value;


  if (!username || !password) {

    $("#accountStatus")
      .textContent =
      "Username aur password enter karo.";

    return;
  }


  const button =
    register
      ? $("#registerBtn")
      : $("#loginBtn");


  button.disabled = true;


  $("#accountStatus")
    .textContent =
    register
      ? "Creating account..."
      : "Logging in...";


  try {

    const data =
      await api(
        register
          ? "/api/auth/register"
          : "/api/auth/login",

        {
          method: "POST",

          body:
            JSON.stringify({
              username,
              password
            })
        }
      );


    state.token =
      data.token;


    localStorage.setItem(
      "pm_token",
      state.token
    );


    state.unlocked =
      new Set(
        data.user?.unlockedApps ||
        []
      );


    saveUnlocked();


    showAccount(
      data.user
    );


    render();


  } catch (error) {

    console.error(error);

    $("#accountStatus")
      .textContent =
      error.message;


  } finally {

    button.disabled =
      false;
  }
}


/* =========================================================
   LOGOUT
   ========================================================= */

function logout() {

  state.token = "";

  state.unlocked =
    new Set();


  localStorage.removeItem(
    "pm_token"
  );


  localStorage.removeItem(
    "pm_unlocked"
  );


  showLoggedOut();

  render();
}


/* =========================================================
   CLOSE MODALS
   ========================================================= */

function closeModal(id) {

  const modal =
    document.getElementById(id);

  if (modal) {

    modal.classList.remove(
      "show"
    );
  }
}


/* =========================================================
   EVENTS
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    /* SEARCH */

    $("#search")
      .addEventListener(
        "input",
        render
      );


    /* VERIFY */

    $("#verifyBtn")
      .addEventListener(
        "click",
        verify
      );


    /* THREE DOT MENU */

    $("#menuBtn")
      .addEventListener(
        "click",
        () => {

          $("#drawer")
            .classList.add(
              "open"
            );

          $("#shade")
            .classList.add(
              "open"
            );
        }
      );


    /* CLOSE MENU */

    $("#closeMenu")
      .addEventListener(
        "click",
        () => {

          $("#drawer")
            .classList.remove(
              "open"
            );

          $("#shade")
            .classList.remove(
              "open"
            );
        }
      );


    $("#shade")
      .addEventListener(
        "click",
        () => {

          $("#drawer")
            .classList.remove(
              "open"
            );

          $("#shade")
            .classList.remove(
              "open"
            );
        }
      );


    /* MENU OPTIONS */

    document
      .querySelectorAll(
        "[data-view]"
      )
      .forEach(
        (item) => {

          item.addEventListener(
            "click",
            () => {

              setView(
                item.dataset.view
              );

            }
          );

        }
      );


    /* ACCOUNT */

    $("#accountBtn")
      .addEventListener(
        "click",
        account
      );


    /* LOGIN */

    $("#loginBtn")
      .addEventListener(
        "click",
        () =>
          login(false)
      );


    /* REGISTER */

    $("#registerBtn")
      .addEventListener(
        "click",
        () =>
          login(true)
      );


    /* LOGOUT */

    $("#logoutBtn")
      .addEventListener(
        "click",
        logout
      );


    /* CLOSE BUTTONS */

    document
      .querySelectorAll(
        "[data-close]"
      )
      .forEach(
        (button) => {

          button.addEventListener(
            "click",
            () => {

              closeModal(
                button.dataset.close
              );

            }
          );

        }
      );


    /* CLOSE MODAL WHEN CLICKING OUTSIDE */

    document
      .querySelectorAll(
        ".modal"
      )
      .forEach(
        (modal) => {

          modal.addEventListener(
            "click",
            (event) => {

              if (
                event.target ===
                modal
              ) {

                modal.classList.remove(
                  "show"
                );
              }

            }
          );

        }
      );


    /* LOAD */

    loadApps();

  }
);
