/* DOMPurify */

const CONSTANTS = {
  ERRORS: {
    INVALID_URL: "유효하지 않은 URL입니다.",
    DUPLICATE_LINK: "이미 존재하는 링크입니다.",
    DB_CONNECTION_FAILED: "데이터베이스 연결에 실패했습니다.",
    LINK_ADD_FAILED: "링크 추가에 실패했습니다.",
    LINK_UPDATE_FAILED: "링크 수정에 실패했습니다.",
    LINK_DELETE_FAILED: "링크 삭제에 실패했습니다.",
    LINK_NOT_FOUND: "링크를 찾을 수 없습니다.",
    LINKS_LOAD_FAILED: "링크 목록을 불러올 수 없습니다.",
    FAVORITES_LOAD_FAILED: "즐겨찾기를 불러올 수 없습니다.",
    URL_REQUIRED: "URL을 입력해주세요.",
    SELECT_LINK_TO_DELETE: "삭제할 링크를 선택해주세요.",
    UNSAVED_CHANGES:
      "변경사항이 저장되지 않았습니다. 정말로 다른 링크를 선택하시겠습니까?",
    CONFIRM_DELETE: "선택한 링크를 삭제하시겠습니까?",
  },

  SUCCESS: {
    LINK_ADDED: "새 링크가 성공적으로 추가되었습니다.",
    LINK_UPDATED: "링크가 성공적으로 수정되었습니다.",
    LINK_DELETED: "링크가 삭제되었습니다.",
  },

  CSS: {
    SHOW: "show",
    SELECTED: "selected",
    BTN_BASE: "btn-base",
    BG_PRIMARY: "bg-primary",
    LINK_BUTTON: "link-button",
    FAVORITE_STAR: "favorite-star",
    EMPTY_STATE: "empty-state",
  },

  SELECTORS: {
    LINK_MODAL_OVERLAY: ".link-modal-overlay",
    LINK_CARD_LIST: ".link-card__list",
    LINK_MODAL_LIST: ".link-modal__list ul",
    LINK_MODAL_FORM: ".link-modal__form",
    LINK_MODAL_CLOSE: ".link-modal__close",
    MORE_BUTTON: ".link-card__button--more",
    ADD_BUTTON: ".link-modal__list__button-box button:first-child",
    REMOVE_BUTTON: ".link-modal__list__button-box button:last-child",
    FAVORITE_CHECKBOX: ".form-checkbox-favorite--bg-icon input",
    NAME_INPUT: "#link-modal__header__name",
    URL_INPUT: "#link-modal__form__url",
    DESC_INPUT: "#link-modal__form__description",
    HEADER_ICON: ".link-modal__header__name-icon-box img",
    HEADER_LINK: ".link-modal__header__name-icon-box a",
  },

  DEFAULTS: {
    FAVICON: "/favicon.png",
    DB_NAME: "LinkDB",
    DB_VERSION: 1,
    UNKNOWN_DOMAIN: "Unknown",
  },
};

function createURLValidator() {
  return {
    validate(url) {
      try {
        const normalizedUrl = this.normalize(url);
        new URL(normalizedUrl);
        return { isValid: true, url: normalizedUrl };
      } catch {
        return { isValid: false, url: null };
      }
    },
    normalize(url) {
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        return "https://" + url;
      }
      return url;
    },
  };
}

function createLinkAppState() {
  let selectedLinkId = null;
  let isFormDirty = false;
  let originalFormData = {};

  return {
    get selectedLinkId() {
      return selectedLinkId;
    },
    setSelectedLink(linkId) {
      selectedLinkId = linkId;
    },
    clearSelectedLink() {
      selectedLinkId = null;
    },
    get isFormDirty() {
      return isFormDirty;
    },
    setFormDirty(isDirty) {
      isFormDirty = isDirty;
    },
    setOriginalFormData(data) {
      originalFormData = { ...data };
    },
    hasFormChanges(currentData) {
      return JSON.stringify(originalFormData) !== JSON.stringify(currentData);
    },
    getOriginalFormData() {
      return { ...originalFormData };
    },
  };
}

function createDatabaseManager(dbName = "LinkDB", version = 1) {
  let db = null;

  async function init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, version);

      request.onerror = () =>
        reject(new Error(CONSTANTS.ERRORS.DB_CONNECTION_FAILED));
      request.onsuccess = () => {
        db = request.result;
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const dbInstance = event.target.result;
        if (!dbInstance.objectStoreNames.contains("links")) {
          const store = dbInstance.createObjectStore("links", {
            keyPath: "id",
            autoIncrement: true,
          });
          store.createIndex("url", "url", { unique: true });
          store.createIndex("isFavorite", "isFavorite", { unique: false });
        }
      };
    });
  }
  async function getStore(storeName, mode = "readonly") {
    if (!db) await init();
    const transaction = db.transaction([storeName], mode);
    const store = transaction.objectStore(storeName);
    return { transaction, store };
  }
  async function transaction(storeName, mode = "readonly") {
    if (!db) await init();
    return db.transaction([storeName], mode).objectStore(storeName);
  }

  return {
    init,
    getStore,
    transaction,
  };
}

function createEventPublisher() {
  const listeners = new Map();

  return {
    subscribe(event, callback) {
      if (!listeners.has(event)) {
        listeners.set(event, []);
      }
      listeners.get(event).push(callback);
    },

    unsubscribe(event, callback) {
      if (!listeners.has(event)) {
        return;
      }
      const callbacks = listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    },

    publish(event, data) {
      if (listeners.has(event)) {
        listeners.get(event).forEach((callback) => callback(data));
      }
    },
  };
}

function createLinkManager() {
  const dbManager = createDatabaseManager();
  const eventPublisher = createEventPublisher();
  const metadataCache = new Map();
  const requestQueue = [];
  let isProcessingQueue = false;

  async function init() {
    await dbManager.init();
    return api;
  }

  async function addLink(
    url,
    title = "",
    description = "",
    isFavorite = false
  ) {
    const validation = createURLValidator().validate(url);
    if (!validation.isValid) throw new Error(CONSTANTS.ERRORS.INVALID_URL);

    const existingLink = await api.getByUrl(validation.url);
    if (existingLink) throw new Error(CONSTANTS.ERRORS.DUPLICATE_LINK);

    const { store } = await dbManager.getStore("links", "readwrite");
    const link = {
      url: validation.url,
      title: title || extractDomainName(validation.url),
      description,
      favicon: getFaviconUrl(validation.url),
      isFavorite,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const request = store.add(link);
      request.onsuccess = () => {
        link.id = request.result;
        eventPublisher.publish("link-added", link);
        resolve(link);
      };
      request.onerror = () =>
        reject(new Error(CONSTANTS.ERRORS.LINK_ADD_FAILED));
    });
  }

  async function getAllLinks() {
    const { store } = await dbManager.getStore("links");
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const links = request.result;
        eventPublisher.publish("links-loaded", links);
        resolve(links);
      };
      request.onerror = () =>
        reject(new Error(CONSTANTS.ERRORS.LINKS_LOAD_FAILED));
    });
  }

  async function getFavoriteLinks() {
    const { store } = await dbManager.getStore("links");
    return new Promise((resolve, reject) => {
      const favorites = [];
      const request = store.openCursor();
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.isFavorite === true) favorites.push(cursor.value);
          cursor.continue();
        } else {
          resolve(favorites);
        }
      };
      request.onerror = () =>
        reject(new Error(CONSTANTS.ERRORS.FAVORITES_LOAD_FAILED));
    });
  }

  async function updateLink(id, updates) {
    const existing = await api.getById(id);
    if (!existing) throw new Error(CONSTANTS.ERRORS.LINK_NOT_FOUND);

    const { store } = await dbManager.getStore("links", "readwrite");
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const request = store.put(updated);
      request.onsuccess = () => {
        eventPublisher.publish("link-updated", updated);
        resolve(updated);
      };
      request.onerror = () =>
        reject(new Error(CONSTANTS.ERRORS.LINK_UPDATE_FAILED));
    });
  }

  async function deleteLink(id) {
    const { store } = await dbManager.getStore("links", "readwrite");
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => {
        eventPublisher.publish("link-deleted", { id });
        resolve(true);
      };
      request.onerror = () =>
        reject(new Error(CONSTANTS.ERRORS.LINK_DELETE_FAILED));
    });
  }

  async function getById(id) {
    const { store } = await dbManager.getStore("links");
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(new Error(CONSTANTS.ERRORS.LINK_NOT_FOUND));
    });
  }

  async function getByUrl(url) {
    const { store } = await dbManager.getStore("links");
    const index = store.index("url");
    return new Promise((resolve, reject) => {
      const request = index.get(url);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(new Error(CONSTANTS.ERRORS.LINK_NOT_FOUND));
    });
  }

  async function toggleFavorite(id) {
    const link = await api.getById(id);
    if (!link) throw new Error(CONSTANTS.ERRORS.LINK_NOT_FOUND);
    return api.updateLink(id, { isFavorite: !link.isFavorite });
  }

  function extractDomainName(url) {
    try {
      const domain = new URL(url).hostname;
      return domain.replace(/^www\./, "");
    } catch {
      return "Unknown";
    }
  }

  function getFaviconUrl(url) {
    try {
      const domain = new URL(url).origin;
      return `${domain}/favicon.ico`;
    } catch {
      return "/favicon.png";
    }
  }

  function on(event, callback) {
    eventPublisher.subscribe(event, callback);
  }

  const api = {
    init,
    addLink,
    getAllLinks,
    getFavoriteLinks,
    updateLink,
    deleteLink,
    toggleFavorite,
    getById,
    getByUrl,
    extractDomainName,
    getFaviconUrl,
    on,
    _metadataCache: metadataCache,
    _requestQueue: requestQueue,
    _isProcessingQueue: () => isProcessingQueue,
  };

  return api;
}

let linkManagerInstance = null;
let linkAppState = null;

async function initLinkManager() {
  if (!linkManagerInstance) {
    linkManagerInstance = createLinkManager();
    await linkManagerInstance.init();
  }
  if (!linkAppState) {
    linkAppState = createLinkAppState();
  }
  return linkManagerInstance;
}

function getLinkManager() {
  return linkManagerInstance;
}

function getLinkAppState() {
  return linkAppState;
}

function initLinkCard(linkCardElement, linkModalOverlay) {
  const moreButton = linkCardElement.querySelector(
    CONSTANTS.SELECTORS.MORE_BUTTON
  );
  const favoritesList = linkCardElement.querySelector(
    CONSTANTS.SELECTORS.LINK_CARD_LIST
  );

  if (moreButton) {
    moreButton.addEventListener("click", () => {
      linkModalOverlay.classList.add(CONSTANTS.CSS.SHOW);
      document.body.style.overflow = "hidden";
      loadLinksToModal();
    });
  }

  loadFavoriteLinks(favoritesList);
}

function initLinkModal(linkModalOverlay) {
  const form = linkModalOverlay.querySelector(
    CONSTANTS.SELECTORS.LINK_MODAL_FORM
  );
  const addButton = linkModalOverlay.querySelector(
    CONSTANTS.SELECTORS.ADD_BUTTON
  );
  const removeButton = linkModalOverlay.querySelector(
    CONSTANTS.SELECTORS.REMOVE_BUTTON
  );

  const favoriteButton = linkModalOverlay.querySelector(
    CONSTANTS.SELECTORS.FAVORITE_CHECKBOX
  );
  if (favoriteButton) {
    favoriteButton.setAttribute("aria-label", "즐겨찾기 추가");

    favoriteButton.addEventListener("change", function () {
      this.setAttribute("aria-checked", this.checked);
      this.setAttribute(
        "aria-label",
        this.checked ? "즐겨찾기 해제" : "즐겨찾기 추가"
      );
    });
  }

  linkModalOverlay.addEventListener("click", (e) => {
    if (
      e.target === linkModalOverlay ||
      e.target.closest(CONSTANTS.SELECTORS.LINK_MODAL_CLOSE)
    ) {
      linkModalOverlay.classList.remove(CONSTANTS.CSS.SHOW);
      document.body.style.overflow = "auto";
      clearForm();
    }
  });

  if (form) {
    form.addEventListener("submit", handleFormSubmit);
    form.addEventListener("reset", handleFormReset);
  }

  if (addButton) {
    addButton.textContent = "추가";
    addButton.addEventListener("click", () => {
      clearForm();
    });
  }

  if (removeButton) {
    removeButton.textContent = "제거";
    removeButton.addEventListener("click", handleRemoveSelected);
  }
}

async function loadFavoriteLinks(container) {
  if (!container) {
    return;
  }

  try {
    const linkManager = getLinkManager();
    if (!linkManager) {
      return;
    }

    const favorites = await linkManager.getFavoriteLinks();

    const fragment = document.createDocumentFragment();

    if (favorites.length === 0) {
      const emptyState = document.createElement("li");
      emptyState.className = `link-card__${CONSTANTS.CSS.EMPTY_STATE}`;
      emptyState.innerHTML = DOMPurify.sanitize(`
        <div class="${CONSTANTS.CSS.EMPTY_STATE}">
          <p class="${CONSTANTS.CSS.EMPTY_STATE}__message">즐겨찾기한 링크가 없습니다.</p>
          <p class="${CONSTANTS.CSS.EMPTY_STATE}__hint">링크 관리에서 즐겨찾기를 추가해보세요.</p>
        </div>
      `);
      fragment.appendChild(emptyState);
    } else {
      favorites.forEach((link) => {
        const li = document.createElement("li");

        const a = document.createElement("a");
        a.href = link.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.className = `link-card__link ${CONSTANTS.CSS.BTN_BASE} ${CONSTANTS.CSS.BG_PRIMARY}`;

        const img = document.createElement("img");
        img.className = "btn-base__icon";
        img.src = link.favicon;
        img.alt = "";

        const span = document.createElement("abbr");
        span.className = "link-button__text";
        span.setAttribute("title", link.description);
        span.textContent = link.title;

        // Use addEventListener instead of inline onerror attribute
        img.addEventListener("error", () => {
          img.src = "/favicon.png";
          console.error(`파비콘 로드 실패: ${link.favicon}`);
        });

        a.appendChild(img);
        a.appendChild(span);
        li.appendChild(a);
        fragment.appendChild(li);
      });
    }

    container.innerHTML = "";
    container.appendChild(fragment);
  } catch (error) {
    console.error("즐겨찾기 로드 실패:", error);
    alert(CONSTANTS.ERRORS.FAVORITES_LOAD_FAILED);
  }
}

async function loadLinksToModal() {
  try {
    const linkManager = getLinkManager();
    if (!linkManager) {
      return;
    }

    const links = await linkManager.getAllLinks();

    const sidebar = document.querySelector(".link-modal__list ul");

    if (sidebar) {
      const fragment = document.createDocumentFragment();

      if (links.length === 0) {
        const emptyState = document.createElement("li");
        emptyState.className = `link-modal__${CONSTANTS.CSS.EMPTY_STATE}`;
        emptyState.innerHTML = DOMPurify.sanitize(`
          <div class="${CONSTANTS.CSS.EMPTY_STATE}">
            <p class="${CONSTANTS.CSS.EMPTY_STATE}__message">등록된 링크가 없습니다.</p>
            <p class="${CONSTANTS.CSS.EMPTY_STATE}__hint">"추가" 버튼을 눌러 첫 링크를 추가해보세요.</p>
          </div>
        `);
        fragment.appendChild(emptyState);
      } else {
        links.forEach((link) => {
          const li = document.createElement("li");
          li.innerHTML = DOMPurify.sanitize(`
              <button class="link-modal__link ${CONSTANTS.CSS.BTN_BASE} ${CONSTANTS.CSS.BG_PRIMARY} ${CONSTANTS.CSS.LINK_BUTTON}" type="button" data-id="${link.id}">
                <img class="btn-base__icon" src="${link.favicon}" alt="" onerror="this.src='/favicon.png'">
                <span class="link-button__text">${link.title}</span>
                ${link.isFavorite ? `<span class="${CONSTANTS.CSS.FAVORITE_STAR}">★</span>` : ""}
              </button>
            `);

          const button = li.querySelector("button");
          if (button) {
            button.addEventListener("click", () => selectLink(link));
          }
          fragment.appendChild(li);
        });
      }

      sidebar.innerHTML = "";
      sidebar.appendChild(fragment);
    }
  } catch (error) {
    console.error("링크 목록 로드 실패:", error);
    alert(CONSTANTS.ERRORS.LINKS_LOAD_FAILED);
  }
}

function selectLink(link) {
  const state = getLinkAppState();

  if (state.isFormDirty && state.selectedLinkId !== link.id) {
    if (
      !confirm(
        "변경사항이 저장되지 않았습니다. 정말로 다른 링크를 선택하시겠습니까?"
      )
    ) {
      return;
    }
  }

  document.querySelectorAll(".link-modal__link").forEach((btn) => {
    btn.classList.remove(CONSTANTS.CSS.SELECTED);
  });
  const selectedButton = document.querySelector(`[data-id="${link.id}"]`);
  if (selectedButton) {
    selectedButton.classList.add(CONSTANTS.CSS.SELECTED);
  }

  state.setSelectedLink(link.id);

  const nameInput = document.getElementById("link-modal__header__name");
  const urlInput = document.getElementById("link-modal__form__url");
  const descInput = document.getElementById("link-modal__form__description");
  const headerIcon = document.querySelector(CONSTANTS.SELECTORS.HEADER_ICON);
  const headerLink = document.querySelector(CONSTANTS.SELECTORS.HEADER_LINK);
  const favoriteButton = document.querySelector(
    CONSTANTS.SELECTORS.FAVORITE_CHECKBOX
  );
  if (favoriteButton) {
    favoriteButton.checked = link.isFavorite || false;
    favoriteButton.setAttribute("aria-checked", favoriteButton.checked);
    favoriteButton.setAttribute(
      "aria-label",
      favoriteButton.checked ? "즐겨찾기 해제" : "즐겨찾기 추가"
    );
  }

  const formData = {
    title: link.title,
    url: link.url,
    description: link.description || "",
  };

  if (nameInput) {
    nameInput.value = formData.title;
  }
  if (urlInput) {
    urlInput.value = formData.url;
  }
  if (descInput) {
    descInput.value = formData.description;
  }
  if (headerIcon) {
    headerIcon.src = link.favicon;
  }
  if (headerLink) {
    headerLink.href = link.url;
  }

  state.setOriginalFormData(formData);
  state.setFormDirty(false);

  setupFormChangeDetection();
}

function setupFormChangeDetection() {
  const nameInput = document.querySelector(CONSTANTS.SELECTORS.NAME_INPUT);
  const urlInput = document.querySelector(CONSTANTS.SELECTORS.URL_INPUT);
  const descInput = document.querySelector(CONSTANTS.SELECTORS.DESC_INPUT);

  const inputs = [nameInput, urlInput, descInput].filter(Boolean);
  inputs.forEach((input) => {
    input.addEventListener("input", handleFormChange);
  });
}

function handleFormChange() {
  const state = getLinkAppState();
  const nameInput = document.querySelector(CONSTANTS.SELECTORS.NAME_INPUT);
  const urlInput = document.querySelector(CONSTANTS.SELECTORS.URL_INPUT);
  const descInput = document.querySelector(CONSTANTS.SELECTORS.DESC_INPUT);

  const currentData = {
    title: nameInput?.value.trim() || "",
    url: urlInput?.value.trim() || "",
    description: descInput?.value.trim() || "",
  };

  const hasChanges = state.hasFormChanges(currentData);
  state.setFormDirty(hasChanges);
}

function clearForm() {
  const nameInput = document.querySelector(CONSTANTS.SELECTORS.NAME_INPUT);
  const urlInput = document.querySelector(CONSTANTS.SELECTORS.URL_INPUT);
  const descInput = document.querySelector(CONSTANTS.SELECTORS.DESC_INPUT);
  const headerIcon = document.querySelector(CONSTANTS.SELECTORS.HEADER_ICON);
  const headerLink = document.querySelector(CONSTANTS.SELECTORS.HEADER_LINK);
  const favoriteButton = document.querySelector(
    CONSTANTS.SELECTORS.FAVORITE_CHECKBOX
  );
  const state = getLinkAppState();

  if (nameInput) {
    nameInput.value = "";
  }
  if (urlInput) {
    urlInput.value = "";
  }
  if (descInput) {
    descInput.value = "";
  }
  if (headerIcon) {
    headerIcon.src = CONSTANTS.DEFAULTS.FAVICON;
  }
  if (headerLink) {
    headerLink.href = "#";
  }
  if (favoriteButton) {
    favoriteButton.checked = false;
  }

  document
    .querySelectorAll(`.link-modal__link.${CONSTANTS.CSS.SELECTED}`)
    .forEach((btn) => {
      btn.classList.remove(CONSTANTS.CSS.SELECTED);
    });
  state.clearSelectedLink();
  state.setFormDirty(false);
  state.setOriginalFormData({});
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const state = getLinkAppState();
  const nameInput = document.querySelector(CONSTANTS.SELECTORS.NAME_INPUT);
  const urlInput = document.querySelector(CONSTANTS.SELECTORS.URL_INPUT);
  const descInput = document.querySelector(CONSTANTS.SELECTORS.DESC_INPUT);
  const favoriteButton = document.querySelector(
    CONSTANTS.SELECTORS.FAVORITE_CHECKBOX
  );

  const title = nameInput?.value.trim() || "";
  const url = urlInput?.value.trim() || "";
  const description = descInput?.value.trim() || "";

  if (!url) {
    alert(CONSTANTS.ERRORS.URL_REQUIRED);
    urlInput?.focus();
    return;
  }

  try {
    const linkManager = getLinkManager();
    const editingId = state.selectedLinkId;

    if (editingId) {
      await linkManager.updateLink(parseInt(editingId), {
        title,
        url,
        description,
        isFavorite: favoriteButton?.checked || false,
      });
      alert(CONSTANTS.SUCCESS.LINK_UPDATED);
    } else {
      await linkManager.addLink(
        url,
        title,
        description,
        favoriteButton?.checked || false
      );
      alert(CONSTANTS.SUCCESS.LINK_ADDED);
    }

    clearForm();
    await Promise.all([
      loadLinksToModal(),
      loadFavoriteLinks(
        document.querySelector(CONSTANTS.SELECTORS.LINK_CARD_LIST)
      ),
    ]);
  } catch (error) {
    alert(error.message);
  }
}

async function handleFormReset(e) {
  e.preventDefault();

  const state = getLinkAppState();

  const original = state.getOriginalFormData();

  const nameInput = document.querySelector(CONSTANTS.SELECTORS.NAME_INPUT);
  const urlInput = document.querySelector(CONSTANTS.SELECTORS.URL_INPUT);
  const descInput = document.querySelector(CONSTANTS.SELECTORS.DESC_INPUT);
  const headerIcon = document.querySelector(CONSTANTS.SELECTORS.HEADER_ICON);
  const headerLink = document.querySelector(CONSTANTS.SELECTORS.HEADER_LINK);

  if (nameInput) {
    nameInput.value = original.title || "";
  }
  if (urlInput) {
    urlInput.value = original.url || "";
  }
  if (descInput) {
    descInput.value = original.description || "";
  }

  if (headerIcon && original.url) {
    const linkManager = getLinkManager();
    headerIcon.src = linkManager.getFaviconUrl(original.url);
  }
  if (headerLink) {
    headerLink.href = original.url || "#";
  }

  const selectedLinkId = state.selectedLinkId;
  if (selectedLinkId) {
    const linkManager = getLinkManager();
    try {
      const originalLink = await linkManager.getById(selectedLinkId);
      const favoriteButton = document.querySelector(
        CONSTANTS.SELECTORS.FAVORITE_CHECKBOX
      );
      if (favoriteButton && originalLink) {
        favoriteButton.checked = originalLink.isFavorite || false;
        favoriteButton.setAttribute("aria-checked", favoriteButton.checked);
        favoriteButton.setAttribute(
          "aria-label",
          favoriteButton.checked ? "즐겨찾기 해제" : "즐겨찾기 추가"
        );
      }
    } catch (error) {
      console.error("원본 링크 데이터 로드 실패:", error);
    }
  }

  state.setFormDirty(false);
}

async function handleRemoveSelected() {
  const selectedButton = document.querySelector(
    `.link-modal__link.${CONSTANTS.CSS.SELECTED}`
  );
  if (!selectedButton) {
    alert(CONSTANTS.ERRORS.SELECT_LINK_TO_DELETE);
    return;
  }

  const linkId = parseInt(selectedButton.dataset.id);

  if (confirm(CONSTANTS.ERRORS.CONFIRM_DELETE)) {
    try {
      const linkManager = getLinkManager();
      await linkManager.deleteLink(linkId);

      clearForm();
      loadLinksToModal();
      loadFavoriteLinks(document.querySelector(".link-card__list"));

      alert(CONSTANTS.SUCCESS.LINK_DELETED);
    } catch (error) {
      alert(error.message);
    }
  }
}
