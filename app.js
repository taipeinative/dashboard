(function () {
  "use strict";

  var APP_KEY = "animeDashboard.v1";
  var THEME_KEY = "animeDashboard.theme";

  var SORT_MODES = [
    { id: "none", label: "No sorting" },
    { id: "title-asc", label: "Title (A-Z)" },
    { id: "title-desc", label: "Title (Z-A)" },
    { id: "year-asc", label: "Year (old-new)" },
    { id: "year-desc", label: "Year (new-old)" },
    { id: "stars-asc", label: "Stars (low-high)" },
    { id: "stars-desc", label: "Stars (high-low)" }
  ];

  var DEFAULT_ANIME_URL = "./default-anime.json";

  var state = {
    animes: [],
    searchQuery: "",
    sortMode: "none",
    viewMode: "normal",
    selectedId: null,
    page: "all",
    editMode: "edit",
    preEditReturnId: null
  };

  var appRoot = document.getElementById("app");
  var themeButton = document.getElementById("theme-toggle");
  var addTopButton = document.getElementById("add-anime-top");

  function iconMoon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 15.2A8.5 8.5 0 1 1 11.8 4a7 7 0 0 0 8.2 11.2z"></path></svg>';
  }

  function iconSun() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4.3"></circle><path d="M12 2.5v2.3M12 19.2v2.3M21.5 12h-2.3M4.8 12H2.5M18.6 5.4l-1.7 1.7M7.1 16.9l-1.7 1.7M18.6 18.6l-1.7-1.7M7.1 7.1L5.4 5.4"></path></svg>';
  }

  function iconPlus() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"></path></svg>';
  }

  function iconSort() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M7 4v14M7 18l-3-3M7 18l3-3M17 20V6M17 6l-3 3M17 6l3 3"></path></svg>';
  }

  function iconX() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"></path></svg>';
  }

  function trimText(value) {
    return String(value || "").trim();
  }

  function sanitizeAnime(raw) {
    var year = Number(raw.year);
    var stars = Number(raw.stars);
    return {
      id: String(raw.id || Date.now()),
      title: String(raw.title || "Untitled"),
      originalTitle: String(raw.originalTitle || ""),
      year: Number.isFinite(year) ? year : new Date().getFullYear(),
      tags: Array.isArray(raw.tags) ? raw.tags.map(trimText).filter(Boolean) : [],
      stars: Number.isFinite(stars) ? Math.max(0, Math.min(5, stars)) : 0,
      link: String(raw.link || ""),
      thumbnail: String(raw.thumbnail || "https://picsum.photos/seed/placeholder/480/270"),
      note: String(raw.note || "")
    };
  }

  function isValidSort(mode) {
    var i;
    for (i = 0; i < SORT_MODES.length; i += 1) {
      if (SORT_MODES[i].id === mode) {
        return true;
      }
    }
    return false;
  }

  function findById(id) {
    var i;
    for (i = 0; i < state.animes.length; i += 1) {
      if (state.animes[i].id === id) {
        return state.animes[i];
      }
    }
    return null;
  }

  function loadState() {
    var saved = localStorage.getItem(APP_KEY);
    if (saved) {
      try {
        var parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.animes)) {
          state.animes = parsed.animes.map(sanitizeAnime);
          state.searchQuery = String(parsed.searchQuery || "");
          state.sortMode = isValidSort(parsed.sortMode) ? parsed.sortMode : "none";
          state.viewMode = parsed.viewMode === "compact" ? "compact" : "normal";
          state.selectedId = parsed.selectedId || null;
          
          if (!state.animes.length) {
            return loadDefaultAnime();
          }
          
          if (!findById(state.selectedId)) {
            state.selectedId = state.animes[0] ? state.animes[0].id : null;
          }
          return Promise.resolve();
        }
      } catch (err) {
        console.error("Error parsing saved state:", err);
      }
    }
    
    return loadDefaultAnime();
  }

  function loadDefaultAnime() {
    return fetch(DEFAULT_ANIME_URL)
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Failed to load default anime data");
        }
        return response.json();
      })
      .then(function (data) {
        state.animes = data.map(sanitizeAnime);
        state.selectedId = state.animes[0] ? state.animes[0].id : null;
      })
      .catch(function (err) {
        console.error("Error loading default anime:", err);
        state.animes = [];
        state.selectedId = null;
      });
  }

  function saveState() {
    localStorage.setItem(APP_KEY, JSON.stringify({
      animes: state.animes,
      searchQuery: state.searchQuery,
      sortMode: state.sortMode,
      viewMode: state.viewMode,
      selectedId: state.selectedId
    }));
  }

  function setTheme(theme) {
    var next = theme === "dark" ? "dark" : "light";
    document.body.setAttribute("data-theme", next);
    localStorage.setItem(THEME_KEY, next);
    themeButton.innerHTML = next === "dark" ? iconSun() : iconMoon();
    themeButton.setAttribute("aria-label", next === "dark" ? "Switch to light mode" : "Switch to dark mode");
    themeButton.setAttribute("title", next === "dark" ? "Switch to light mode" : "Switch to dark mode");
  }

  function initTheme() {
    var saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "light") {
      setTheme(saved);
      return;
    }
    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(prefersDark ? "dark" : "light");
  }

  function starsText(value) {
    var rounded = Math.round(Number(value) || 0);
    var stars = "";
    var i;
    for (i = 0; i < rounded; i += 1) {
      stars += "★";
    }
    return stars + " (" + Number(value).toFixed(1) + ")";
  }

  function countNonWhitespaceNonPunctuation(text) {
    var count = 0;
    var i;
    var char;
    for (i = 0; i < text.length; i += 1) {
      char = text[i];
      if (!/[\s\p{P}]/u.test(char)) {
        count += 1;
      }
    }
    return count;
  }

  function countAsciiCharacters(text) {
    var count = 0;
    var i;
    var code;
    for (i = 0; i < text.length; i += 1) {
      code = text.charCodeAt(i);
      if (code >= 32 && code <= 126) {
        if (!/[\s\p{P}]/u.test(text[i])) {
          count += 1;
        }
      }
    }
    return count;
  }

  function shouldShowAutocomplete(text) {
    var asciiCount = countAsciiCharacters(text);
    var otherCount = countNonWhitespaceNonPunctuation(text) - asciiCount;
    return asciiCount > 3 || otherCount > 1;
  }

  function extractDomain(url) {
    try {
      var urlObj = new URL(url);
      return urlObj.hostname;
    } catch (e) {
      return url;
    }
  }

  function filteredAnimes() {
    var q = state.searchQuery.toLowerCase();
    if (!q) {
      return state.animes.slice();
    }
    return state.animes.filter(function (item) {
      return item.title.toLowerCase().indexOf(q) >= 0 || item.originalTitle.toLowerCase().indexOf(q) >= 0;
    });
  }

  function sortedAnimes(list) {
    var sorted = list.slice();
    var mode = state.sortMode;

    if (mode === "none") {
      return sorted;
    }

    sorted.sort(function (a, b) {
      if (mode === "title-asc") {
        return a.title.localeCompare(b.title);
      }
      if (mode === "title-desc") {
        return b.title.localeCompare(a.title);
      }
      if (mode === "year-asc") {
        return a.year - b.year;
      }
      if (mode === "year-desc") {
        return b.year - a.year;
      }
      if (mode === "stars-asc") {
        return a.stars - b.stars;
      }
      return b.stars - a.stars;
    });

    return sorted;
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function parseHash() {
    var hash = window.location.hash.replace(/^#/, "");
    if (!hash || hash === "all") {
      state.page = "all";
      return;
    }
    if (hash.indexOf("detail/") === 0) {
      var detailId = hash.split("/")[1];
      if (findById(detailId)) {
        state.selectedId = detailId;
      }
      state.page = "detail";
      return;
    }
    if (hash === "edit/new") {
      state.page = "edit";
      state.editMode = "new";
      return;
    }
    if (hash.indexOf("edit/") === 0) {
      var editId = hash.split("/")[1];
      if (findById(editId)) {
        state.selectedId = editId;
        state.page = "edit";
        state.editMode = "edit";
        return;
      }
    }
    state.page = "all";
  }

  function navigate(path) {
    if (window.location.hash !== path) {
      window.location.hash = path;
    } else {
      parseHash();
      render();
    }
  }

  function sortOptionsHtml() {
    return SORT_MODES.filter(function (option) {
      return option.id !== "none";
    }).map(function (option) {
      return '<button type="button" class="sort-option ' +
        (state.sortMode === option.id ? "active" : "") +
        '" data-sort="' + escapeHtml(option.id) + '">' +
        escapeHtml(option.label) +
        '</button>';
    }).join("");
  }

  function listHtmlFor(data) {
    if (!data.length) {
      return '<div class="empty">No anime matched your search.</div>';
    }

    if (state.viewMode === "compact") {
      return '<ul class="anime-list">' + data.map(function (item) {
        return '<li class="anime-row" data-id="' + escapeHtml(item.id) + '" tabindex="0">' +
          '<div><strong>' + escapeHtml(item.title) + '</strong><br /><small>' +
          escapeHtml(item.originalTitle || "No original title") + '</small></div>' +
          '<small>' + escapeHtml(String(item.year)) + '</small>' +
          '<span class="stars">' + escapeHtml(starsText(item.stars)) + '</span>' +
          '</li>';
      }).join("") + '</ul>';
    }

    return '<div class="grid">' + data.map(function (item) {
      return '<article class="anime-card" data-id="' + escapeHtml(item.id) + '" tabindex="0">' +
        '<img src="' + escapeHtml(item.thumbnail) + '" alt="' + escapeHtml(item.title + " thumbnail") + '" />' +
        '<div class="anime-card-body">' +
        '<strong>' + escapeHtml(item.title) + '</strong>' +
        '<small>' + escapeHtml(String(item.year)) + '</small>' +
        '<span class="stars">' + escapeHtml(starsText(item.stars)) + '</span>' +
        '</div></article>';
    }).join("") + '</div>';
  }

  function updateAllResults() {
    var optionsElement = document.getElementById("title-options");
    var resultsElement = document.getElementById("all-results");
    if (!optionsElement || !resultsElement) {
      return;
    }

    var searchQuery = state.searchQuery.trim();
    var showAutocomplete = shouldShowAutocomplete(searchQuery);

    if (showAutocomplete && searchQuery) {
      optionsElement.innerHTML = state.animes.map(function (item) {
        return '<option value="' + escapeHtml(item.title) + '"></option>';
      }).join("");
    } else {
      optionsElement.innerHTML = "";
    }

    resultsElement.innerHTML = listHtmlFor(sortedAnimes(filteredAnimes()));
  }

  function syncSortUi() {
    var clearButton = document.getElementById("sort-clear");
    var sortButton = document.getElementById("sort-button");
    var options = appRoot.querySelectorAll(".sort-option");

    if (clearButton) {
      clearButton.hidden = state.sortMode === "none";
    }

    if (sortButton) {
      if (state.sortMode === "none") {
        sortButton.classList.remove("active");
      } else {
        sortButton.classList.add("active");
      }
    }

    Array.prototype.forEach.call(options, function (option) {
      var mode = option.getAttribute("data-sort");
      option.className = "sort-option" + (mode === state.sortMode ? " active" : "");
    });
  }

  function renderAllPage() {
    appRoot.innerHTML = `
      <section class="page">
        <div class="card toolbar">
          <input id="search-input" class="search-input" list="title-options" placeholder="Search anime title..." value="${escapeHtml(state.searchQuery)}" />
          <datalist id="title-options"></datalist>
          <div class="sort-tools">
            <button class="icon-button" id="sort-button" type="button" aria-label="Sort list" title="Sort list">${iconSort()}</button>
            <button class="icon-button sort-clear" id="sort-clear" type="button" aria-label="Clear sort" title="Clear sort" ${state.sortMode === "none" ? "hidden" : ""}>${iconX()}</button>
            <div class="sort-popover" id="sort-popover" hidden>${sortOptionsHtml()}</div>
          </div>
          <div class="view-toggle" role="group" aria-label="View mode" data-active="${escapeHtml(state.viewMode)}">
            <button type="button" data-view="compact" class="toggle-option ${state.viewMode === "compact" ? "active" : ""}">Compact</button>
            <button type="button" data-view="normal" class="toggle-option ${state.viewMode === "normal" ? "active" : ""}">Normal</button>
          </div>
        </div>
        <div class="card list-wrap"><div id="all-results"></div></div>
      </section>
    `;

    updateAllResults();
    syncSortUi();
    var searchInput = document.getElementById("search-input");
    var sortButton = document.getElementById("sort-button");
    var sortClear = document.getElementById("sort-clear");
    var sortPopover = document.getElementById("sort-popover");
    var resultsWrap = document.getElementById("all-results");

    searchInput.addEventListener("input", function (event) {
      state.searchQuery = trimText(event.target.value);
      saveState();
      updateAllResults();
    });

    sortButton.addEventListener("click", function () {
      if (sortPopover.hasAttribute("hidden")) {
        sortPopover.removeAttribute("hidden");
      } else {
        sortPopover.setAttribute("hidden", "hidden");
      }
    });

    sortClear.addEventListener("click", function () {
      state.sortMode = "none";
      saveState();
      syncSortUi();
      updateAllResults();
    });

    Array.prototype.forEach.call(appRoot.querySelectorAll(".sort-option"), function (button) {
      button.addEventListener("click", function () {
        state.sortMode = button.getAttribute("data-sort");
        sortPopover.setAttribute("hidden", "hidden");
        saveState();
        syncSortUi();
        updateAllResults();
      });
    });

    Array.prototype.forEach.call(appRoot.querySelectorAll("[data-view]"), function (button) {
      button.addEventListener("click", function () {
        state.viewMode = button.getAttribute("data-view");
        saveState();
        renderAllPage();
      });
    });

    resultsWrap.addEventListener("click", function (event) {
      var card = event.target.closest("[data-id]");
      if (!card) {
        return;
      }
      var id = card.getAttribute("data-id");
      state.selectedId = id;
      saveState();
      navigate("#detail/" + id);
    });

    resultsWrap.addEventListener("keydown", function (event) {
      var card = event.target.closest("[data-id]");
      if (!card) {
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        var id = card.getAttribute("data-id");
        state.selectedId = id;
        saveState();
        navigate("#detail/" + id);
      }
    });
  }

  function renderDetailPage() {
    var anime = findById(state.selectedId);
    if (!anime) {
      appRoot.innerHTML = '<section class="page"><div class="empty">Anime not found.</div></section>';
      return;
    }

    appRoot.innerHTML = `
      <section class="page">
        <button type="button" class="ghost-button back-button" id="back-button">Return</button>
        <article class="card detail-content">
          <div class="detail-header">
            <div>
              <h2>${escapeHtml(anime.title)}</h2>
              <p class="subtitle">${escapeHtml(anime.originalTitle || "No original title")}</p>
            </div>
            <div class="detail-actions">
              <button type="button" class="secondary-button" id="edit-button">Edit</button>
              <button type="button" class="secondary-button danger" id="delete-button">Delete</button>
            </div>
          </div>
          <img class="detail-thumb" src="${escapeHtml(anime.thumbnail)}" alt="${escapeHtml(anime.title + " thumbnail")}" />
          <div class="meta-grid">
            <div class="meta-item"><label>Year</label><div>${escapeHtml(String(anime.year))}</div></div>
            <div class="meta-item"><label>Stars</label><div class="stars">${escapeHtml(starsText(anime.stars))}</div></div>
            <div class="meta-item"><label>Tags</label><div class="tags">${anime.tags.length ? anime.tags.map(function (tag) { return '<span class="tag">' + escapeHtml(tag) + '</span>'; }).join("") : '<span class="tag">No tags</span>'}</div></div>
            <div class="meta-item"><label>Link</label><div>${anime.link ? (anime.link.indexOf(',') >= 0 ? anime.link.split(',').map(function(link) { var trimmed = trimText(link); return trimmed ? '<a href="' + escapeHtml(trimmed) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(extractDomain(trimmed)) + '</a>' : ''; }).filter(Boolean).join(', ') : '<a href="' + escapeHtml(anime.link) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(extractDomain(anime.link)) + '</a>') : 'No link'}</div></div>
          </div>
          <div>
            <h3>Note</h3>
            <p class="note">${escapeHtml(anime.note || "No notes yet.")}</p>
          </div>
        </article>
      </section>
    `;

    document.getElementById("back-button").addEventListener("click", function () {
      navigate("#all");
    });

    document.getElementById("edit-button").addEventListener("click", function () {
      state.preEditReturnId = anime.id;
      state.editMode = "edit";
      navigate("#edit/" + anime.id);
    });

    document.getElementById("delete-button").addEventListener("click", function () {
      if (confirm("Are you sure you want to delete '" + anime.title + "'?")) {
        state.animes = state.animes.filter(function (entry) {
          return entry.id !== anime.id;
        });
        state.selectedId = state.animes[0] ? state.animes[0].id : null;
        saveState();
        navigate("#all");
      }
    });
  }

  function renderEditPage() {
    var anime = state.editMode === "new"
      ? {
          id: "new",
          title: "",
          originalTitle: "",
          year: new Date().getFullYear(),
          tags: [],
          stars: 3,
          link: "",
          thumbnail: "https://picsum.photos/seed/newanime/480/270",
          note: ""
        }
      : findById(state.selectedId);

    if (!anime) {
      navigate("#all");
      return;
    }

    appRoot.innerHTML = `
      <section class="page">
        <article class="card edit-content">
          <h2>${state.editMode === "new" ? "Add Anime" : "Edit Anime"}</h2>
          <form id="anime-form">
            <div class="field"><label for="title">Title</label><input class="input" id="title" name="title" required value="${escapeHtml(anime.title)}" /></div>
            <div class="field"><label for="originalTitle">Original Title</label><input class="input" id="originalTitle" name="originalTitle" value="${escapeHtml(anime.originalTitle)}" /></div>
            <div class="field"><label for="year">Year</label><input class="input" id="year" name="year" type="number" min="1910" max="2100" value="${escapeHtml(String(anime.year))}" /></div>
            <div class="field"><label for="tags">Tags (comma separated)</label><input class="input" id="tags" name="tags" value="${escapeHtml(anime.tags.join(", "))}" /></div>
            <div class="field"><label for="stars">Stars (0 to 5)</label><input class="input" id="stars" name="stars" type="number" step="0.1" min="0" max="5" value="${escapeHtml(String(anime.stars))}" /></div>
            <div class="field"><label for="link">Website Link</label><input class="input" id="link" name="link" type="url" value="${escapeHtml(anime.link)}" /></div>
            <div class="field"><label for="thumbnail">Thumbnail URL</label><input class="input" id="thumbnail" name="thumbnail" type="url" value="${escapeHtml(anime.thumbnail)}" /></div>
            <div class="field"><label for="note">Note</label><textarea id="note" name="note">${escapeHtml(anime.note)}</textarea></div>
            <div class="form-actions">
              <button type="button" class="secondary-button" id="discard">Discard</button>
              <button type="submit" class="primary-button">Save</button>
            </div>
          </form>
        </article>
      </section>
    `;

    document.getElementById("discard").addEventListener("click", function () {
      if (state.editMode === "edit") {
        navigate("#detail/" + anime.id);
        return;
      }

      if (state.preEditReturnId && findById(state.preEditReturnId)) {
        navigate("#detail/" + state.preEditReturnId);
      } else {
        navigate("#all");
      }
    });

    document.getElementById("anime-form").addEventListener("submit", function (event) {
      event.preventDefault();
      var form = event.target;
      var title = trimText(form.title.value);

      if (!title) {
        alert("Title is required.");
        return;
      }

      var payload = sanitizeAnime({
        id: state.editMode === "new" ? "a" + Date.now() : anime.id,
        title: title,
        originalTitle: trimText(form.originalTitle.value),
        year: Number(form.year.value),
        tags: trimText(form.tags.value).split(","),
        stars: Number(form.stars.value),
        link: trimText(form.link.value),
        thumbnail: trimText(form.thumbnail.value),
        note: trimText(form.note.value)
      });

      if (state.editMode === "new") {
        state.animes.unshift(payload);
      } else {
        state.animes = state.animes.map(function (entry) {
          return entry.id === anime.id ? payload : entry;
        });
      }

      state.selectedId = payload.id;
      state.editMode = "edit";
      state.preEditReturnId = payload.id;
      saveState();
      navigate("#detail/" + payload.id);
    });
  }

  function render() {
    if (state.page === "all") {
      renderAllPage();
      return;
    }
    if (state.page === "detail") {
      renderDetailPage();
      return;
    }
    renderEditPage();
  }

  themeButton.addEventListener("click", function () {
    var current = document.body.getAttribute("data-theme") || "light";
    setTheme(current === "light" ? "dark" : "light");
  });

  addTopButton.innerHTML = iconPlus();
  addTopButton.addEventListener("click", function () {
    state.preEditReturnId = state.page === "detail" ? state.selectedId : null;
    state.editMode = "new";
    navigate("#edit/new");
  });

  window.addEventListener("hashchange", function () {
    parseHash();
    saveState();
    render();
  });

  loadState().then(function () {
    initTheme();
    parseHash();
    if (!window.location.hash) {
      navigate("#all");
    } else {
      render();
    }
  });

  window.clearAnimeDashboardStorage = function () {
    if (confirm("Clear all anime data from local storage? This cannot be undone.")) {
      localStorage.removeItem(APP_KEY);
      loadDefaultAnime().then(function () {
        state.searchQuery = "";
        state.sortMode = "none";
        state.viewMode = "normal";
        saveState();
        navigate("#all");
        console.log("Local storage cleared and reset to default anime list.");
      });
    }
  };

  window.exportAnimeDashboard = function () {
    var dataStr = JSON.stringify(state.animes, null, 2);
    var dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    var exportFileDefaultName = "anime-dashboard-" + new Date().toISOString().split("T")[0] + ".json";

    var linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
    
    console.log("Exported " + state.animes.length + " anime entries to " + exportFileDefaultName);
  };

  console.log("Available commands:");
  console.log("  clearAnimeDashboardStorage() - Clear all data and reset to defaults");
  console.log("  exportAnimeDashboard() - Export current anime list as JSON file");
})();
