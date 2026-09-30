(() => {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const appId = params.get("appId");

  const root = document.getElementById("app");

  const state = {
    app: null,
    user: null,
    section: "batches",
    batches: [],
    myBatches: [],
    community: [],
    aiHistory: [],
    selectedImage: null,
    selectedCommunityImage: null,
    batchSearch: "",
    loading: false
  };

  const $ = (selector, parent = document) =>
    parent.querySelector(selector);

  const escapeHTML = (value = "") =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const getJSON = async (url, options = {}) => {
    const response = await fetch(url, {
      credentials: "include",
      ...options
    });

    let data = {};
    try {
      data = await response.json();
    } catch (_) {}

    if (!response.ok) {
      throw new Error(data.error || data.message || "Something went wrong");
    }

    return data;
  };

  const formatDate = (date) => {
    if (!date) return "";

    try {
      return new Date(date).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (_) {
      return "";
    }
  };

  const getStorageKey = () =>
    `prep_master_my_batches_${state.app?.id || appId}`;

  const getSavedBatches = () => {
    try {
      return JSON.parse(localStorage.getItem(getStorageKey()) || "[]");
    } catch (_) {
      return [];
    }
  };

  const saveBatch = (batch) => {
    const current = getSavedBatches();

    const id = String(batch.id || batch.batchId || batch._id || batch.courseId);

    if (!id) return;

    const exists = current.some(
      (item) =>
        String(item.id || item.batchId || item._id || item.courseId) === id
    );

    if (!exists) {
      current.push({
        ...batch,
        id
      });

      localStorage.setItem(getStorageKey(), JSON.stringify(current));
    }

    state.myBatches = current;
  };

  const openBatch = (batch) => {
    if (!state.app?.batch_open_url) {
      showToast("Batch open URL is not configured.");
      return;
    }

    const batchId =
      batch.id ??
      batch.batchId ??
      batch._id ??
      batch.courseId ??
      batch.slug;

    if (!batchId) {
      showToast("Batch ID not found.");
      return;
    }

    let url = state.app.batch_open_url;

    url = url.replace(
      /\{batchId\}/gi,
      encodeURIComponent(String(batchId))
    );

    window.open(url, "_blank", "noopener,noreferrer");
  };

  function showToast(message) {
    let toast = document.getElementById("pm-toast");

    if (!toast) {
      toast = document.createElement("div");
      toast.id = "pm-toast";
      toast.className = "pm-toast";
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toast._timer);

    toast._timer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2500);
  }

  function applyTheme() {
    const theme = state.app?.app_theme || "dark";

    document.documentElement.dataset.theme = theme;
    document.body.dataset.theme = theme;

    document.body.classList.remove("theme-light", "theme-dark");
    document.body.classList.add(
      theme === "light" ? "theme-light" : "theme-dark"
    );
  }

  function applySectionTheme(section) {
    document.body.dataset.activeTheme = section;

    const theme =
      section === "ai"
        ? state.app?.ai_theme || "dark"
        : section === "community"
        ? state.app?.community_theme || "dark"
        : state.app?.app_theme || "dark";

    document.documentElement.dataset.sectionTheme = theme;
  }

  async function loadApp() {
    if (!appId) {
      root.innerHTML = `
        <div class="error-screen">
          <h2>App not found</h2>
          <p>App ID is missing.</p>
          <button onclick="location.href='/'">Go Home</button>
        </div>
      `;
      return;
    }

    try {
      const data = await getJSON(`/api/apps/${encodeURIComponent(appId)}`);

      state.app = data.app || data;

      state.myBatches = getSavedBatches();

      applyTheme();

      renderShell();

      await loadCurrentUser();

      if (state.section === "batches") {
        await loadBatches();
      }
    } catch (error) {
      console.error(error);

      root.innerHTML = `
        <div class="error-screen">
          <h2>Unable to load app</h2>
          <p>${escapeHTML(error.message)}</p>
          <button onclick="location.href='/'">Go Home</button>
        </div>
      `;
    }
  }

  async function loadCurrentUser() {
    try {
      const data = await getJSON("/api/me");
      state.user = data.user || data || null;
    } catch (_) {
      state.user = null;
    }

    updateAccountUI();
  }

  function renderShell() {
    const appName = state.app?.name || "Prep Master";

    root.innerHTML = `
      <div class="learning-app">

        <header class="learning-header">

          <div class="header-left">
            <button
              class="icon-btn menu-btn"
              id="menuBtn"
              aria-label="Menu"
            >
              ☰
            </button>

            <div class="brand">
              ${
                state.app?.header_enabled && state.app?.header_logo_url
                  ? `
                    <img
                      src="${escapeHTML(state.app.header_logo_url)}"
                      alt=""
                      class="brand-logo"
                      style="--header-size:${Number(
                        state.app.header_size || 100
                      )}%"
                    >
                  `
                  : `
                    <div class="brand-logo brand-placeholder">
                      ${escapeHTML(appName.charAt(0).toUpperCase())}
                    </div>
                  `
              }

              <div class="brand-text">
                <strong>
                  ${
                    state.app?.header_enabled &&
                    state.app?.header_name
                      ? escapeHTML(state.app.header_name)
                      : escapeHTML(appName)
                  }
                </strong>

                ${
                  state.app?.header_enabled && state.app?.header_badge
                    ? `
                      <span class="brand-badge">
                        ${escapeHTML(state.app.header_badge)}
                      </span>
                    `
                    : ""
                }
              </div>
            </div>
          </div>

          <div class="header-right">
            <button
              class="icon-btn"
              id="refreshBtn"
              aria-label="Refresh"
            >
              ↻
            </button>

            <button
              class="avatar-btn"
              id="accountBtn"
              aria-label="Account"
            >
              <span id="avatarText">A</span>
            </button>
          </div>

        </header>

        <main class="learning-main">

          <section id="sectionContent"></section>

        </main>

        <nav class="bottom-nav">

          <button class="nav-item" data-section="community">
            <span class="nav-icon">👥</span>
            <span>Community</span>
          </button>

          <button class="nav-item" data-section="my-batches">
            <span class="nav-icon">📚</span>
            <span>My Batches</span>
          </button>

          <button class="nav-item active" data-section="batches">
            <span class="nav-icon">▦</span>
            <span>Batches</span>
          </button>

          <button class="nav-item" data-section="ai">
            <span class="nav-icon">✦</span>
            <span>AI Doubts</span>
          </button>

        </nav>

        <aside class="side-menu" id="sideMenu">

          <div class="side-menu-overlay" id="sideMenuOverlay"></div>

          <div class="side-menu-panel">

            <div class="side-menu-head">

              <div>
                <strong>${escapeHTML(appName)}</strong>
                <small>Prep Master</small>
              </div>

              <button class="icon-btn" id="closeMenuBtn">
                ×
              </button>

            </div>

            <div class="side-menu-links">

              <button data-section="batches">
                <span>▦</span>
                Batches
              </button>

              <button data-section="my-batches">
                <span>📚</span>
                My Batches
              </button>

              <button data-section="community">
                <span>👥</span>
                Community
              </button>

              <button data-section="ai">
                <span>✦</span>
                AI Doubts
              </button>

              <button id="telegramBtn">
                <span>✈</span>
                Join Telegram
              </button>

              <button id="menuAccountBtn">
                <span>👤</span>
                Account
              </button>

            </div>

            <div class="side-menu-footer">
              Prep Master
            </div>

          </div>

        </aside>

        <div id="modalContainer"></div>

      </div>
    `;

    bindShellEvents();
    setSection("batches");
  }

  function bindShellEvents() {
    $("#menuBtn")?.addEventListener("click", openMenu);
    $("#closeMenuBtn")?.addEventListener("click", closeMenu);
    $("#sideMenuOverlay")?.addEventListener("click", closeMenu);

    $("#refreshBtn")?.addEventListener("click", refreshCurrentSection);

    $("#accountBtn")?.addEventListener("click", openAccount);
    $("#menuAccountBtn")?.addEventListener("click", () => {
      closeMenu();
      openAccount();
    });

    $("#telegramBtn")?.addEventListener("click", () => {
      window.open(
        "https://t.me/prepmaster0",
        "_blank",
        "noopener,noreferrer"
      );
    });

    document.querySelectorAll(".nav-item").forEach((button) => {
      button.addEventListener("click", () => {
        setSection(button.dataset.section);
      });
    });

    document
      .querySelectorAll(".side-menu-links [data-section]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          closeMenu();
          setSection(button.dataset.section);
        });
      });
  }

  function openMenu() {
    $("#sideMenu")?.classList.add("open");
    document.body.classList.add("menu-open");
  }

  function closeMenu() {
    $("#sideMenu")?.classList.remove("open");
    document.body.classList.remove("menu-open");
  }

  async function setSection(section) {
    state.section = section;

    document.querySelectorAll(".nav-item").forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.section === section
      );
    });

    applySectionTheme(section);

    if (section === "batches") {
      await loadBatches();
      return;
    }

    if (section === "my-batches") {
      renderMyBatches();
      return;
    }

    if (section === "community") {
      await loadCommunity();
      return;
    }

    if (section === "ai") {
      await loadAI();
      return;
    }
  }

  async function refreshCurrentSection() {
    if (state.section === "batches") {
      await loadBatches(true);
    } else if (state.section === "community") {
      await loadCommunity(true);
    } else if (state.section === "ai") {
      await loadAI(true);
    } else {
      state.myBatches = getSavedBatches();
      renderMyBatches();
    }

    showToast("Refreshed");
  }

  async function loadBatches(showLoading = false) {
    const content = $("#sectionContent");
    if (!content) return;

    if (showLoading || !state.batches.length) {
      content.innerHTML = `
        <div class="section-head">
          <div>
            <span class="eyebrow">LEARN</span>
            <h1>${escapeHTML(state.app?.name || "Batches")}</h1>
            <p>Choose a batch and start learning.</p>
          </div>
        </div>

        <div class="batch-toolbar">
          <input
            id="batchSearch"
            class="search-input"
            type="search"
            placeholder="Search batches..."
            autocomplete="off"
          />
        </div>

        <div id="batchList" class="batch-grid">
          <div class="loading-card">Loading batches...</div>
        </div>
      `;

      bindBatchSearch();
    }

    try {
      const data = await getJSON(
        `/api/batches?appId=${encodeURIComponent(appId)}`
      );

      const list =
        Array.isArray(data)
          ? data
          : data.batches ||
            data.data ||
            data.results ||
            [];

      state.batches = Array.isArray(list) ? list : [];

      renderBatchList();
    } catch (error) {
      console.error(error);

      const list = $("#batchList");

      if (list) {
        list.innerHTML = `
          <div class="empty-card">
            <div class="empty-icon">!</div>
            <h3>Unable to load batches</h3>
            <p>${escapeHTML(error.message)}</p>
            <button class="primary-btn" id="retryBatches">
              Try Again
            </button>
          </div>
        `;

        $("#retryBatches")?.addEventListener(
          "click",
          () => loadBatches(true)
        );
      }
    }
  }

  function bindBatchSearch() {
    const input = $("#batchSearch");

    if (!input) return;

    input.value = state.batchSearch;

    input.addEventListener("input", () => {
      state.batchSearch = input.value.trim().toLowerCase();
      renderBatchList();
    });
  }

  function getBatchTitle(batch) {
    return (
      batch.title ||
      batch.name ||
      batch.batchName ||
      batch.courseName ||
      batch.course_name ||
      "Untitled Batch"
    );
  }

  function getBatchDescription(batch) {
    return (
      batch.description ||
      batch.desc ||
      batch.subtitle ||
      batch.shortDescription ||
      ""
    );
  }

  function getBatchImage(batch) {
    return (
      batch.image ||
      batch.imageUrl ||
      batch.image_url ||
      batch.thumbnail ||
      batch.logo ||
      batch.banner ||
      ""
    );
  }

  function getBatchPrice(batch) {
    return (
      batch.price ??
      batch.amount ??
      batch.fee ??
      batch.cost ??
      ""
    );
  }

  function renderBatchList() {
    const list = $("#batchList");
    if (!list) return;

    let batches = [...state.batches];

    if (state.batchSearch) {
      batches = batches.filter((batch) => {
        const text = [
          getBatchTitle(batch),
          getBatchDescription(batch),
          batch.category,
          batch.subject,
          batch.teacher
        ]
          .join(" ")
          .toLowerCase();

        return text.includes(state.batchSearch);
      });
    }

    if (!batches.length) {
      list.innerHTML = `
        <div class="empty-card">
          <div class="empty-icon">⌕</div>
          <h3>No batches found</h3>
          <p>Try a different search.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = batches
      .map((batch, index) => {
        const title = getBatchTitle(batch);
        const description = getBatchDescription(batch);
        const image = getBatchImage(batch);
        const price = getBatchPrice(batch);

        const batchId =
          batch.id ??
          batch.batchId ??
          batch._id ??
          batch.courseId ??
          batch.slug ??
          index;

        const saved = state.myBatches.some(
          (item) =>
            String(
              item.id ??
                item.batchId ??
                item._id ??
                item.courseId ??
                item.slug
            ) === String(batchId)
        );

        return `
          <article
            class="batch-card"
            data-batch-index="${index}"
          >

            <div class="batch-image-wrap">

              ${
                image
                  ? `
                    <img
                      class="batch-image"
                      src="${escapeHTML(image)}"
                      alt=""
                      loading="lazy"
                    />
                  `
                  : `
                    <div class="batch-image-placeholder">
                      <span>${escapeHTML(
                        title.charAt(0).toUpperCase()
                      )}</span>
                    </div>
                  `
              }

              ${
                saved
                  ? `<span class="saved-badge">Saved</span>`
                  : ""
              }

            </div>

            <div class="batch-content">

              <h3>${escapeHTML(title)}</h3>

              ${
                description
                  ? `
                    <p>${escapeHTML(
                      String(description).slice(0, 150)
                    )}</p>
                  `
                  : ""
              }

              <div class="batch-meta">

                ${
                  price !== ""
                    ? `
                      <span class="batch-price">
                        ₹${escapeHTML(price)}
                      </span>
                    `
                    : `<span>Batch</span>`
                }

                ${
                  batch.category
                    ? `
                      <span>
                        ${escapeHTML(batch.category)}
                      </span>
                    `
                    : ""
                }

              </div>

              <div class="batch-actions">

                <button
                  class="secondary-btn save-batch-btn"
                  data-index="${index}"
                >
                  ${saved ? "Saved" : "My Batches"}
                </button>

                <button
                  class="primary-btn study-batch-btn"
                  data-index="${index}"
                >
                  Study
                </button>

              </div>

            </div>

          </article>
        `;
      })
      .join("");

    list.querySelectorAll(".study-batch-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const batch = batches[Number(button.dataset.index)];
        if (batch) openBatch(batch);
      });
    });

    list.querySelectorAll(".save-batch-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const batch = batches[Number(button.dataset.index)];

        if (!batch) return;

        saveBatch(batch);
        renderBatchList();

        showToast("Added to My Batches");
      });
    });
  }

  function renderMyBatches() {
    const content = $("#sectionContent");
    if (!content) return;

    state.myBatches = getSavedBatches();

    content.innerHTML = `
      <div class="section-head">
        <div>
          <span class="eyebrow">SAVED</span>
          <h1>My Batches</h1>
          <p>Your saved batches are available here.</p>
        </div>
      </div>

      <div id="myBatchList" class="batch-grid"></div>
    `;

    const list = $("#myBatchList");

    if (!state.myBatches.length) {
      list.innerHTML = `
        <div class="empty-card">
          <div class="empty-icon">📚</div>
          <h3>No saved batches</h3>
          <p>Save a batch from the Batches section.</p>
          <button class="primary-btn" id="browseBatchesBtn">
            Browse Batches
          </button>
        </div>
      `;

      $("#browseBatchesBtn")?.addEventListener(
        "click",
        () => setSection("batches")
      );

      return;
    }

    list.innerHTML = state.myBatches
      .map((batch, index) => {
        const title = getBatchTitle(batch);
        const description = getBatchDescription(batch);
        const image = getBatchImage(batch);

        return `
          <article class="batch-card">

            <div class="batch-image-wrap">
              ${
                image
                  ? `
                    <img
                      class="batch-image"
                      src="${escapeHTML(image)}"
                      alt=""
                      loading="lazy"
                    />
                  `
                  : `
                    <div class="batch-image-placeholder">
                      <span>${escapeHTML(
                        title.charAt(0).toUpperCase()
                      )}</span>
                    </div>
                  `
              }

              <span class="saved-badge">Saved</span>
            </div>

            <div class="batch-content">

              <h3>${escapeHTML(title)}</h3>

              ${
                description
                  ? `
                    <p>${escapeHTML(
                      String(description).slice(0, 150)
                    )}</p>
                  `
                  : ""
              }

              <div class="batch-actions">

                <button
                  class="secondary-btn remove-saved-btn"
                  data-index="${index}"
                >
                  Remove
                </button>

                <button
                  class="primary-btn open-saved-btn"
                  data-index="${index}"
                >
                  Study
                </button>

              </div>

            </div>

          </article>
        `;
      })
      .join("");

    list.querySelectorAll(".open-saved-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const batch = state.myBatches[Number(button.dataset.index)];
        if (batch) openBatch(batch);
      });
    });

    list.querySelectorAll(".remove-saved-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.index);

        state.myBatches.splice(index, 1);

        localStorage.setItem(
          getStorageKey(),
          JSON.stringify(state.myBatches)
        );

        renderMyBatches();

        showToast("Removed");
      });
    });
  }

  async function loadCommunity(showLoading = false) {
    const content = $("#sectionContent");
    if (!content) return;

    if (!state.user) {
      renderLoginRequired(
        "Community",
        "Login to join the community and send messages."
      );
      return;
    }

    content.innerHTML = `
      <div class="section-head">
        <div>
          <span class="eyebrow">COMMUNITY</span>
          <h1>Community</h1>
          <p>Discuss your studies with other learners.</p>
        </div>
      </div>

      <div class="community-wrap">

        <div class="community-toolbar">
          <button class="secondary-btn" id="communityRefresh">
            ↻ Refresh
          </button>
        </div>

        <div id="communityMessages" class="community-messages">
          <div class="loading-card">Loading messages...</div>
        </div>

        <form id="communityForm" class="community-composer">

          <div id="communityPreview"></div>

          <div class="composer-row">

            <label
              class="attach-btn"
              title="Attach image"
            >
              +
              <input
                type="file"
                id="communityImage"
                accept="image/png,image/jpeg,image/webp,image/gif"
                hidden
              />
            </label>

            <input
              id="communityText"
              class="composer-input"
              type="text"
              maxlength="2000"
              placeholder="Write a message..."
              autocomplete="off"
            />

            <button
              class="primary-btn send-btn"
              type="submit"
            >
              Send
            </button>

          </div>

          <small class="composer-note">
            Images only. Maximum 6MB.
          </small>

        </form>

      </div>
    `;

    bindCommunityEvents();

    await fetchCommunityMessages();
  }

  function bindCommunityEvents() {
    $("#communityRefresh")?.addEventListener(
      "click",
      fetchCommunityMessages
    );

    $("#communityImage")?.addEventListener(
      "change",
      handleCommunityImage
    );

    $("#communityForm")?.addEventListener(
      "submit",
      sendCommunityMessage
    );
  }

  async function fetchCommunityMessages() {
    const list = $("#communityMessages");
    if (!list) return;

    try {
      const data = await getJSON("/api/community/messages");

      state.community =
        Array.isArray(data)
          ? data
          : data.messages || data.data || [];

      renderCommunityMessages();
    } catch (error) {
      list.innerHTML = `
        <div class="empty-card">
          <h3>Unable to load community</h3>
          <p>${escapeHTML(error.message)}</p>
        </div>
      `;
    }
  }

  function renderCommunityMessages() {
    const list = $("#communityMessages");
    if (!list) return;

    if (!state.community.length) {
      list.innerHTML = `
        <div class="empty-card">
          <div class="empty-icon">👥</div>
          <h3>No messages yet</h3>
          <p>Be the first to start the discussion.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = state.community
      .map((message) => {
        const username =
          message.username ||
          message.user?.username ||
          "User";

        const text = message.message || "";
        const image = message.image_url || message.imageUrl || "";

        return `
          <article class="community-message">

            <div class="message-user">
              ${escapeHTML(username)}
            </div>

            <div class="message-bubble">

              ${
                text
                  ? `
                    <div class="message-text">
                      ${escapeHTML(text)}
                    </div>
                  `
                  : ""
              }

              ${
                image
                  ? `
                    <img
                      class="message-image"
                      src="${escapeHTML(image)}"
                      alt=""
                      loading="lazy"
                    />
                  `
                  : ""
              }

              <div class="message-time">
                ${escapeHTML(
                  formatDate(message.created_at || message.createdAt)
                )}
              </div>

            </div>

          </article>
        `;
      })
      .join("");

    list.scrollTop = list.scrollHeight;
  }

  async function handleCommunityImage(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Only images are allowed.");
      event.target.value = "";
      return;
    }

    if (file.size > 6 * 1024 * 1024) {
      showToast("Image must be smaller than 6MB.");
      event.target.value = "";
      return;
    }

    state.selectedCommunityImage = file;

    const preview = $("#communityPreview");

    if (preview) {
      const url = URL.createObjectURL(file);

      preview.innerHTML = `
        <div class="upload-preview">
          <img src="${url}" alt="" />
          <button type="button" id="removeCommunityImage">
            ×
          </button>
        </div>
      `;

      $("#removeCommunityImage")?.addEventListener(
        "click",
        () => {
          state.selectedCommunityImage = null;

          const input = $("#communityImage");
          if (input) input.value = "";

          preview.innerHTML = "";
        }
      );
    }
  }

  async function sendCommunityMessage(event) {
    event.preventDefault();

    if (!state.user) {
      openLogin();
      return;
    }

    const input = $("#communityText");
    const sendButton = $(".send-btn");

    const message = input?.value.trim() || "";

    if (!message && !state.selectedCommunityImage) {
      showToast("Write a message or select an image.");
      return;
    }

    try {
      if (sendButton) {
        sendButton.disabled = true;
        sendButton.textContent = "Sending...";
      }

      let imageUrl = "";

      if (state.selectedCommunityImage) {
        const formData = new FormData();

        formData.append(
          "image",
          state.selectedCommunityImage
        );

        const upload = await fetch(
          "/api/community/upload",
          {
            method: "POST",
            credentials: "include",
            body: formData
          }
        );

        const uploadData = await upload.json();

        if (!upload.ok) {
          throw new Error(
            uploadData.error || "Image upload failed"
          );
        }

        imageUrl =
          uploadData.image_url ||
          uploadData.imageUrl ||
          uploadData.url ||
          "";
      }

      await getJSON("/api/community/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message,
          image_url: imageUrl
        })
      });

      input.value = "";
      state.selectedCommunityImage = null;

      const imageInput = $("#communityImage");
      if (imageInput) imageInput.value = "";

      const preview = $("#communityPreview");
      if (preview) preview.innerHTML = "";

      await fetchCommunityMessages();

      showToast("Message sent.");
    } catch (error) {
      showToast(error.message);
    } finally {
      if (sendButton) {
        sendButton.disabled = false;
        sendButton.textContent = "Send";
      }
    }
  }

  async function loadAI(showLoading = false) {
    const content = $("#sectionContent");
    if (!content) return;

    if (!state.user) {
      renderLoginRequired(
        "AI Doubts",
        "Login to use Prep Master AI."
      );
      return;
    }

    content.innerHTML = `
      <div class="section-head">
        <div>
          <span class="eyebrow">AI STUDY ASSISTANT</span>
          <h1>Prep Master AI</h1>
          <p>Ask doubts, explain concepts or study from an image.</p>
        </div>
      </div>

      <div class="ai-wrap">

        <div class="ai-toolbar">

          <button
            class="secondary-btn"
            id="aiRefresh"
          >
            ↻
          </button>

          <label class="secondary-btn ai-image-label">
            📷 Add Image
            <input
              type="file"
              id="aiImage"
              accept="image/png,image/jpeg,image/webp"
              hidden
            />
          </label>

          <button
            class="secondary-btn"
            id="generateImageBtn"
          >
            ✦ Generate Study Image
          </button>

        </div>

        <div id="aiImagePreview"></div>

        <div
          id="aiMessages"
          class="ai-messages"
        >
          <div class="loading-card">
            Loading chat...
          </div>
        </div>

        <form
          id="aiForm"
          class="ai-composer"
        >

          <input
            id="aiInput"
            class="composer-input"
            type="text"
            maxlength="4000"
            placeholder="Ask Prep Master..."
            autocomplete="off"
          />

          <button
            class="primary-btn"
            id="aiSend"
            type="submit"
          >
            Send
          </button>

        </form>

        <div class="ai-note">
          Prep Master AI is for study and educational help.
        </div>

      </div>
    `;

    bindAIEvents();

    await fetchAIHistory();
  }

  function bindAIEvents() {
    $("#aiRefresh")?.addEventListener(
      "click",
      fetchAIHistory
    );

    $("#aiImage")?.addEventListener(
      "change",
      handleAIImage
    );

    $("#aiForm")?.addEventListener(
      "submit",
      sendAIMessage
    );

    $("#generateImageBtn")?.addEventListener(
      "click",
      generateStudyImage
    );
  }

  async function fetchAIHistory() {
    const list = $("#aiMessages");
    if (!list) return;

    try {
      const data = await getJSON("/api/ai/history");

      state.aiHistory =
        Array.isArray(data)
          ? data
          : data.messages ||
            data.history ||
            data.data ||
            [];

      renderAIHistory();
    } catch (error) {
      list.innerHTML = `
        <div class="empty-card">
          <h3>Unable to load AI chat</h3>
          <p>${escapeHTML(error.message)}</p>
        </div>
      `;
    }
  }

  function renderAIHistory() {
    const list = $("#aiMessages");
    if (!list) return;

    if (!state.aiHistory.length) {
      list.innerHTML = `
        <div class="ai-welcome">
          <div class="ai-icon">✦</div>
          <h3>Hi! I'm Prep Master AI</h3>
          <p>
            Ask me a study question or upload a study image.
          </p>
        </div>
      `;
      return;
    }

    list.innerHTML = state.aiHistory
      .map((item) => {
        const role = item.role === "user"
          ? "user"
          : "assistant";

        const message = item.message || "";
        const image =
          item.image_url ||
          item.imageUrl ||
          "";

        return `
          <div class="ai-message ${role}">

            <div class="ai-message-role">
              ${
                role === "user"
                  ? "You"
                  : "Prep Master AI"
              }
            </div>

            ${
              message
                ? `
                  <div class="ai-message-text">
                    ${formatAIText(message)}
                  </div>
                `
                : ""
            }

            ${
              image
                ? `
                  <img
                    class="ai-message-image"
                    src="${escapeHTML(image)}"
                    alt="Study image"
                    loading="lazy"
                  />
                `
                : ""
            }

          </div>
        `;
      })
      .join("");

    list.scrollTop = list.scrollHeight;
  }

  function formatAIText(text) {
    return escapeHTML(text)
      .replace(/\n/g, "<br>")
      .replace(
        /`([^`]+)`/g,
        "<code>$1</code>"
      );
  }

  async function handleAIImage(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please select an image.");
      event.target.value = "";
      return;
    }

    if (file.size > 6 * 1024 * 1024) {
      showToast("Image must be smaller than 6MB.");
      event.target.value = "";
      return;
    }

    state.selectedImage = file;

    const preview = $("#aiImagePreview");

    if (!preview) return;

    const url = URL.createObjectURL(file);

    preview.innerHTML = `
      <div class="ai-upload-preview">
        <img src="${url}" alt="" />

        <div>
          <strong>${escapeHTML(file.name)}</strong>

          <button
            type="button"
            id="removeAIImage"
            class="secondary-btn"
          >
            Remove
          </button>
        </div>
      </div>
    `;

    $("#removeAIImage")?.addEventListener(
      "click",
      () => {
        state.selectedImage = null;

        const input = $("#aiImage");
        if (input) input.value = "";

        preview.innerHTML = "";
      }
    );
  }

  async function sendAIMessage(event) {
    event.preventDefault();

    if (!state.user) {
      openLogin();
      return;
    }

    const input = $("#aiInput");
    const sendButton = $("#aiSend");

    const message = input?.value.trim() || "";

    if (!message && !state.selectedImage) {
      showToast("Ask a question or upload an image.");
      return;
    }

    try {
      sendButton.disabled = true;
      sendButton.textContent = "Thinking...";

      let imageUrl = "";

      if (state.selectedImage) {
        const formData = new FormData();

        formData.append(
          "image",
          state.selectedImage
        );

        const upload = await fetch(
          "/api/community/upload",
          {
            method: "POST",
            credentials: "include",
            body: formData
          }
        );

        const uploadData = await upload.json();

        if (!upload.ok) {
          throw new Error(
            uploadData.error || "Image upload failed"
          );
        }

        imageUrl =
          uploadData.image_url ||
          uploadData.imageUrl ||
          uploadData.url ||
          "";
      }

      if (message) {
        addTemporaryAIMessage(
          "user",
          message,
          imageUrl
        );
      }

      const response = await getJSON("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message,
          image_url: imageUrl
        })
      });

      input.value = "";
      clearAIImage();

      await fetchAIHistory();

      if (
        response.reply ||
        response.message ||
        response.answer
      ) {
        showToast("Answer received.");
      }
    } catch (error) {
      showToast(error.message);
      await fetchAIHistory();
    } finally {
      sendButton.disabled = false;
      sendButton.textContent = "Send";
    }
  }

  function addTemporaryAIMessage(
    role,
    message,
    imageUrl = ""
  ) {
    const list = $("#aiMessages");

    if (!list) return;

    if (
      list.querySelector(".ai-welcome")
    ) {
      list.innerHTML = "";
    }

    const wrapper =
      document.createElement("div");

    wrapper.className =
      `ai-message ${role}`;

    wrapper.innerHTML = `
      <div class="ai-message-role">
        ${role === "user" ? "You" : "Prep Master AI"}
      </div>

      ${
        message
          ? `
            <div class="ai-message-text">
              ${formatAIText(message)}
            </div>
          `
          : ""
      }

      ${
        imageUrl
          ? `
            <img
              class="ai-message-image"
              src="${escapeHTML(imageUrl)}"
              alt=""
            />
          `
          : ""
      }
    `;

    list.appendChild(wrapper);
    list.scrollTop = list.scrollHeight;
  }

  function clearAIImage() {
    state.selectedImage = null;

    const input = $("#aiImage");
    if (input) input.value = "";

    const preview = $("#aiImagePreview");
    if (preview) preview.innerHTML = "";
  }

  async function generateStudyImage() {
    if (!state.user) {
      openLogin();
      return;
    }

    const prompt = window.prompt(
      "What study image should Prep Master AI create?"
    );

    if (!prompt || !prompt.trim()) return;

    const button = $("#generateImageBtn");

    try {
      button.disabled = true;
      button.textContent = "Generating...";

      const data = await getJSON(
        "/api/ai/generate-image",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            prompt: prompt.trim()
          })
        }
      );

      await fetchAIHistory();

      if (
        data.image_url ||
        data.imageUrl ||
        data.url
      ) {
        showToast("Study image generated.");
      }
    } catch (error) {
      showToast(error.message);
    } finally {
      button.disabled = false;
      button.textContent =
        "✦ Generate Study Image";
    }
  }

  function renderLoginRequired(title, message) {
    const content = $("#sectionContent");
    if (!content) return;

    content.innerHTML = `
      <div class="login-required">

        <div class="login-required-icon">
          🔐
        </div>

        <h2>${escapeHTML(title)}</h2>

        <p>${escapeHTML(message)}</p>

        <button
          class="primary-btn"
          id="requiredLoginBtn"
        >
          Login
        </button>

        <button
          class="secondary-btn"
          id="requiredCreateBtn"
        >
          Create Account
        </button>

      </div>
    `;

    $("#requiredLoginBtn")?.addEventListener(
      "click",
      openLogin
    );

    $("#requiredCreateBtn")?.addEventListener(
      "click",
      () => openLogin(true)
    );
  }

  function openAccount() {
    if (state.user) {
      showAccountModal();
    } else {
      openLogin();
    }
  }

  function openLogin(createMode = false) {
    const modalContainer = $("#modalContainer");
    if (!modalContainer) return;

    modalContainer.innerHTML = `
      <div class="modal-backdrop" id="loginBackdrop">

        <div class="modal-card">

          <button
            class="modal-close"
            id="closeLogin"
          >
            ×
          </button>

          <div class="modal-head">
            <span class="eyebrow">ACCOUNT</span>
            <h2 id="loginTitle">
              ${createMode ? "Create Account" : "Login"}
            </h2>
          </div>

          <form id="loginForm">

            <label>
              Username
              <input
                id="loginUsername"
                type="text"
                minlength="3"
                maxlength="50"
                required
                autocomplete="username"
              />
            </label>

            <label>
              Password
              <input
                id="loginPassword"
                type="password"
                minlength="6"
                required
                autocomplete="${
                  createMode
                    ? "new-password"
                    : "current-password"
                }"
              />
            </label>

            <div
              id="loginError"
              class="form-error"
            ></div>

            <button
              class="primary-btn full-btn"
              id="loginSubmit"
              type="submit"
            >
              ${createMode ? "Create Account" : "Login"}
            </button>

          </form>

          <button
            class="text-btn"
            id="toggleAuthMode"
          >
            ${
              createMode
                ? "Already have an account? Login"
                : "Create a new account"
            }
          </button>

        </div>

      </div>
    `;

    $("#closeLogin")?.addEventListener(
      "click",
      closeModal
    );

    $("#loginBackdrop")?.addEventListener(
      "click",
      (event) => {
        if (event.target.id === "loginBackdrop") {
          closeModal();
        }
      }
    );

    $("#toggleAuthMode")?.addEventListener(
      "click",
      () => {
        closeModal();
        openLogin(!createMode);
      }
    );

    $("#loginForm")?.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();

        await submitAuth(createMode);
      }
    );
  }

  async function submitAuth(createMode) {
    const username =
      $("#loginUsername")?.value.trim() || "";

    const password =
      $("#loginPassword")?.value || "";

    const errorBox = $("#loginError");
    const submitButton = $("#loginSubmit");

    if (!username || !password) {
      if (errorBox) {
        errorBox.textContent =
          "Please fill all fields.";
      }

      return;
    }

    try {
      submitButton.disabled = true;
      submitButton.textContent =
        createMode
          ? "Creating..."
          : "Logging in...";

      const endpoint = createMode
        ? "/api/auth/register"
        : "/api/auth/login";

      const data = await getJSON(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username,
          password
        })
      });

      state.user =
        data.user ||
        data.account ||
        data;

      closeModal();
      updateAccountUI();

      showToast(
        createMode
          ? "Account created."
          : "Logged in."
      );

      if (
        state.section === "community"
      ) {
        await loadCommunity();
      }

      if (state.section === "ai") {
        await loadAI();
      }
    } catch (error) {
      if (errorBox) {
        errorBox.textContent =
          error.message;
      }
    } finally {
      submitButton.disabled = false;
      submitButton.textContent =
        createMode
          ? "Create Account"
          : "Login";
    }
  }

  function showAccountModal() {
    const modalContainer = $("#modalContainer");
    if (!modalContainer) return;

    const username =
      state.user?.username ||
      state.user?.name ||
      "User";

    modalContainer.innerHTML = `
      <div class="modal-backdrop" id="accountBackdrop">

        <div class="modal-card account-modal">

          <button
            class="modal-close"
            id="closeAccount"
          >
            ×
          </button>

          <div class="account-avatar">
            ${escapeHTML(
              username.charAt(0).toUpperCase()
            )}
          </div>

          <h2>${escapeHTML(username)}</h2>

          <p class="account-status">
            Account active
          </p>

          <div class="account-actions">

            <button
              class="secondary-btn full-btn"
              id="accountMyBatches"
            >
              My Batches
            </button>

            <button
              class="danger-btn full-btn"
              id="logoutBtn"
            >
              Logout
            </button>

          </div>

        </div>

      </div>
    `;

    $("#closeAccount")?.addEventListener(
      "click",
      closeModal
    );

    $("#accountBackdrop")?.addEventListener(
      "click",
      (event) => {
        if (event.target.id === "accountBackdrop") {
          closeModal();
        }
      }
    );

    $("#accountMyBatches")?.addEventListener(
      "click",
      () => {
        closeModal();
        setSection("my-batches");
      }
    );

    $("#logoutBtn")?.addEventListener(
      "click",
      logout
    );
  }

  async function logout() {
    try {
      await getJSON("/api/auth/logout", {
        method: "POST"
      });
    } catch (_) {
      // Some versions of the backend may not expose logout.
      // JWT/cookie expiration will handle the session.
    }

    state.user = null;

    closeModal();
    updateAccountUI();

    showToast("Logged out.");

    if (
      state.section === "community" ||
      state.section === "ai"
    ) {
      setSection("batches");
    }
  }

  function updateAccountUI() {
    const avatarText = $("#avatarText");

    if (!avatarText) return;

    if (state.user) {
      const username =
        state.user.username ||
        state.user.name ||
        "U";

      avatarText.textContent =
        username.charAt(0).toUpperCase();
    } else {
      avatarText.textContent = "A";
    }
  }

  function closeModal() {
    const modalContainer = $("#modalContainer");

    if (modalContainer) {
      modalContainer.innerHTML = "";
    }
  }

  window.PrepMasterLearningApp = {
    getState: () => state,
    reload: loadApp,
    setSection
  };

  loadApp();
})();
