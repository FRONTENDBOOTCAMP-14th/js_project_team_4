/**
 * @fileoverview 링크 관리 시스템 - 이벤트 기반 아키텍처로 구현된 북마크 관리 애플리케이션
 * @description 이 파일은 링크 북마크의 CRUD 작업, 검색/필터링, 키보드 네비게이션,
 *              성능 모니터링 등을 포함한 포괄적인 링크 관리 시스템을 제공합니다.
 */

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
    HOVER: "hover-fourth",
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

/**
 * URL 유효성 검증 및 정규화를 위한 validator 객체를 생성합니다.
 *
 * @function createURLValidator
 * @returns {Object} URL validator 객체
 * @returns {Function} returns.validate - URL 유효성을 검증하는 함수
 * @returns {Function} returns.normalize - URL을 정규화하는 함수
 *
 * @example
 * const validator = createURLValidator();
 * const result = validator.validate('example.com');
 * // { isValid: true, url: 'https://example.com' }
 */
function createURLValidator() {
  return {
    /**
     * URL의 유효성을 검증하고 정규화합니다.
     *
     * @method validate
     * @param {string} url - 검증할 URL 문자열
     * @returns {Object} 검증 결과 객체
     * @returns {boolean} returns.isValid - URL 유효성 여부
     * @returns {string|null} returns.url - 정규화된 URL (유효하지 않으면 null)
     *
     * @example
     * const validator = createURLValidator();
     * validator.validate('google.com'); // { isValid: true, url: 'https://google.com' }
     * validator.validate('invalid-url'); // { isValid: false, url: null }
     */
    validate(url) {
      try {
        const normalizedUrl = this.normalize(url);
        new URL(normalizedUrl);
        return { isValid: true, url: normalizedUrl };
      } catch {
        return { isValid: false, url: null };
      }
    },

    /**
     * URL을 정규화합니다. http/https 프로토콜이 없으면 https를 추가합니다.
     *
     * @method normalize
     * @param {string} url - 정규화할 URL 문자열
     * @returns {string} 정규화된 URL
     *
     * @example
     * const validator = createURLValidator();
     * validator.normalize('example.com'); // 'https://example.com'
     * validator.normalize('http://example.com'); // 'http://example.com'
     */
    normalize(url) {
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        return "https://" + url;
      }
      return url;
    },
  };
}

/**
 * 이벤트 퍼블리셔(옵저버 패턴)를 생성합니다.
 * 일반 구독, 일회성 구독, 에러 처리 등의 기능을 제공합니다.
 *
 * @function createEventPublisher
 * @returns {Object} 이벤트 퍼블리셔 객체
 * @returns {Function} returns.subscribe - 이벤트 구독 함수
 * @returns {Function} returns.once - 일회성 이벤트 구독 함수
 * @returns {Function} returns.unsubscribe - 구독 해제 함수
 * @returns {Function} returns.publish - 이벤트 발행 함수
 * @returns {Function} returns.clear - 리스너 초기화 함수
 *
 * @example
 * const publisher = createEventPublisher();
 * const unsubscribe = publisher.subscribe('test', (data) => console.log(data));
 * publisher.publish('test', 'Hello World');
 * unsubscribe(); // 구독 해제
 */
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
      if (listeners.has(event)) {
        listeners.get(event).forEach((callback) => {
          try {
            callback(data);
          } catch (error) {
            console.error(`이벤트 핸들러 에러 (${event}):`, error);
          }
        });
      }

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

/**
 * 이벤트 기반 링크 애플리케이션 상태 관리 객체를 생성합니다.
 * 선택된 링크 ID, 폼 상태, 원본 데이터 등을 관리하며 상태 변경 시 이벤트를 발행합니다.
 *
 * @function createLinkAppState
 * @returns {Object} 상태 관리 객체
 * @returns {number|null} returns.selectedLinkId - 현재 선택된 링크 ID
 * @returns {boolean} returns.isFormDirty - 폼이 수정되었는지 여부
 * @returns {Function} returns.setSelectedLink - 링크 선택 함수
 * @returns {Function} returns.clearSelectedLink - 링크 선택 해제 함수
 * @returns {Function} returns.setFormDirty - 폼 더티 상태 설정 함수
 * @returns {Function} returns.setOriginalFormData - 원본 폼 데이터 설정 함수
 * @returns {Function} returns.hasFormChanges - 폼 변경 여부 확인 함수
 * @returns {Function} returns.getOriginalFormData - 원본 폼 데이터 반환 함수
 * @returns {Function} returns.on - 이벤트 구독 함수
 * @returns {Function} returns.once - 일회성 이벤트 구독 함수
 * @returns {Function} returns.off - 이벤트 구독 해제 함수
 *
 * @example
 * const appState = createLinkAppState();
 *
 * // 링크 선택 이벤트 구독
 * appState.on('link-selected', ({ linkId }) => {
 *   console.log('선택된 링크:', linkId);
 * });
 *
 * // 링크 선택
 * appState.setSelectedLink(123);
 *
 * // 폼 상태 확인
 * if (appState.isFormDirty) {
 *   console.log('폼이 수정되었습니다.');
 * }
 */
function createLinkAppState() {
  let selectedLinkId = null;
  let isFormDirty = false;
  let originalFormData = {};
  let isModalOpen = false;
  let previousFocusedElement = null;

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

    get isModalOpen() {
      return isModalOpen;
    },

    setModalState(open, focusElement = null) {
      if (open && !isModalOpen) {
        // 모달 열기
        previousFocusedElement = document.activeElement;
        isModalOpen = true;
        eventPublisher.publish(CONSTANTS.EVENTS.MODAL_OPENED, { focusElement });
      } else if (!open && isModalOpen) {
        // 모달 닫기
        isModalOpen = false;
        eventPublisher.publish(CONSTANTS.EVENTS.MODAL_CLOSED, {
          previousFocusedElement,
        });
        previousFocusedElement = null;
      }
    },

    on: eventPublisher.subscribe,
    once: eventPublisher.once,
    off: eventPublisher.unsubscribe,
    publish: eventPublisher.publish,
  };
}

/**
 * IndexedDB를 사용한 데이터베이스 관리자를 생성합니다.
 * 링크 데이터의 저장, 조회, 인덱싱 등을 담당합니다.
 *
 * @function createDatabaseManager
 * @param {string} [dbName="LinkDB"] - 데이터베이스 이름
 * @param {number} [version=1] - 데이터베이스 버전
 * @returns {Object} 데이터베이스 관리 객체
 * @returns {Function} returns.init - 데이터베이스 초기화 함수
 * @returns {Function} returns.getStore - 객체 스토어 반환 함수
 *
 * @example
 * const dbManager = createDatabaseManager('MyLinkDB', 2);
 * await dbManager.init();
 * const { store } = await dbManager.getStore('links', 'readwrite');
 */
function createDatabaseManager(dbName = "LinkDB", version = 1) {
  let db = null;

  async function init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, version);

      request.onerror = () => {
        const error = new Error(CONSTANTS.ERRORS.DB_CONNECTION_FAILED);
        console.error("IndexedDB 연결 실패:", request.error);
        reject(error);
      };

      request.onsuccess = () => {
        db = request.result;
        console.log(`데이터베이스 "${dbName}" 연결 성공`);
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const dbInstance = event.target.result;
        console.log(
          `데이터베이스 업그레이드: v${event.oldVersion} → v${event.newVersion}`
        );

        if (!dbInstance.objectStoreNames.contains("links")) {
          const store = dbInstance.createObjectStore("links", {
            keyPath: "id",
            autoIncrement: true,
          });

          // URL 유니크 인덱스 생성
          store.createIndex("url", "url", { unique: true });

          // 즐겨찾기 인덱스 생성 (필터링 성능 향상)
          store.createIndex("isFavorite", "isFavorite", { unique: false });

          // 생성일 인덱스 (정렬 성능 향상)
          store.createIndex("createdAt", "createdAt", { unique: false });

          console.log("링크 스토어 및 인덱스 생성 완료");
        }
      };
    });
  }

  async function getStore(storeName, mode = "readonly") {
    if (!db) {
      console.log("데이터베이스가 초기화되지 않음. 자동 초기화 중...");
      await init();
    }

    try {
      const transaction = db.transaction([storeName], mode);
      const store = transaction.objectStore(storeName);
      return { transaction, store };
    } catch (error) {
      console.error(`스토어 "${storeName}" 접근 실패:`, error);
      throw new Error(
        `데이터베이스 스토어 접근에 실패했습니다: ${error.message}`
      );
    }
  }

  function isConnected() {
    return db !== null;
  }

  function close() {
    if (db) {
      db.close();
      db = null;
      console.log("데이터베이스 연결 종료");
    }
  }

  return {
    init,
    getStore,
    isConnected,
    close,
  };
}

/**
 * 이벤트 기반 링크 관리자를 생성합니다.
 * CRUD 작업, 이벤트 발행, 에러 처리 등을 담당합니다.
 *
 * @function createLinkManager
 * @returns {Object} 링크 관리 API 객체
 * @returns {Function} returns.init - 관리자 초기화 함수
 * @returns {Function} returns.addLink - 링크 추가 함수
 * @returns {Function} returns.getAllLinks - 모든 링크 조회 함수
 * @returns {Function} returns.getFavoriteLinks - 즐겨찾기 링크 조회 함수
 * @returns {Function} returns.updateLink - 링크 업데이트 함수
 * @returns {Function} returns.deleteLink - 링크 삭제 함수
 * @returns {Function} returns.toggleFavorite - 즐겨찾기 토글 함수
 * @returns {Function} returns.getById - ID로 링크 조회 함수
 * @returns {Function} returns.getByUrl - URL로 링크 조회 함수
 * @returns {Function} returns.extractDomainName - 도메인명 추출 함수
 * @returns {Function} returns.getFaviconUrl - 파비콘 URL 생성 함수
 * @returns {Function} returns.on - 이벤트 구독 함수
 * @returns {Function} returns.once - 일회성 이벤트 구독 함수
 * @returns {Function} returns.off - 이벤트 구독 해제 함수
 * @returns {Function} returns.publish - 이벤트 발행 함수
 */
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

      if (existing.url && existing.url !== updates.url) {
        updates.favicon = getFaviconUrl(updates.url);
      }

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
      const urlObj = new URL(url);
      const domain = urlObj.hostname;

      // Google의 favicon 서비스 사용 (third-party cookie 문제 방지)
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
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
    publish: eventPublisher.publish,
  };

  return api;
}

/**
 * 모달 내부에서 포커스 트랩을 생성하는 유틸리티 함수입니다.
 * 탭 키 네비게이션이 모달 내부에서만 순환하도록 제한합니다.
 *
 * @function createFocusTrap
 * @param {Element} element - 포커스를 가둘 컨테이너 요소
 * @returns {Object} 포커스 트랩 제어 객체
 * @returns {Function} returns.activate - 포커스 트랩 활성화
 * @returns {Function} returns.deactivate - 포커스 트랩 비활성화
 * @returns {Function} returns.focusFirstElement - 첫 번째 포커스 가능한 요소로 포커스 이동
 */
function createFocusTrap(element) {
  /** @type {string} 포커스 가능한 요소들의 CSS 선택자 */
  const focusableElementsSelector = `
    a[href]:not([disabled]),
    button:not([disabled]),
    textarea:not([disabled]),
    input[type="text"]:not([disabled]),
    input[type="radio"]:not([disabled]),
    input[type="checkbox"]:not([disabled]),
    select:not([disabled]),
    [tabindex]:not([tabindex="-1"]):not([disabled])
  `;

  let isActive = false;
  let keydownHandler = null;

  /**
   * 컨테이너 내부의 포커스 가능한 모든 요소를 반환합니다.
   *
   * @returns {NodeList} 포커스 가능한 요소들
   */
  function getFocusableElements() {
    return element.querySelectorAll(focusableElementsSelector);
  }

  /**
   * 키보드 이벤트 핸들러입니다. Tab 키 순환을 제어합니다.
   *
   * @param {KeyboardEvent} e - 키보드 이벤트
   */
  function handleKeydown(e) {
    if (e.key !== "Tab") return;

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      // Shift + Tab: 역방향 순환
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: 정방향 순환
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }

  return {
    /**
     * 포커스 트랩을 활성화합니다.
     *
     * @method activate
     *
     * @example
     * focusTrap.activate();
     */
    activate() {
      if (isActive) return;

      isActive = true;
      keydownHandler = handleKeydown;
      document.addEventListener("keydown", keydownHandler);

      console.log("포커스 트랩 활성화됨");
    },

    /**
     * 포커스 트랩을 비활성화합니다.
     *
     * @method deactivate
     *
     * @example
     * focusTrap.deactivate();
     */
    deactivate() {
      if (!isActive) return;

      isActive = false;
      if (keydownHandler) {
        document.removeEventListener("keydown", keydownHandler);
        keydownHandler = null;
      }

      console.log("포커스 트랩 비활성화됨");
    },

    /**
     * 컨테이너 내 첫 번째 포커스 가능한 요소로 포커스를 이동합니다.
     *
     * @method focusFirstElement
     *
     * @example
     * focusTrap.focusFirstElement();
     */
    focusFirstElement() {
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    },

    /**
     * 현재 포커스 트랩 활성화 상태를 반환합니다.
     *
     * @method isActive
     * @returns {boolean} 활성화 상태
     */
    isActive() {
      return isActive;
    },
  };
}

/**
 * UI 이벤트 핸들러들을 관리하는 객체를 생성합니다.
 * 링크 관련 이벤트에 대한 UI 업데이트를 담당합니다.
 *
 * @function createUIEventHandlers
 * @returns {Object} UI 이벤트 핸들러 객체
 * @returns {Function} returns.init - 초기화 함수
 * @returns {Function} returns.clearForm - 폼 초기화 함수
 * @returns {Function} returns.refreshUI - UI 새로고침 함수
 */
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
    if (
      operation === "add" ||
      operation === "update" ||
      operation === "delete" ||
      operation === "loadAll" ||
      operation === "loadFavorites"
    ) {
      showLinkSaveLoading();
    }
  }

  function handleLoadingEnded({ operation }) {
    if (
      operation === "add" ||
      operation === "update" ||
      operation === "delete" ||
      operation === "loadAll" ||
      operation === "loadFavorites"
    ) {
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
      btn.setAttribute("aria-pressed", false);
    });
    const selectedButton = document.querySelector(
      `.link-modal__link[data-id="${link.id}"]`
    );
    if (selectedButton) {
      selectedButton.classList.add(CONSTANTS.CSS.SELECTED);
      selectedButton.setAttribute("aria-pressed", true);
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
      .forEach((btn) => {
        btn.classList.remove(CONSTANTS.CSS.SELECTED);
        btn.setAttribute("aria-pressed", false);
      });
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
        a.className = `link-card__link ${CONSTANTS.CSS.BTN_BASE} ${CONSTANTS.CSS.BG_PRIMARY} ${CONSTANTS.CSS.HOVER}`;

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
          <button class="link-modal__link ${CONSTANTS.CSS.BTN_BASE} ${CONSTANTS.CSS.BG_PRIMARY} ${CONSTANTS.CSS.LINK_BUTTON} ${CONSTANTS.CSS.HOVER}" type="button" data-id="${link.id}">
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

/**
 * 링크 매니저 인스턴스를 초기화하고 반환합니다.
 * 싱글톤 패턴으로 구현되어 있어 중복 초기화를 방지합니다.
 *
 * @async
 * @function initLinkManager
 * @returns {Promise<Object>} 초기화된 링크 매니저 인스턴스
 */
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

/**
 * 전역 링크 매니저 인스턴스를 반환합니다.
 *
 * @function getLinkManager
 * @returns {Object|null} 링크 매니저 인스턴스 (초기화되지 않은 경우 null)
 */
function getLinkManager() {
  return linkManagerInstance;
}

/**
 * 전역 링크 앱 상태 인스턴스를 반환합니다.
 *
 * @function getLinkAppState
 * @returns {Object|null} 링크 앱 상태 인스턴스 (초기화되지 않은 경우 null)
 */
function getLinkAppState() {
  return linkAppState;
}

/**
 * 전역 UI 이벤트 핸들러 인스턴스를 반환합니다.
 *
 * @function getUIEventHandlers
 * @returns {Object|null} UI 이벤트 핸들러 인스턴스 (초기화되지 않은 경우 null)
 */
function getUIEventHandlers() {
  return uiEventHandlers;
}

/**
 * 링크 카드 컴포넌트를 초기화하고 모달 열기 기능을 설정합니다.
 * 접근성을 고려한 모달 열기와 초기 데이터 로드를 수행합니다.
 *
 * @function initLinkCard
 * @param {Element} linkCardElement - 링크 카드 요소
 * @param {Element} linkModalOverlay - 링크 모달 오버레이 요소
 */
function initLinkCard(linkCardElement, linkModalOverlay) {
  const moreButton = linkCardElement.querySelector(
    CONSTANTS.SELECTORS.MORE_BUTTON
  );
  const state = getLinkAppState();

  if (moreButton) {
    moreButton.addEventListener("click", () => {
      linkModalOverlay.classList.add(CONSTANTS.CSS.SHOW);
      document.body.style.overflow = "hidden";

      // 백그라운드 앱 접근성 제한
      if (app) {
        app.setAttribute("tabindex", "-1");
        app.setAttribute("aria-hidden", "true");
      }

      // 상태 업데이트 및 이벤트 발행
      const firstFocusableElement = linkModalOverlay.querySelector(
        "input, button, textarea, select, a[href]"
      );
      state.setModalState(true, firstFocusableElement);

      // 링크 목록 로드
      const linkManager = getLinkManager();
      if (linkManager) {
        linkManager.getAllLinks();
      }
    });

    // 접근성: 버튼에 적절한 레이블 설정
    moreButton.setAttribute("aria-label", "링크 관리 모달 열기");
  }

  // 초기 즐겨찾기 로드
  const linkManager = getLinkManager();
  if (linkManager) {
    linkManager.getFavoriteLinks();
  }
}

/**
 * 링크 모달의 접근성과 포커스 관리를 포함한 초기화를 수행합니다.
 * 탭 트랩, ARIA 속성, 키보드 네비게이션 등을 설정합니다.
 *
 * @function initLinkModal
 * @param {Element} linkModalOverlay - 링크 모달 오버레이 요소
 */
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
  const closeButton = linkModalOverlay.querySelector(
    CONSTANTS.SELECTORS.LINK_MODAL_CLOSE
  );

  const state = getLinkAppState();
  const uiHandlers = getUIEventHandlers();

  // 포커스 트랩 생성
  const focusTrap = createFocusTrap(linkModalOverlay);

  // 모달 상태 이벤트 리스너
  state.on(CONSTANTS.EVENTS.MODAL_OPENED, ({ focusElement }) => {
    // 접근성 속성 설정
    linkModalOverlay.setAttribute("aria-modal", "true");
    linkModalOverlay.setAttribute("role", "dialog");
    linkModalOverlay.setAttribute("aria-labelledby", "link-modal-title");

    // 포커스 트랩 활성화
    focusTrap.activate();

    // 초기 포커스 설정
    if (focusElement && linkModalOverlay.contains(focusElement)) {
      focusElement.focus();
    } else {
      // 기본적으로 첫 번째 입력 필드에 포커스
      const firstInput = linkModalOverlay.querySelector(
        "input, button, textarea, select"
      );
      if (firstInput) {
        firstInput.focus();
      } else {
        focusTrap.focusFirstElement();
      }
    }
  });

  state.on(CONSTANTS.EVENTS.MODAL_CLOSED, ({ previousFocusedElement }) => {
    // 접근성 속성 제거
    linkModalOverlay.removeAttribute("aria-modal");
    linkModalOverlay.removeAttribute("role");
    linkModalOverlay.removeAttribute("aria-labelledby");

    // 포커스 트랩 비활성화
    focusTrap.deactivate();

    // 이전 포커스 복원
    if (
      previousFocusedElement &&
      typeof previousFocusedElement.focus === "function"
    ) {
      previousFocusedElement.focus();
    }
  });

  // 즐겨찾기 버튼 접근성 설정
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

  // 모달 닫기 이벤트 (개선된 버전)
  function closeModal() {
    if (state.isFormDirty && !confirm(CONSTANTS.ERRORS.UNSAVED_CHANGES)) {
      return false;
    }

    linkModalOverlay.classList.remove(CONSTANTS.CSS.SHOW);
    document.body.style.overflow = "auto";

    // 앱 컨테이너 접근성 복원
    if (app) {
      app.removeAttribute("tabindex");
      app.removeAttribute("aria-hidden");
    }

    state.setModalState(false);
    uiHandlers.clearForm();
    return true;
  }

  // 클릭으로 모달 닫기
  linkModalOverlay.addEventListener("click", (e) => {
    if (e.target === linkModalOverlay) {
      closeModal();
    }
  });

  // 닫기 버튼
  if (closeButton) {
    closeButton.addEventListener("click", closeModal);
  }

  // ESC 키로 모달 닫기
  linkModalOverlay.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeModal();
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
      // 새 링크 추가 시 URL 입력 필드로 포커스
      const urlInput = linkModalOverlay.querySelector(
        CONSTANTS.SELECTORS.URL_INPUT
      );
      if (urlInput) {
        urlInput.focus();
      }
    });
  }

  if (removeButton) {
    removeButton.textContent = "제거";
    removeButton.addEventListener("click", handleRemoveSelected);
  }
}

/**
 * 폼 입력 변경을 감지하고 더티 상태를 업데이트합니다.
 * 이벤트 기반으로 작동하여 상태 변경 시 자동으로 관련 이벤트를 발행합니다.
 *
 * @function handleFormChange
 *
 * @example
 * // input 요소에 이벤트 리스너로 등록
 * input.addEventListener('input', handleFormChange);
 */
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

/**
 * 폼 제출을 처리합니다. 링크 추가 또는 업데이트를 수행합니다.
 * 이벤트 기반으로 작동하여 성공/실패 시 자동으로 UI가 업데이트됩니다.
 *
 * @async
 * @function handleFormSubmit
 * @param {Event} e - 폼 제출 이벤트
 *
 * @example
 * form.addEventListener('submit', handleFormSubmit);
 */
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

/**
 * 폼 리셋을 처리합니다. 원본 데이터로 폼을 복원합니다.
 *
 * @async
 * @function handleFormReset
 * @param {Event} e - 폼 리셋 이벤트
 *
 * @example
 * form.addEventListener('reset', handleFormReset);
 */
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

/**
 * 선택된 링크를 삭제합니다.
 * 사용자 확인을 거쳐 안전하게 삭제를 수행합니다.
 *
 * @async
 * @function handleRemoveSelected
 *
 * @example
 * removeButton.addEventListener('click', handleRemoveSelected);
 */
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

/**
 * 고급 이벤트 기반 기능들을 생성합니다.
 * 키보드 단축키, 자동 저장, 실시간 검증, 드래그 앤 드롭 등을 포함합니다.
 *
 * @function createAdvancedEventFeatures
 * @returns {Object} 고급 기능 제어 객체
 * @returns {Function} returns.setupKeyboardShortcuts - 키보드 단축키 설정
 * @returns {Function} returns.setupAutoSave - 자동 저장 기능 설정
 * @returns {Function} returns.setupRealTimeValidation - 실시간 검증 설정
 */
function createAdvancedEventFeatures() {
  const linkManager = getLinkManager();
  const appState = getLinkAppState();

  function setupKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      // 모달이 열려있을 때만 모달 관련 단축키 처리
      if (appState.isModalOpen) {
        // Ctrl+S: 폼 저장
        if (e.ctrlKey && e.key === "s") {
          e.preventDefault();
          const form = document.querySelector(
            CONSTANTS.SELECTORS.LINK_MODAL_FORM
          );
          if (form) {
            form.dispatchEvent(new Event("submit", { bubbles: true }));
          }
          return;
        }

        // Ctrl+Enter: 빠른 저장 후 새 링크 추가 모드
        if (e.ctrlKey && e.key === "Enter") {
          e.preventDefault();
          const form = document.querySelector(
            CONSTANTS.SELECTORS.LINK_MODAL_FORM
          );
          if (form) {
            form.dispatchEvent(new Event("submit", { bubbles: true }));
            // 저장 후 새 링크 추가 모드로 전환
            setTimeout(() => {
              const addButton = document.querySelector(
                CONSTANTS.SELECTORS.ADD_BUTTON
              );
              if (addButton) {
                addButton.click();
              }
            }, 100);
          }
          return;
        }

        // ESC: 모달 닫기 (이미 모달에서 처리하지만 전역에서도 처리)
        if (e.key === "Escape") {
          e.preventDefault();
          const modal = document.querySelector(
            CONSTANTS.SELECTORS.LINK_MODAL_OVERLAY
          );
          if (modal && modal.classList.contains(CONSTANTS.CSS.SHOW)) {
            const closeButton = modal.querySelector(
              CONSTANTS.SELECTORS.LINK_MODAL_CLOSE
            );
            if (closeButton) {
              closeButton.click();
            }
          }
          return;
        }
      }

      // 전역 단축키 (모달이 닫혀있을 때)
      if (!appState.isModalOpen) {
        // Ctrl+L: 링크 관리 모달 열기
        if (e.ctrlKey && e.key === "l") {
          e.preventDefault();
          const moreButton = document.querySelector(
            CONSTANTS.SELECTORS.MORE_BUTTON
          );
          if (moreButton) {
            moreButton.click();
          }
          return;
        }
      }
    });

    console.log("키보드 단축키 설정 완료:", {
      "Ctrl+S": "폼 저장",
      "Ctrl+Enter": "저장 후 새 링크 추가",
      Escape: "모달 닫기",
      "Ctrl+L": "링크 관리 열기 (전역)",
    });
  }

  function setupAutoSave() {
    /** @type {number|null} 자동 저장 타이머 ID */
    let autoSaveTimeout = null;

    appState.on(CONSTANTS.EVENTS.FORM_DIRTY_CHANGED, ({ isDirty }) => {
      if (isDirty && appState.selectedLinkId) {
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(async () => {
          const form = document.querySelector(
            CONSTANTS.SELECTORS.LINK_MODAL_FORM
          );
          if (form && appState.isFormDirty) {
            console.log("자동 저장 실행...");
            try {
              const nameInput = document.querySelector(
                CONSTANTS.SELECTORS.NAME_INPUT
              );
              const urlInput = document.querySelector(
                CONSTANTS.SELECTORS.URL_INPUT
              );
              const descInput = document.querySelector(
                CONSTANTS.SELECTORS.DESC_INPUT
              );
              const favoriteButton = document.querySelector(
                CONSTANTS.SELECTORS.FAVORITE_CHECKBOX
              );

              const linkData = {
                title: nameInput?.value.trim() || "",
                url: urlInput?.value.trim() || "",
                description: descInput?.value.trim() || "",
                isFavorite: favoriteButton?.checked || false,
              };

              if (appState.selectedLinkId) {
                await linkManager.updateLink(appState.selectedLinkId, linkData);
                console.log("자동 저장 완료");
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

  /**
   * 실시간 URL 검증 기능을 설정합니다.
   * URL 입력 시 0.5초 후 유효성을 검사하고 시각적 피드백을 제공합니다.
   *
   * @method setupRealTimeValidation
   */
  function setupRealTimeValidation() {
    const urlInput = document.querySelector(CONSTANTS.SELECTORS.URL_INPUT);
    if (urlInput) {
      /** @type {number|null} 검증 지연 타이머 ID */
      let validationTimeout = null;

      urlInput.addEventListener("input", (e) => {
        clearTimeout(validationTimeout);
        validationTimeout = setTimeout(() => {
          const url = e.target.value.trim();
          if (url) {
            const validator = createURLValidator();
            const result = validator.validate(url);

            e.target.classList.toggle("invalid", !result.isValid);
            e.target.classList.toggle("valid", result.isValid);

            // 접근성: 스크린 리더를 위한 상태 알림
            e.target.setAttribute(
              "aria-invalid",
              result.isValid ? "false" : "true"
            );

            if (!result.isValid) {
              e.target.setAttribute("aria-describedby", "url-error-message");
            } else {
              e.target.removeAttribute("aria-describedby");
            }
          } else {
            e.target.classList.remove("invalid", "valid");
            e.target.setAttribute("aria-invalid", "false");
            e.target.removeAttribute("aria-describedby");
          }
        }, 500);
      });
    }
  }

  return {
    setupKeyboardShortcuts,
    setupAutoSave,
    setupRealTimeValidation,
  };
}

/**
 * 애플리케이션 초기화 함수입니다.
 * DOM 로드 완료 후 모든 컴포넌트를 순차적으로 초기화합니다.
 *
 * @async
 * @function initializeApplication
 *
 * @example
 * // 자동으로 DOMContentLoaded 이벤트에서 실행됩니다.
 * // 수동 실행 시:
 * await initializeApplication();
 */
document.addEventListener("DOMContentLoaded", async () => {
  try {
    console.log("🚀 애플리케이션 초기화 시작...");

    // 1. 핵심 컴포넌트 초기화
    console.log("📦 LinkManager 초기화 중...");
    const linkManager = await initLinkManager();
    console.log("✅ LinkManager 초기화 완료");

    // 2. DOM 요소 확인
    const linkCardElement = document.querySelector(".link-card");
    const linkModalOverlay = document.getElementById("linkModalOverlay");

    console.log("🔍 DOM 요소 확인:", {
      linkCardElement: !!linkCardElement,
      linkModalOverlay: !!linkModalOverlay,
      app: !!app,
    });

    // 3. 필수 DOM 요소 검증
    if (!linkCardElement || !linkModalOverlay) {
      throw new Error(
        `필수 DOM 요소가 누락되었습니다: ${
          !linkCardElement ? "link-card " : ""
        }${!linkModalOverlay ? "linkModalOverlay " : ""}`
      );
    }

    // 4. DOM 이벤트 핸들러 초기화
    console.log("🎯 DOM 이벤트 핸들러 초기화 중...");
    initLinkCard(linkCardElement, linkModalOverlay);
    initLinkModal(linkModalOverlay);
    console.log("✅ DOM 이벤트 핸들러 초기화 완료");

    // 5. 고급 기능 초기화
    console.log("⚡ 고급 기능 초기화 중...");
    const advancedFeatures = createAdvancedEventFeatures();
    if (advancedFeatures) {
      advancedFeatures.setupKeyboardShortcuts();
      advancedFeatures.setupAutoSave();
      advancedFeatures.setupRealTimeValidation();
      console.log("✅ 고급 기능 초기화 완료");
    }

    // 7. 접근성 개선사항 적용
    console.log("♿ 접근성 기능 설정 중...");
    setupAccessibilityFeatures();
    console.log("✅ 접근성 기능 설정 완료");

    console.log("🎉 Link Manager가 성공적으로 초기화되었습니다!");

    // 초기화 완료 이벤트 발행 (다른 스크립트에서 사용 가능)
    window.dispatchEvent(
      new CustomEvent("linkManagerReady", {
        detail: { linkManager, timestamp: new Date().toISOString() },
      })
    );
  } catch (error) {
    console.error("❌ Link Manager 초기화 실패:", error);
    console.error("📍 에러 스택:", error.stack);

    // 사용자 친화적 에러 메시지
    let errorMessage = "애플리케이션 초기화에 실패했습니다.";
    if (error.message.includes("IndexedDB")) {
      errorMessage += "\n💾 브라우저 저장소에 문제가 있습니다.";
    } else if (error.message.includes("DOM")) {
      errorMessage += "\n🏗️ 페이지 구조에 문제가 있습니다.";
    } else if (error.message.includes("필수 DOM 요소")) {
      errorMessage += "\n🔍 필요한 페이지 요소를 찾을 수 없습니다.";
    }
    errorMessage +=
      "\n\n🔄 페이지를 새로고침하거나 브라우저 콘솔을 확인해주세요.";

    alert(errorMessage);

    // 에러 리포팅 (필요시)
    window.dispatchEvent(
      new CustomEvent("linkManagerError", {
        detail: { error, timestamp: new Date().toISOString() },
      })
    );
  }
});

/**
 * 추가 접근성 기능을 설정합니다.
 * 스크린 리더, 키보드 네비게이션 등을 개선합니다.
 *
 * @function setupAccessibilityFeatures
 *
 * @example
 * setupAccessibilityFeatures();
 */
function setupAccessibilityFeatures() {
  // 메인 앱 컨테이너에 랜드마크 역할 설정
  if (app) {
    app.setAttribute("role", "main");
    app.setAttribute("aria-label", "라이프코드 대시보드");
  }

  // 링크 모달에 적절한 레이블 추가
  const modal = document.getElementById("linkModalOverlay");
  if (modal) {
    // 모달 제목 ID 설정
    const modalTitle = modal.querySelector(".link-modal__title");
    if (modalTitle && !modalTitle.id) {
      modalTitle.id = "link-modal-title";
    }
  }

  // 에러 메시지 컨테이너 추가 (스크린 리더용)
  const errorContainer = document.createElement("div");
  errorContainer.id = "error-announcements";
  errorContainer.setAttribute("aria-live", "polite");
  errorContainer.setAttribute("aria-atomic", "true");
  errorContainer.style.position = "absolute";
  errorContainer.style.left = "-10000px";
  errorContainer.style.width = "1px";
  errorContainer.style.height = "1px";
  errorContainer.style.overflow = "hidden";
  document.body.appendChild(errorContainer);

  // URL 입력 필드에 에러 메시지 컨테이너 추가
  const urlInput = document.querySelector(CONSTANTS.SELECTORS.URL_INPUT);
  if (urlInput && !document.getElementById("url-error-message")) {
    const errorMsg = document.createElement("div");
    errorMsg.id = "url-error-message";
    errorMsg.className = "error-message";
    errorMsg.style.display = "none";
    errorMsg.textContent = "유효한 URL을 입력해주세요.";
    urlInput.parentNode.insertBefore(errorMsg, urlInput.nextSibling);
  }

  console.log("접근성 기능 설정:", {
    mainLandmark: !!app?.getAttribute("role"),
    errorAnnouncements: !!document.getElementById("error-announcements"),
    modalLabels: !!document.getElementById("link-modal-title"),
  });
}

// 개발자 도구용 전역 API
if (typeof window !== "undefined") {
  window.LinkManagerDebug = {
    getLinkManager,
    getLinkAppState,
    getUIEventHandlers,
    EVENTS: CONSTANTS.EVENTS,

    logAllEvents() {
      const manager = getLinkManager();
      Object.values(CONSTANTS.EVENTS).forEach((event) => {
        manager.on(event, (data) => {
          console.log(`🎯 Event: ${event}`, data);
        });
      });
    },
  };
}
