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
// 검색 엔진 변경

// 팝오버의 검색엔진 변경 버튼
const popoverChangeGoogle = document.querySelector(
  ".search-bar__popover__google__btn"
);
const popoverChangeYoutube = document.querySelector(
  ".search-bar__popover__youtube__btn"
);
const popoverChangeNaver = document.querySelector(
  ".search-bar__popover__naver__btn"
);

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

// 각 검색엔진 별 인풋창
const inputChangeGoogle = document.querySelector(
  ".search-bar__search__change__input__google"
);
const inputChangeYoutube = document.querySelector(
  ".search-bar__search__change__input__youtube"
);
const inputChangeNaver = document.querySelector(
  ".search-bar__search__change__input__naver"
);

// 기본값으로 구글창만 보이고, 유튜브와 네이버를 가림
window.addEventListener("DOMContentLoaded", () => {
  [
    inputChangeYoutube,
    inputChangeNaver,
    searchbarChangeYoutube,
    searchbarChangeNaver,
  ].forEach((form) => {
    form.classList.add("hidden");
  });
});

// 팝오버 각 검색엔진 클릭시, 해당하는 검색 엔진 로고와 인풋창으로 변경
function showOnly(inputToShow, imageToShow) {
  [inputChangeGoogle, inputChangeYoutube, inputChangeNaver].forEach((input) => {
    input.classList.add("hidden");
    input.style.display = "none";
  });

  [searchbarChangeGoogle, searchbarChangeYoutube, searchbarChangeNaver].forEach(
    (image) => {
      image.classList.add("hidden");
      image.style.display = "none";
    }
  );

  inputToShow.classList.remove("hidden");
  inputToShow.style.display = "block";

  imageToShow.classList.remove("hidden");
  imageToShow.style.display = "block";
}

popoverChangeGoogle.addEventListener("click", () =>
  showOnly(inputChangeGoogle, searchbarChangeGoogle)
);
popoverChangeYoutube.addEventListener("click", () =>
  showOnly(inputChangeYoutube, searchbarChangeYoutube)
);
popoverChangeNaver.addEventListener("click", () =>
  showOnly(inputChangeNaver, searchbarChangeNaver)
);
