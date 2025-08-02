const popoverTrigger = document.querySelector(".search-bar__popover__trigger");
const popover = document.querySelector(".search-bar__popover");

popover.setAttribute("hidden", "true");

popoverTrigger.addEventListener("click", () => {
  if (popover.hasAttribute("hidden")) {
    popover.removeAttribute("hidden");
  } else {
    popover.setAttribute("hidden", "true");
  }
});

document.addEventListener("click", (e) => {
  if (!popover.contains(e.target) && !popoverTrigger.contains(e.target)) {
    popover.setAttribute("hidden", "true");
  }
});

// ------------------------------------------------------------------------------
// 검색 엔진 변경 및 로고 변경 통합

// // 팝오버의 검색엔진 변경 버튼
// const popoverChangeGoogle = document.querySelector(
//   ".search-bar__popover__google__btn"
// );
// const popoverChangeYoutube = document.querySelector(
//   ".search-bar__popover__youtube__btn"
// );
// const popoverChangeNaver = document.querySelector(
//   ".search-bar__popover__naver__btn"
// );

// 검색바의 검색엔진 변경 버튼 (로고들)
const searchbarChangeGoogle = document.querySelector(
  ".search-bar__bar__change__google"
);
const searchbarChangeYoutube = document.querySelector(
  ".search-bar__bar__change__youtube"
);
const searchbarChangeNaver = document.querySelector(
  ".search-bar__bar__change__naver"
);

// 검색엔진 form
const searchForm = document.querySelector(".search-bar__form");

// 검색엔진 input
const searchInput = document.querySelector(".search-bar__input");

// 검색엔진 설정
const searchEngines = {
  google: {
    action: "https://www.google.com/search",
    name: "q",
    placeholder: "구글에서 검색",
    logo: searchbarChangeGoogle,
  },
  naver: {
    action: "https://search.naver.com/search.naver",
    name: "query",
    placeholder: "네이버에서 검색",
    logo: searchbarChangeNaver,
  },
  youtube: {
    action: "https://www.youtube.com/results",
    name: "search_query",
    placeholder: "유튜브에서 검색",
    logo: searchbarChangeYoutube,
  },
};

// 모든 로고 숨기기
function hideAllLogos() {
  [searchbarChangeGoogle, searchbarChangeYoutube, searchbarChangeNaver].forEach(
    (logo) => {
      logo.classList.add("hidden");
    }
  );
}

// 검색 엔진 변경 (폼 설정 + 로고 변경)
function changeSearchEngine(engine) {
  const config = searchEngines[engine];
  if (config) {
    // 폼 설정 변경
    searchForm.action = config.action;
    searchInput.name = config.name;
    searchInput.placeholder = config.placeholder;

    // 로고 변경
    hideAllLogos();
    config.logo.classList.remove("hidden");
  }
}

// 모든 검색 엔진 버튼에 통합 이벤트 리스너 추가
document.querySelectorAll("[data-engine]").forEach((el) => {
  el.addEventListener("click", () => {
    const engine = el.dataset.engine;
    changeSearchEngine(engine);
  });
});

// 기본값으로 구글 설정
window.addEventListener("DOMContentLoaded", () => {
  changeSearchEngine("google");
});
