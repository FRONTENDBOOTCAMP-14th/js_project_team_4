const popoverTrigger = document.querySelector(".search-bar__popover__trigger")
const popover = document.querySelector(".search-bar__popover")

popover.setAttribute("hidden", "true")

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
})

// ------------------------------------------------------------------------------
// 검색 엔진 변경

// 팝오버의 검색엔진 변경 버튼
const popoverChangeGoogle = document.querySelector(
  ".search-bar__popover__google__btn"
)
const popoverChangeYoutube = document.querySelector(
  ".search-bar__popover__youtube__btn"
)
const popoverChangeNaver = document.querySelector(
  ".search-bar__popover__naver__btn"
)

// 검색바의 검색엔진 변경 버튼
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
const searchForm = document.querySelector('.search-bar__form')

// 검색엔진 input
const searchInput = document.querySelector('.search-bar__input')


// 검색엔진 form
const searchEngines = {
  google: {
    action: 'https://www.google.com/search',
    name: 'q',
    placeholder: '구글에서 검색',
  },
  naver: {
    action: 'https://search.naver.com/search.naver',
    name: 'query',
    placeholder: '네이버에서 검색',
  },
  youtube: {
    action: 'https://www.youtube.com/results',
    name: 'search_query',
    placeholder: '유튜브에서 검색',
  }
}

// 검색 form 변경
document.querySelectorAll('[data-engine]').forEach(el => {
  el.addEventListener('click', () => {
    const engine = el.dataset.engine;
    const config = searchEngines[engine];
    if (config) {
      searchForm.action = config.action;
      searchInput.name = config.name;
      searchInput.placeholder = config.placeholder
    }
  })
})

// 기본값으로 구글 로고만 보이게 (네이버, 유튜브 아이콘 가림)
window.addEventListener('DOMContentLoaded', () => {
  [
   searchbarChangeYoutube, searchbarChangeNaver
  ].forEach(form => {
    form.classList.add('hidden')
  })
})

// 팝오버에서 각 검색엔진을 클릭 시, 로고 변경
function showOnly(imageToShow) {
  [
    searchbarChangeGoogle, searchbarChangeYoutube, searchbarChangeNaver
  ].forEach(image => {
    image.classList.add('hidden')
  })
   imageToShow.classList.remove('hidden')
}
popoverChangeGoogle.addEventListener('click', () => showOnly(searchbarChangeGoogle))
popoverChangeYoutube.addEventListener('click', () => showOnly(searchbarChangeYoutube))
popoverChangeNaver.addEventListener('click', () => showOnly(searchbarChangeNaver))
