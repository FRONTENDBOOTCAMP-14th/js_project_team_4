/**
 * @fileoverview 링크 관리 시스템 - 이벤트 기반 아키텍처로 구현된 북마크 관리 애플리케이션
 * @description 이 파일은 링크 북마크의 CRUD 작업, 검색/필터링, 키보드 네비게이션,
 *              성능 모니터링 등을 포함한 포괄적인 링크 관리 시스템을 제공합니다.
 */

/* global DOMPurify */
import { showLinkSaveLoading, hideLinkSaveLoading } from "./loading-spiner.js";

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
    UNSAVED_CHANGES: "변경사항이 저장되지 않았습니다. 정말로 진행하시겠습니까?",
    CONFIRM_DELETE: "선택한 링크를 삭제하시겠습니까?",
  },

  SUCCESS: {
    LINK_ADDED: "새 링크가 성공적으로 추가되었습니다.",
    LINK_UPDATED: "링크가 성공적으로 수정되었습니다.",
    LINK_DELETED: "링크가 삭제되었습니다.",
  },

  // 이벤트 타입 정의
  EVENTS: {
    // 링크 데이터 이벤트
    LINK_ADDED: "link-added",
    LINK_UPDATED: "link-updated",
    LINK_DELETED: "link-deleted",
    LINKS_LOADED: "links-loaded",
    FAVORITES_LOADED: "favorites-loaded",

    // UI 상태 이벤트
    LINK_SELECTED: "link-selected",
    FORM_CLEARED: "form-cleared",
    FORM_DIRTY_CHANGED: "form-dirty-changed",
    MODAL_OPENED: "modal-opened",
    MODAL_CLOSED: "modal-closed",

    // 로딩 이벤트
    LOADING_STARTED: "loading-started",
    LOADING_ENDED: "loading-ended",

    // 에러 이벤트
    ERROR_OCCURRED: "error-occurred",
    SUCCESS_MESSAGE: "success-message",

    // 폼 이벤트
    FORM_SUBMIT_REQUESTED: "form-submit-requested",
    FORM_RESET_REQUESTED: "form-reset-requested",
    FORM_DELETE_REQUESTED: "form-delete-requested",
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
    APP: ".app",
  },

  DEFAULTS: {
    FAVICON: "/favicon.png",
    DB_NAME: "LinkDB",
    DB_VERSION: 1,
    UNKNOWN_DOMAIN: "Unknown",
  },
};

const app = document.querySelector(CONSTANTS.SELECTORS.APP);

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

// 향상된 EventPublisher - 더 많은 기능 제공
function createEventPublisher() {
  const listeners = new Map();
  const onceListeners = new Map();

  return {
    subscribe(event, callback) {
      if (!listeners.has(event)) {
        listeners.set(event, []);
      }
      listeners.get(event).push(callback);
      return () => this.unsubscribe(event, callback);
    },

    once(event, callback) {
      if (!onceListeners.has(event)) {
        onceListeners.set(event, []);
      }
      onceListeners.get(event).push(callback);
    },

    unsubscribe(event, callback) {
      if (listeners.has(event)) {
        const callbacks = listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
          callbacks.splice(index, 1);
        }
      }
    },

    publish(event, data) {
      // 일반 리스너 실행
      if (listeners.has(event)) {
        listeners.get(event).forEach((callback) => {
          try {
            callback(data);
          } catch (error) {
            console.error(`이벤트 핸들러 에러 (${event}):`, error);
          }
        });
      }

      // 일회성 리스너 실행 후 제거
      if (onceListeners.has(event)) {
        const callbacks = onceListeners.get(event);
        callbacks.forEach((callback) => {
          try {
            callback(data);
          } catch (error) {
            console.error(`일회성 이벤트 핸들러 에러 (${event}):`, error);
          }
        });
        onceListeners.delete(event);
      }
    },

    clear(event) {
      if (event) {
        listeners.delete(event);
        onceListeners.delete(event);
      } else {
        listeners.clear();
        onceListeners.clear();
      }
    },
  };
}

// 이벤트 기반 상태 관리
function createLinkAppState() {
  let selectedLinkId = null;
  let isFormDirty = false;
  let originalFormData = {};

  const eventPublisher = createEventPublisher();

  return {
    get selectedLinkId() {
      return selectedLinkId;
    },

    setSelectedLink(linkId) {
      const previousId = selectedLinkId;
      selectedLinkId = linkId;
      eventPublisher.publish(CONSTANTS.EVENTS.LINK_SELECTED, {
        linkId,
        previousId,
      });
    },

    clearSelectedLink() {
      const previousId = selectedLinkId;
      selectedLinkId = null;
      eventPublisher.publish(CONSTANTS.EVENTS.LINK_SELECTED, {
        linkId: null,
        previousId,
      });
    },

    get isFormDirty() {
      return isFormDirty;
    },

    setFormDirty(isDirty) {
      if (isFormDirty !== isDirty) {
        isFormDirty = isDirty;
        eventPublisher.publish(CONSTANTS.EVENTS.FORM_DIRTY_CHANGED, {
          isDirty,
          selectedLinkId,
        });
      }
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

    // 이벤트 구독 메서드
    on: eventPublisher.subscribe,
    once: eventPublisher.once,
    off: eventPublisher.unsubscribe,
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

  return {
    init,
    getStore,
  };
}

// 이벤트 기반 LinkManager
function createLinkManager() {
  const dbManager = createDatabaseManager();
  const eventPublisher = createEventPublisher();

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
    eventPublisher.publish(CONSTANTS.EVENTS.LOADING_STARTED, {
      operation: "add",
    });

    try {
      const validation = createURLValidator().validate(url);
      if (!validation.isValid) {
        throw new Error(CONSTANTS.ERRORS.INVALID_URL);
      }

      const existingLink = await api.getByUrl(validation.url);
      if (existingLink) {
        throw new Error(CONSTANTS.ERRORS.DUPLICATE_LINK);
      }

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
          eventPublisher.publish(CONSTANTS.EVENTS.LINK_ADDED, link);
          eventPublisher.publish(
            CONSTANTS.EVENTS.SUCCESS_MESSAGE,
            CONSTANTS.SUCCESS.LINK_ADDED
          );
          resolve(link);
        };
        request.onerror = () => {
          const error = new Error(CONSTANTS.ERRORS.LINK_ADD_FAILED);
          eventPublisher.publish(CONSTANTS.EVENTS.ERROR_OCCURRED, error);
          reject(error);
        };
      });
    } catch (error) {
      eventPublisher.publish(CONSTANTS.EVENTS.ERROR_OCCURRED, error);
      throw error;
    } finally {
      eventPublisher.publish(CONSTANTS.EVENTS.LOADING_ENDED, {
        operation: "add",
      });
    }
  }

  async function getAllLinks() {
    eventPublisher.publish(CONSTANTS.EVENTS.LOADING_STARTED, {
      operation: "loadAll",
    });

    try {
      const { store } = await dbManager.getStore("links");
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const links = request.result;
          eventPublisher.publish(CONSTANTS.EVENTS.LINKS_LOADED, links);
          resolve(links);
        };
        request.onerror = () => {
          const error = new Error(CONSTANTS.ERRORS.LINKS_LOAD_FAILED);
          eventPublisher.publish(CONSTANTS.EVENTS.ERROR_OCCURRED, error);
          reject(error);
        };
      });
    } finally {
      eventPublisher.publish(CONSTANTS.EVENTS.LOADING_ENDED, {
        operation: "loadAll",
      });
    }
  }

  async function getFavoriteLinks() {
    eventPublisher.publish(CONSTANTS.EVENTS.LOADING_STARTED, {
      operation: "loadFavorites",
    });

    try {
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
            eventPublisher.publish(
              CONSTANTS.EVENTS.FAVORITES_LOADED,
              favorites
            );
            resolve(favorites);
          }
        };
        request.onerror = () => {
          const error = new Error(CONSTANTS.ERRORS.FAVORITES_LOAD_FAILED);
          eventPublisher.publish(CONSTANTS.EVENTS.ERROR_OCCURRED, error);
          reject(error);
        };
      });
    } finally {
      eventPublisher.publish(CONSTANTS.EVENTS.LOADING_ENDED, {
        operation: "loadFavorites",
      });
    }
  }

  async function updateLink(id, updates) {
    eventPublisher.publish(CONSTANTS.EVENTS.LOADING_STARTED, {
      operation: "update",
      id,
    });

    try {
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
          eventPublisher.publish(CONSTANTS.EVENTS.LINK_UPDATED, updated);
          eventPublisher.publish(
            CONSTANTS.EVENTS.SUCCESS_MESSAGE,
            CONSTANTS.SUCCESS.LINK_UPDATED
          );
          resolve(updated);
        };
        request.onerror = () => {
          const error = new Error(CONSTANTS.ERRORS.LINK_UPDATE_FAILED);
          eventPublisher.publish(CONSTANTS.EVENTS.ERROR_OCCURRED, error);
          reject(error);
        };
      });
    } catch (error) {
      eventPublisher.publish(CONSTANTS.EVENTS.ERROR_OCCURRED, error);
      throw error;
    } finally {
      eventPublisher.publish(CONSTANTS.EVENTS.LOADING_ENDED, {
        operation: "update",
        id,
      });
    }
  }

  async function deleteLink(id) {
    eventPublisher.publish(CONSTANTS.EVENTS.LOADING_STARTED, {
      operation: "delete",
      id,
    });

    try {
      const { store } = await dbManager.getStore("links", "readwrite");
      return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => {
          eventPublisher.publish(CONSTANTS.EVENTS.LINK_DELETED, { id });
          eventPublisher.publish(
            CONSTANTS.EVENTS.SUCCESS_MESSAGE,
            CONSTANTS.SUCCESS.LINK_DELETED
          );
          resolve(true);
        };
        request.onerror = () => {
          const error = new Error(CONSTANTS.ERRORS.LINK_DELETE_FAILED);
          eventPublisher.publish(CONSTANTS.EVENTS.ERROR_OCCURRED, error);
          reject(error);
        };
      });
    } catch (error) {
      eventPublisher.publish(CONSTANTS.EVENTS.ERROR_OCCURRED, error);
      throw error;
    } finally {
      eventPublisher.publish(CONSTANTS.EVENTS.LOADING_ENDED, {
        operation: "delete",
        id,
      });
    }
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
    on: eventPublisher.subscribe,
    once: eventPublisher.once,
    off: eventPublisher.unsubscribe,
  };

  return api;
}

// UI 컴포넌트들 - 이벤트 기반으로 작동
function createUIEventHandlers() {
  let linkManager = null;
  let appState = null;

  function init(linkManagerInstance, appStateInstance) {
    linkManager = linkManagerInstance;
    appState = appStateInstance;
    setupEventListeners();
  }

  function setupEventListeners() {
    // 링크 관련 이벤트 리스너
    linkManager.on(CONSTANTS.EVENTS.LINK_ADDED, handleLinkAdded);
    linkManager.on(CONSTANTS.EVENTS.LINK_UPDATED, handleLinkUpdated);
    linkManager.on(CONSTANTS.EVENTS.LINK_DELETED, handleLinkDeleted);
    linkManager.on(CONSTANTS.EVENTS.LINKS_LOADED, handleLinksLoaded);
    linkManager.on(CONSTANTS.EVENTS.FAVORITES_LOADED, handleFavoritesLoaded);

    // 상태 관련 이벤트 리스너
    appState.on(CONSTANTS.EVENTS.LINK_SELECTED, handleLinkSelected);
    appState.on(CONSTANTS.EVENTS.FORM_DIRTY_CHANGED, handleFormDirtyChanged);

    // 로딩 이벤트 리스너
    linkManager.on(CONSTANTS.EVENTS.LOADING_STARTED, handleLoadingStarted);
    linkManager.on(CONSTANTS.EVENTS.LOADING_ENDED, handleLoadingEnded);

    // 에러/성공 메시지 리스너
    linkManager.on(CONSTANTS.EVENTS.ERROR_OCCURRED, handleError);
    linkManager.on(CONSTANTS.EVENTS.SUCCESS_MESSAGE, handleSuccess);
  }

  function handleLinkAdded() {
    refreshUI();
    clearForm();
  }

  function handleLinkUpdated() {
    refreshUI();
  }

  function handleLinkDeleted({ id }) {
    if (appState.selectedLinkId === id) {
      clearForm();
    }
    refreshUI();
  }

  function handleLinksLoaded(links) {
    renderLinksToModal(links);
  }

  function handleFavoritesLoaded(favorites) {
    renderFavoriteLinks(favorites);
  }

  function handleLinkSelected({ linkId }) {
    if (linkId) {
      loadLinkToForm(linkId);
    } else {
      clearFormUI();
    }
  }

  function handleFormDirtyChanged({ isDirty }) {
    // 폼 상태에 따른 UI 업데이트 (예: 저장 버튼 활성화)
    console.log("Form dirty state changed:", isDirty);
  }

  function handleLoadingStarted({ operation }) {
    if (operation === "add" || operation === "update") {
      showLinkSaveLoading();
    }
  }

  function handleLoadingEnded({ operation }) {
    if (operation === "add" || operation === "update") {
      hideLinkSaveLoading();
    }
  }

  function handleError(error) {
    alert(error.message);
  }

  function handleSuccess(message) {
    alert(message);
  }

  async function refreshUI() {
    await Promise.all([
      linkManager.getAllLinks(),
      linkManager.getFavoriteLinks(),
    ]);
  }

  async function loadLinkToForm(linkId) {
    try {
      const link = await linkManager.getById(linkId);
      if (!link) return;

      // UI 업데이트
      updateSelectedLinkUI(link);
      populateForm(link);

      appState.setOriginalFormData({
        title: link.title,
        url: link.url,
        description: link.description || "",
      });
      appState.setFormDirty(false);
    } catch (error) {
      console.error("링크 로드 실패:", error);
    }
  }

  function updateSelectedLinkUI(link) {
    document.querySelectorAll(".link-modal__link").forEach((btn) => {
      btn.classList.remove(CONSTANTS.CSS.SELECTED);
    });
    const selectedButton = document.querySelector(`[data-id="${link.id}"]`);
    if (selectedButton) {
      selectedButton.classList.add(CONSTANTS.CSS.SELECTED);
    }
  }

  function populateForm(link) {
    const nameInput = document.querySelector(CONSTANTS.SELECTORS.NAME_INPUT);
    const urlInput = document.querySelector(CONSTANTS.SELECTORS.URL_INPUT);
    const descInput = document.querySelector(CONSTANTS.SELECTORS.DESC_INPUT);
    const headerIcon = document.querySelector(CONSTANTS.SELECTORS.HEADER_ICON);
    const headerLink = document.querySelector(CONSTANTS.SELECTORS.HEADER_LINK);
    const favoriteButton = document.querySelector(
      CONSTANTS.SELECTORS.FAVORITE_CHECKBOX
    );

    if (nameInput) nameInput.value = link.title;
    if (urlInput) urlInput.value = link.url;
    if (descInput) descInput.value = link.description || "";
    if (headerIcon) headerIcon.src = link.favicon;
    if (headerLink) headerLink.href = link.url;

    if (favoriteButton) {
      favoriteButton.checked = link.isFavorite || false;
      favoriteButton.setAttribute("aria-checked", favoriteButton.checked);
      favoriteButton.setAttribute(
        "aria-label",
        favoriteButton.checked ? "즐겨찾기 해제" : "즐겨찾기 추가"
      );
    }
  }

  function clearForm() {
    appState.clearSelectedLink();
    appState.setFormDirty(false);
    appState.setOriginalFormData({});
  }

  function clearFormUI() {
    const nameInput = document.querySelector(CONSTANTS.SELECTORS.NAME_INPUT);
    const urlInput = document.querySelector(CONSTANTS.SELECTORS.URL_INPUT);
    const descInput = document.querySelector(CONSTANTS.SELECTORS.DESC_INPUT);
    const headerIcon = document.querySelector(CONSTANTS.SELECTORS.HEADER_ICON);
    const headerLink = document.querySelector(CONSTANTS.SELECTORS.HEADER_LINK);
    const favoriteButton = document.querySelector(
      CONSTANTS.SELECTORS.FAVORITE_CHECKBOX
    );

    if (nameInput) nameInput.value = "";
    if (urlInput) urlInput.value = "";
    if (descInput) descInput.value = "";
    if (headerIcon) headerIcon.src = CONSTANTS.DEFAULTS.FAVICON;
    if (headerLink) headerLink.href = "#";
    if (favoriteButton) favoriteButton.checked = false;

    document
      .querySelectorAll(`.link-modal__link.${CONSTANTS.CSS.SELECTED}`)
      .forEach((btn) => btn.classList.remove(CONSTANTS.CSS.SELECTED));
  }

  function renderFavoriteLinks(favorites) {
    const container = document.querySelector(
      CONSTANTS.SELECTORS.LINK_CARD_LIST
    );
    if (!container) return;

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

        img.addEventListener("error", () => {
          img.src = "/favicon.png";
        });

        a.appendChild(img);
        a.appendChild(span);
        li.appendChild(a);
        fragment.appendChild(li);
      });
    }

    container.innerHTML = "";
    container.appendChild(fragment);
  }

  function renderLinksToModal(links) {
    const sidebar = document.querySelector(CONSTANTS.SELECTORS.LINK_MODAL_LIST);
    if (!sidebar) return;

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
          button.addEventListener("click", () => {
            if (appState.isFormDirty && appState.selectedLinkId !== link.id) {
              if (!confirm(CONSTANTS.ERRORS.UNSAVED_CHANGES)) return;
            }
            appState.setSelectedLink(link.id);
          });
        }
        fragment.appendChild(li);
      });
    }

    sidebar.innerHTML = "";
    sidebar.appendChild(fragment);
  }

  return {
    init,
    clearForm,
    refreshUI,
  };
}

// 전역 변수들
let linkManagerInstance = null;
let linkAppState = null;
let uiEventHandlers = null;

async function initLinkManager() {
  if (!linkManagerInstance) {
    linkManagerInstance = createLinkManager();
    await linkManagerInstance.init();
  }
  if (!linkAppState) {
    linkAppState = createLinkAppState();
  }
  if (!uiEventHandlers) {
    uiEventHandlers = createUIEventHandlers();
    uiEventHandlers.init(linkManagerInstance, linkAppState);
  }
  return linkManagerInstance;
}

function getLinkManager() {
  return linkManagerInstance;
}

function getLinkAppState() {
  return linkAppState;
}

function getUIEventHandlers() {
  return uiEventHandlers;
}

// DOM 이벤트 핸들러들 - 이벤트 기반으로 단순화
function initLinkCard(linkCardElement, linkModalOverlay) {
  const moreButton = linkCardElement.querySelector(
    CONSTANTS.SELECTORS.MORE_BUTTON
  );

  if (moreButton) {
    moreButton.addEventListener("click", () => {
      linkModalOverlay.classList.add(CONSTANTS.CSS.SHOW);
      document.body.style.overflow = "hidden";

      if (app) app.setAttribute("tabindex", "-1");

      const linkManager = getLinkManager();
      linkManager.getAllLinks();
    });
  }

  // 초기 즐겨찾기 로드
  const linkManager = getLinkManager();
  if (linkManager) {
    linkManager.getFavoriteLinks(); // 이벤트를 통해 UI가 자동 업데이트됨
  }
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

  const state = getLinkAppState();
  const uiHandlers = getUIEventHandlers();

  // 즐겨찾기 버튼 설정
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

  // 모달 닫기 이벤트
  linkModalOverlay.addEventListener("click", (e) => {
    if (
      e.target === linkModalOverlay ||
      e.target.closest(CONSTANTS.SELECTORS.LINK_MODAL_CLOSE)
    ) {
      if (state.isFormDirty && !confirm(CONSTANTS.ERRORS.UNSAVED_CHANGES)) {
        return;
      }
      linkModalOverlay.classList.remove(CONSTANTS.CSS.SHOW);
      document.body.style.overflow = "auto";
      uiHandlers.clearForm();

      if (app) app.removeAttribute("tabindex");
    }
  });

  // 폼 이벤트
  if (form) {
    form.addEventListener("submit", handleFormSubmit);
    form.addEventListener("reset", handleFormReset);

    // 폼 변경 감지
    const inputs = form.querySelectorAll("input, textarea");
    inputs.forEach((input) => {
      input.addEventListener("input", handleFormChange);
    });
  }

  // 버튼 이벤트
  if (addButton) {
    addButton.textContent = "추가";
    addButton.addEventListener("click", () => {
      uiHandlers.clearForm();
    });
  }

  if (removeButton) {
    removeButton.textContent = "제거";
    removeButton.addEventListener("click", handleRemoveSelected);
  }
}

// 폼 변경 감지 - 이벤트 기반
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
  state.setFormDirty(hasChanges); // 이벤트 자동 발행됨
}

// 폼 제출 - 이벤트 기반으로 단순화
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
      // 업데이트 - 이벤트를 통해 UI 자동 업데이트됨
      await linkManager.updateLink(parseInt(editingId), {
        title,
        url,
        description,
        isFavorite: favoriteButton?.checked || false,
      });
    } else {
      // 추가 - 이벤트를 통해 UI 자동 업데이트됨
      await linkManager.addLink(
        url,
        title,
        description,
        favoriteButton?.checked || false
      );
    }
    // 성공 처리는 이벤트 리스너에서 자동 처리됨
  } catch {
    // 에러 처리는 이벤트 리스너에서 자동 처리됨
  }
}

// 폼 리셋 - 이벤트 기반으로 단순화
async function handleFormReset(e) {
  e.preventDefault();

  const state = getLinkAppState();
  const original = state.getOriginalFormData();

  const nameInput = document.querySelector(CONSTANTS.SELECTORS.NAME_INPUT);
  const urlInput = document.querySelector(CONSTANTS.SELECTORS.URL_INPUT);
  const descInput = document.querySelector(CONSTANTS.SELECTORS.DESC_INPUT);
  const headerIcon = document.querySelector(CONSTANTS.SELECTORS.HEADER_ICON);
  const headerLink = document.querySelector(CONSTANTS.SELECTORS.HEADER_LINK);

  if (nameInput) nameInput.value = original.title || "";
  if (urlInput) urlInput.value = original.url || "";
  if (descInput) descInput.value = original.description || "";

  if (headerIcon && original.url) {
    const linkManager = getLinkManager();
    headerIcon.src = linkManager.getFaviconUrl(original.url);
  }
  if (headerLink) {
    headerLink.href = original.url || "#";
  }

  // 즐겨찾기 상태 복원
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

  state.setFormDirty(false); // 이벤트 자동 발행
}

// 삭제 처리 - 이벤트 기반으로 단순화
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
      // 성공 처리 및 UI 업데이트는 이벤트 리스너에서 자동 처리됨
    } catch {
      // 에러 처리는 이벤트 리스너에서 자동 처리됨
    }
  }
}

// 고급 이벤트 기반 기능들
function createAdvancedEventFeatures() {
  const linkManager = getLinkManager();
  const appState = getLinkAppState();

  // 키보드 단축키 이벤트
  function setupKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      // Ctrl+S: 폼 저장
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        const form = document.querySelector(
          CONSTANTS.SELECTORS.LINK_MODAL_FORM
        );
        if (form) {
          form.dispatchEvent(new Event("submit"));
        }
      }

      // Escape: 모달 닫기
      if (e.key === "Escape") {
        const modal = document.querySelector(
          CONSTANTS.SELECTORS.LINK_MODAL_OVERLAY
        );
        if (modal && modal.classList.contains(CONSTANTS.CSS.SHOW)) {
          modal.click(); // 기존 클릭 핸들러 재사용
        }
      }
    });
  }

  // 자동 저장 기능
  function setupAutoSave() {
    let autoSaveTimeout = null;

    appState.on(CONSTANTS.EVENTS.FORM_DIRTY_CHANGED, ({ isDirty }) => {
      if (isDirty && appState.selectedLinkId) {
        // 3초 후 자동 저장
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(async () => {
          const form = document.querySelector(
            CONSTANTS.SELECTORS.LINK_MODAL_FORM
          );
          if (form && appState.isFormDirty) {
            console.log("자동 저장 실행...");
            try {
              // linkManager를 사용한 실제 자동 저장
              const formData = new FormData(form);
              const linkData = {
                title: formData.get("title"),
                url: formData.get("url"),
                description: formData.get("description"),
              };

              if (appState.selectedLinkId) {
                await linkManager.updateLink(appState.selectedLinkId, linkData);
              }
            } catch (error) {
              console.warn("자동 저장 실패:", error);
            }
          }
        }, 3000);
      } else {
        clearTimeout(autoSaveTimeout);
      }
    });
  }

  // 실시간 URL 검증
  function setupRealTimeValidation() {
    const urlInput = document.querySelector(CONSTANTS.SELECTORS.URL_INPUT);
    if (urlInput) {
      let validationTimeout = null;

      urlInput.addEventListener("input", (e) => {
        clearTimeout(validationTimeout);
        validationTimeout = setTimeout(() => {
          const url = e.target.value.trim();
          if (url) {
            const validator = createURLValidator();
            const result = validator.validate(url);

            // URL 유효성에 따른 시각적 피드백
            e.target.classList.toggle("invalid", !result.isValid);
            e.target.classList.toggle("valid", result.isValid);
          } else {
            e.target.classList.remove("invalid", "valid");
          }
        }, 500);
      });
    }
  }

  // 드래그 앤 드롭 지원
  function setupDragAndDrop() {
    const modal = document.querySelector(
      CONSTANTS.SELECTORS.LINK_MODAL_OVERLAY
    );
    if (modal) {
      modal.addEventListener("dragover", (e) => {
        e.preventDefault();
        modal.classList.add("drag-over");
      });

      modal.addEventListener("dragleave", (e) => {
        if (!modal.contains(e.relatedTarget)) {
          modal.classList.remove("drag-over");
        }
      });

      modal.addEventListener("drop", (e) => {
        e.preventDefault();
        modal.classList.remove("drag-over");

        const url = e.dataTransfer.getData("text/plain");
        if (url) {
          const urlInput = document.querySelector(
            CONSTANTS.SELECTORS.URL_INPUT
          );
          if (urlInput) {
            urlInput.value = url;
            urlInput.dispatchEvent(new Event("input"));
          }
        }
      });
    }
  }

  return {
    setupKeyboardShortcuts,
    setupAutoSave,
    setupRealTimeValidation,
    setupDragAndDrop,
  };
}

// 성능 모니터링 이벤트
function createPerformanceMonitor() {
  const linkManager = getLinkManager();
  const performanceLog = [];
  let isMonitoring = false;

  function startMonitoring() {
    if (isMonitoring || !linkManager) return;

    isMonitoring = true;
    console.log("성능 모니터링 시작됨");

    linkManager.on(CONSTANTS.EVENTS.LOADING_STARTED, ({ operation }) => {
      performanceLog.push({
        operation,
        startTime: performance.now(),
        type: "start",
      });
    });

    linkManager.on(CONSTANTS.EVENTS.LOADING_ENDED, ({ operation }) => {
      const startEntry = performanceLog.find(
        (entry) => entry.operation === operation && entry.type === "start"
      );

      if (startEntry) {
        const endTime = performance.now();
        const duration = endTime - startEntry.startTime;

        console.log(`성능 측정 - ${operation}: ${duration.toFixed(2)}ms`);

        performanceLog.push({
          operation,
          startTime: startEntry.startTime,
          endTime,
          duration,
          type: "complete",
        });
      }
    });
  }

  return {
    startMonitoring,
    getPerformanceLog: () => [...performanceLog],
    clearLog: () => (performanceLog.length = 0),
    isMonitoring: () => isMonitoring,
  };
}

// 초기화 함수 - 완전히 이벤트 기반
document.addEventListener("DOMContentLoaded", async () => {
  try {
    console.log("애플리케이션 초기화 시작...");

    // 핵심 컴포넌트 초기화
    console.log("LinkManager 초기화 중...");
    await initLinkManager();
    console.log("LinkManager 초기화 완료");

    // DOM 요소 확인 및 초기화
    const linkCardElement = document.querySelector(".link-card");
    const linkModalOverlay = document.getElementById("linkModalOverlay");

    console.log("DOM 요소 확인:", {
      linkCardElement: !!linkCardElement,
      linkModalOverlay: !!linkModalOverlay,
    });

    if (linkCardElement && linkModalOverlay) {
      console.log("DOM 이벤트 핸들러 초기화 중...");
      initLinkCard(linkCardElement, linkModalOverlay);
      initLinkModal(linkModalOverlay);
      console.log("DOM 이벤트 핸들러 초기화 완료");
    } else {
      console.warn("필수 DOM 요소가 누락되었습니다:", {
        linkCardElement: !!linkCardElement,
        linkModalOverlay: !!linkModalOverlay,
      });
    }

    // 고급 기능 초기화
    console.log("고급 기능 초기화 중...");
    const advancedFeatures = createAdvancedEventFeatures();
    if (advancedFeatures) {
      advancedFeatures.setupKeyboardShortcuts();
      advancedFeatures.setupAutoSave();
      advancedFeatures.setupRealTimeValidation();
      advancedFeatures.setupDragAndDrop();
      console.log("고급 기능 초기화 완료");
    }

    // 성능 모니터링 시작
    console.log("성능 모니터링 초기화 중...");
    const performanceMonitor = createPerformanceMonitor();
    if (
      performanceMonitor &&
      typeof performanceMonitor.startMonitoring === "function"
    ) {
      performanceMonitor.startMonitoring();
      console.log("성능 모니터링 시작됨");
    } else {
      console.warn("성능 모니터링 초기화 실패");
    }

    console.log(
      "✅ Link Manager가 이벤트 기반으로 성공적으로 초기화되었습니다."
    );
  } catch (error) {
    console.error("❌ Link Manager 초기화 실패:", error);
    console.error("에러 스택:", error.stack);

    // 더 구체적인 에러 메시지 제공
    let errorMessage = "애플리케이션 초기화에 실패했습니다.";
    if (error.message.includes("IndexedDB")) {
      errorMessage += " 데이터베이스 연결에 문제가 있습니다.";
    } else if (error.message.includes("DOM")) {
      errorMessage += " 페이지 요소를 찾을 수 없습니다.";
    }
    errorMessage += " 페이지를 새로고침하거나 브라우저 콘솔을 확인해주세요.";

    alert(errorMessage);
  }
});

// 개발자 도구용 전역 API
if (typeof window !== "undefined") {
  window.LinkManagerDebug = {
    getLinkManager,
    getLinkAppState,
    getUIEventHandlers,
    EVENTS: CONSTANTS.EVENTS,

    // 디버깅 헬퍼
    logAllEvents() {
      const manager = getLinkManager();
      Object.values(CONSTANTS.EVENTS).forEach((event) => {
        manager.on(event, (data) => {
          console.log(`🎯 Event: ${event}`, data);
        });
      });
    },

    // 성능 테스트
    async performanceTest() {
      const manager = getLinkManager();
      const testUrl = "https://example.com";

      console.time("Link Operations");
      const link = await manager.addLink(testUrl, "Test Link");
      await manager.updateLink(link.id, { title: "Updated Test Link" });
      await manager.deleteLink(link.id);
      console.timeEnd("Link Operations");
    },
  };
}
