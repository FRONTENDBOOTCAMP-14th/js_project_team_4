/* global DOMPurify */
import { hideLinkSaveLoading, showLinkSaveLoading } from "./loading-spiner.js";

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
    URL_REQUIRED: "URL을 입력해주세요.",
    SELECT_LINK_TO_DELETE: "삭제할 링크를 선택해주세요.",
    UNSAVED_CHANGES: "변경사항이 저장되지 않았습니다. 정말로 진행하시겠습니까?",
    CONFIRM_DELETE: "선택한 링크를 삭제하시겠습니까?",
  },
  SELECTORS: {
    LINK_CARD: ".link-card",
    LINK_CARD_LIST: ".link-card__list",
    MORE_BUTTON: ".link-card__button--more",
    MODAL_OVERLAY: "#linkModalOverlay",
    MODAL_LIST: ".link-modal__list ul",
    MODAL_FORM: ".link-modal__form",
    MODAL_CLOSE: ".link-modal__close",
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
  },
};

// -------------------------------------------------------------
// 1. URL & Favicon Helpers
// -------------------------------------------------------------
function normalizeUrl(url) {
  const trimmed = url.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

function isValidUrl(url) {
  try {
    new URL(normalizeUrl(url));
    return true;
  } catch {
    return false;
  }
}

function extractDomainName(url) {
  try {
    return new URL(normalizeUrl(url)).hostname.replace(/^www\./, "");
  } catch {
    return "Unknown";
  }
}

function getFaviconUrl(url) {
  try {
    const domain = new URL(normalizeUrl(url)).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return CONSTANTS.DEFAULTS.FAVICON;
  }
}

// -------------------------------------------------------------
// 2. LinkStore (IndexedDB Promise-based CRUD)
// -------------------------------------------------------------
class LinkStore {
  constructor(dbName = CONSTANTS.DEFAULTS.DB_NAME, version = CONSTANTS.DEFAULTS.DB_VERSION) {
    this.dbName = dbName;
    this.version = version;
    this.dbPromise = this.openDB();
  }

  openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("links")) {
          const store = db.createObjectStore("links", {
            keyPath: "id",
            autoIncrement: true,
          });
          store.createIndex("url", "url", { unique: true });
          store.createIndex("isFavorite", "isFavorite", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(CONSTANTS.ERRORS.DB_CONNECTION_FAILED));
    });
  }

  async getStore(mode = "readonly") {
    const db = await this.dbPromise;
    const tx = db.transaction("links", mode);
    return { store: tx.objectStore("links"), tx };
  }

  async getAll() {
    const { store } = await this.getStore("readonly");
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error(CONSTANTS.ERRORS.LINKS_LOAD_FAILED));
    });
  }

  async getFavorites() {
    const links = await this.getAll();
    return links.filter((link) => Boolean(link.isFavorite));
  }

  async getById(id) {
    const { store } = await this.getStore("readonly");
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error(CONSTANTS.ERRORS.LINK_NOT_FOUND));
    });
  }

  async getByUrl(url) {
    const { store } = await this.getStore("readonly");
    const index = store.index("url");
    return new Promise((resolve, reject) => {
      const request = index.get(url);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error(CONSTANTS.ERRORS.LINK_NOT_FOUND));
    });
  }

  async add({ url, title, description, isFavorite = false }) {
    const normalized = normalizeUrl(url);
    if (!isValidUrl(normalized)) {
      throw new Error(CONSTANTS.ERRORS.INVALID_URL);
    }

    const existing = await this.getByUrl(normalized);
    if (existing) {
      throw new Error(CONSTANTS.ERRORS.DUPLICATE_LINK);
    }

    const link = {
      url: normalized,
      title: title?.trim() || extractDomainName(normalized),
      description: description?.trim() || "",
      favicon: getFaviconUrl(normalized),
      isFavorite: Boolean(isFavorite),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { store, tx } = await this.getStore("readwrite");
    return new Promise((resolve, reject) => {
      const request = store.add(link);
      request.onsuccess = () => {
        link.id = request.result;
      };
      tx.oncomplete = () => resolve(link);
      tx.onerror = () => reject(new Error(CONSTANTS.ERRORS.LINK_ADD_FAILED));
    });
  }

  async update(id, updates) {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(CONSTANTS.ERRORS.LINK_NOT_FOUND);
    }

    const normalized = updates.url ? normalizeUrl(updates.url) : existing.url;
    if (updates.url && !isValidUrl(normalized)) {
      throw new Error(CONSTANTS.ERRORS.INVALID_URL);
    }

    if (normalized !== existing.url) {
      const duplicate = await this.getByUrl(normalized);
      if (duplicate && duplicate.id !== id) {
        throw new Error(CONSTANTS.ERRORS.DUPLICATE_LINK);
      }
    }

    const updated = {
      ...existing,
      ...updates,
      url: normalized,
      title: updates.title?.trim() || existing.title || extractDomainName(normalized),
      description: updates.description !== undefined ? updates.description.trim() : existing.description,
      favicon: getFaviconUrl(normalized),
      isFavorite: updates.isFavorite !== undefined ? Boolean(updates.isFavorite) : existing.isFavorite,
      updatedAt: new Date().toISOString(),
    };

    const { store, tx } = await this.getStore("readwrite");
    return new Promise((resolve, reject) => {
      store.put(updated);
      tx.oncomplete = () => resolve(updated);
      tx.onerror = () => reject(new Error(CONSTANTS.ERRORS.LINK_UPDATE_FAILED));
    });
  }

  async delete(id) {
    const { store, tx } = await this.getStore("readwrite");
    return new Promise((resolve, reject) => {
      store.delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(new Error(CONSTANTS.ERRORS.LINK_DELETE_FAILED));
    });
  }
}

// -------------------------------------------------------------
// 3. Focus Trap Utility
// -------------------------------------------------------------
function createFocusTrap(element) {
  const focusableSelector = `
    a[href]:not([disabled]),
    button:not([disabled]),
    textarea:not([disabled]),
    input[type="text"]:not([disabled]),
    input[type="checkbox"]:not([disabled]),
    [tabindex]:not([tabindex="-1"]):not([disabled])
  `;
  let isActive = false;

  function handleKeydown(e) {
    if (e.key !== "Tab") return;
    const focusable = element.querySelectorAll(focusableSelector);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return {
    activate() {
      if (isActive) return;
      isActive = true;
      document.addEventListener("keydown", handleKeydown);
    },
    deactivate() {
      if (!isActive) return;
      isActive = false;
      document.removeEventListener("keydown", handleKeydown);
    },
    focusFirst() {
      const focusable = element.querySelectorAll(focusableSelector);
      if (focusable.length > 0) focusable[0].focus();
    },
  };
}

// -------------------------------------------------------------
// 4. Link UI Controller
// -------------------------------------------------------------
class LinkUIController {
  constructor(store) {
    this.store = store;
    this.selectedLinkId = null;
    this.isFormDirty = false;
    this.originalFormData = { title: "", url: "", description: "" };

    // DOM Elements
    this.app = document.querySelector(CONSTANTS.SELECTORS.APP);
    this.linkCard = document.querySelector(CONSTANTS.SELECTORS.LINK_CARD);
    this.linkCardList = document.querySelector(CONSTANTS.SELECTORS.LINK_CARD_LIST);
    this.moreButton = document.querySelector(CONSTANTS.SELECTORS.MORE_BUTTON);
    this.modalOverlay = document.querySelector(CONSTANTS.SELECTORS.MODAL_OVERLAY);
    this.modalList = document.querySelector(CONSTANTS.SELECTORS.MODAL_LIST);
    this.modalForm = document.querySelector(CONSTANTS.SELECTORS.MODAL_FORM);
    this.modalClose = document.querySelector(CONSTANTS.SELECTORS.MODAL_CLOSE);
    this.addButton = document.querySelector(CONSTANTS.SELECTORS.ADD_BUTTON);
    this.removeButton = document.querySelector(CONSTANTS.SELECTORS.REMOVE_BUTTON);
    this.nameInput = document.querySelector(CONSTANTS.SELECTORS.NAME_INPUT);
    this.urlInput = document.querySelector(CONSTANTS.SELECTORS.URL_INPUT);
    this.descInput = document.querySelector(CONSTANTS.SELECTORS.DESC_INPUT);
    this.favoriteCheckbox = document.querySelector(CONSTANTS.SELECTORS.FAVORITE_CHECKBOX);
    this.headerIcon = document.querySelector(CONSTANTS.SELECTORS.HEADER_ICON);
    this.headerLink = document.querySelector(CONSTANTS.SELECTORS.HEADER_LINK);

    this.focusTrap = this.modalOverlay ? createFocusTrap(this.modalOverlay) : null;
  }

  init() {
    if (!this.linkCard || !this.modalOverlay) return;

    this.setupAccessibility();
    this.bindEvents();
    this.refreshCards();
  }

  setupAccessibility() {
    if (this.app) {
      this.app.setAttribute("role", "main");
      this.app.setAttribute("aria-label", "라이프코드 대시보드");
    }
    const modalTitle = this.modalOverlay.querySelector(".link-modal__title");
    if (modalTitle && !modalTitle.id) {
      modalTitle.id = "link-modal-title";
    }
    if (this.moreButton) {
      this.moreButton.setAttribute("aria-label", "링크 관리 모달 열기");
    }
  }

  bindEvents() {
    this.moreButton?.addEventListener("click", () => this.openModal());
    this.modalClose?.addEventListener("click", () => this.closeModal());

    this.modalOverlay.addEventListener("click", (e) => {
      if (e.target === this.modalOverlay) this.closeModal();
    });

    this.modalOverlay.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        this.closeModal();
      }
    });

    this.modalForm?.addEventListener("submit", (e) => this.handleFormSubmit(e));
    this.modalForm?.addEventListener("reset", (e) => this.handleFormReset(e));

    [this.nameInput, this.urlInput, this.descInput].forEach((input) => {
      input?.addEventListener("input", () => this.handleFormInput());
    });

    this.urlInput?.addEventListener("input", (e) => {
      const val = e.target.value.trim();
      if (this.headerIcon) {
        this.headerIcon.src = val ? getFaviconUrl(val) : CONSTANTS.DEFAULTS.FAVICON;
      }
      if (this.headerLink) {
        this.headerLink.href = val ? normalizeUrl(val) : "#";
      }
    });

    this.favoriteCheckbox?.addEventListener("change", (e) => {
      e.target.setAttribute("aria-checked", e.target.checked);
      e.target.setAttribute("aria-label", e.target.checked ? "즐겨찾기 해제" : "즐겨찾기 추가");
      this.isFormDirty = true;
    });

    this.addButton?.addEventListener("click", () => {
      if (this.isFormDirty && !confirm(CONSTANTS.ERRORS.UNSAVED_CHANGES)) return;
      this.clearForm();
      this.urlInput?.focus();
    });

    this.removeButton?.addEventListener("click", () => this.handleRemoveSelected());
  }

  async refreshCards() {
    try {
      const favorites = await this.store.getFavorites();
      this.renderFavoriteCards(favorites);
    } catch (error) {
      console.error("즐겨찾기 로드 실패:", error);
    }
  }

  async refreshModal() {
    try {
      const links = await this.store.getAll();
      this.renderModalLinks(links);
    } catch (error) {
      console.error("링크 목록 로드 실패:", error);
    }
  }

  renderFavoriteCards(favorites) {
    if (!this.linkCardList) return;

    if (favorites.length === 0) {
      this.linkCardList.innerHTML = DOMPurify.sanitize(`
        <li class="link-card__empty-state">
          <div class="empty-state">
            <p class="empty-state__message">즐겨찾기한 링크가 없습니다.</p>
            <p class="empty-state__hint">링크 관리에서 즐겨찾기를 추가해보세요.</p>
          </div>
        </li>
      `);
      return;
    }

    const fragment = document.createDocumentFragment();
    favorites.forEach((link) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = link.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.className = "link-card__link btn-base bg-primary hover-fourth";

      const img = document.createElement("img");
      img.className = "btn-base__icon";
      img.src = link.favicon;
      img.alt = "";
      img.onerror = () => { img.src = CONSTANTS.DEFAULTS.FAVICON; };

      const span = document.createElement("abbr");
      span.className = "link-button__text";
      span.setAttribute("title", link.description || link.title);
      span.textContent = link.title;

      a.appendChild(img);
      a.appendChild(span);
      li.appendChild(a);
      fragment.appendChild(li);
    });

    this.linkCardList.innerHTML = "";
    this.linkCardList.appendChild(fragment);
  }

  renderModalLinks(links) {
    if (!this.modalList) return;

    if (links.length === 0) {
      this.modalList.innerHTML = DOMPurify.sanitize(`
        <li class="link-modal__empty-state">
          <div class="empty-state">
            <p class="empty-state__message">등록된 링크가 없습니다.</p>
            <p class="empty-state__hint">"추가" 버튼을 눌러 첫 링크를 추가해보세요.</p>
          </div>
        </li>
      `);
      return;
    }

    const fragment = document.createDocumentFragment();
    links.forEach((link) => {
      const li = document.createElement("li");
      const isSelected = this.selectedLinkId === link.id;

      li.innerHTML = DOMPurify.sanitize(`
        <button
          class="link-modal__link btn-base bg-primary link-button hover-fourth"
          type="button"
          data-id="${link.id}"
          aria-pressed="${isSelected}"
        >
          <img class="btn-base__icon" src="${link.favicon}" alt="" onerror="this.src='${CONSTANTS.DEFAULTS.FAVICON}'">
          <span class="link-button__text">${link.title}</span>
          ${link.isFavorite ? `<span class="favorite-star">★</span>` : ""}
        </button>
      `);

      li.querySelector("button")?.addEventListener("click", () => this.selectLink(link.id));
      fragment.appendChild(li);
    });

    this.modalList.innerHTML = "";
    this.modalList.appendChild(fragment);
  }

  async selectLink(linkId) {
    if (this.isFormDirty && this.selectedLinkId !== linkId) {
      if (!confirm(CONSTANTS.ERRORS.UNSAVED_CHANGES)) return;
    }

    try {
      const link = await this.store.getById(linkId);
      if (!link) return;

      this.selectedLinkId = link.id;
      if (this.nameInput) this.nameInput.value = link.title;
      if (this.urlInput) this.urlInput.value = link.url;
      if (this.descInput) this.descInput.value = link.description || "";
      if (this.headerIcon) this.headerIcon.src = link.favicon;
      if (this.headerLink) this.headerLink.href = link.url;
      if (this.favoriteCheckbox) {
        this.favoriteCheckbox.checked = Boolean(link.isFavorite);
        this.favoriteCheckbox.setAttribute("aria-checked", this.favoriteCheckbox.checked);
      }

      this.originalFormData = {
        title: link.title,
        url: link.url,
        description: link.description || "",
      };
      this.isFormDirty = false;

      this.modalList?.querySelectorAll(".link-modal__link").forEach((btn) => {
        btn.setAttribute("aria-pressed", Number(btn.dataset.id) === link.id);
      });
    } catch (error) {
      console.error("링크 로드 실패:", error);
    }
  }

  clearForm() {
    this.selectedLinkId = null;
    this.isFormDirty = false;
    this.originalFormData = { title: "", url: "", description: "" };

    if (this.nameInput) this.nameInput.value = "";
    if (this.urlInput) this.urlInput.value = "";
    if (this.descInput) this.descInput.value = "";
    if (this.favoriteCheckbox) {
      this.favoriteCheckbox.checked = false;
      this.favoriteCheckbox.setAttribute("aria-checked", "false");
    }
    if (this.headerIcon) this.headerIcon.src = CONSTANTS.DEFAULTS.FAVICON;
    if (this.headerLink) this.headerLink.href = "#";

    this.modalList?.querySelectorAll(".link-modal__link").forEach((btn) => {
      btn.setAttribute("aria-pressed", "false");
    });
  }

  handleFormInput() {
    const current = {
      title: this.nameInput?.value.trim() || "",
      url: this.urlInput?.value.trim() || "",
      description: this.descInput?.value.trim() || "",
    };
    this.isFormDirty =
      current.title !== this.originalFormData.title ||
      current.url !== this.originalFormData.url ||
      current.description !== this.originalFormData.description;
  }

  openModal() {
    this.modalOverlay.classList.add("show");
    document.body.style.overflow = "hidden";

    if (this.app) {
      this.app.setAttribute("tabindex", "-1");
      this.app.setAttribute("aria-hidden", "true");
    }

    this.modalOverlay.setAttribute("aria-modal", "true");
    this.modalOverlay.setAttribute("role", "dialog");
    this.modalOverlay.setAttribute("aria-labelledby", "link-modal-title");

    this.focusTrap?.activate();
    this.focusTrap?.focusFirst();

    this.refreshModal();
  }

  closeModal() {
    if (this.isFormDirty && !confirm(CONSTANTS.ERRORS.UNSAVED_CHANGES)) {
      return;
    }

    this.modalOverlay.classList.remove("show");
    document.body.style.overflow = "auto";

    if (this.app) {
      this.app.removeAttribute("tabindex");
      this.app.removeAttribute("aria-hidden");
    }

    this.modalOverlay.removeAttribute("aria-modal");
    this.modalOverlay.removeAttribute("role");
    this.modalOverlay.removeAttribute("aria-labelledby");

    this.focusTrap?.deactivate();
    this.clearForm();
    this.moreButton?.focus();
  }

  async handleFormSubmit(e) {
    e.preventDefault();

    const url = this.urlInput?.value.trim();
    if (!url) {
      alert(CONSTANTS.ERRORS.URL_REQUIRED);
      this.urlInput?.focus();
      return;
    }

    const title = this.nameInput?.value.trim();
    const description = this.descInput?.value.trim() || "";
    const isFavorite = Boolean(this.favoriteCheckbox?.checked);

    showLinkSaveLoading();
    try {
      if (this.selectedLinkId) {
        await this.store.update(this.selectedLinkId, { url, title, description, isFavorite });
      } else {
        const created = await this.store.add({ url, title, description, isFavorite });
        this.selectedLinkId = created.id;
      }
      this.isFormDirty = false;
      await Promise.all([this.refreshModal(), this.refreshCards()]);
      if (this.selectedLinkId) {
        await this.selectLink(this.selectedLinkId);
      }
    } catch (error) {
      alert(error.message || CONSTANTS.ERRORS.LINK_ADD_FAILED);
    } finally {
      hideLinkSaveLoading();
    }
  }

  handleFormReset(e) {
    e.preventDefault();
    if (this.selectedLinkId) {
      this.selectLink(this.selectedLinkId);
    } else {
      this.clearForm();
    }
  }

  async handleRemoveSelected() {
    if (!this.selectedLinkId) {
      alert(CONSTANTS.ERRORS.SELECT_LINK_TO_DELETE);
      return;
    }

    if (!confirm(CONSTANTS.ERRORS.CONFIRM_DELETE)) return;

    try {
      await this.store.delete(this.selectedLinkId);
      this.clearForm();
      await Promise.all([this.refreshModal(), this.refreshCards()]);
    } catch (error) {
      alert(error.message || CONSTANTS.ERRORS.LINK_DELETE_FAILED);
    }
  }
}

// -------------------------------------------------------------
// 5. Entry Point
// -------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const store = new LinkStore();
  const controller = new LinkUIController(store);
  controller.init();
});
