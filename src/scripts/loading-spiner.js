// 로딩 스피너
function showWeatherLoading() {
  const weatherContainer = document.querySelector(".weather-tab");
  if (weatherContainer) {
    weatherContainer.classList.add("loading");
    console.log("로딩 스피너 표시");
  } else {
    console.error("weather-tab 요소를 찾을 수 없습니다.");
  }
}

function hideWeatherLoading() {
  const weatherContainer = document.querySelector(".weather-tab");
  if (weatherContainer) {
    weatherContainer.classList.remove("loading");
    console.log("로딩 스피너 숨김");
  }
}

function showLinkSaveLoading() {
  hideLinkSaveLoading();

  const loadingOverlay = document.createElement("div");
  loadingOverlay.id = "link-save-loading";
  loadingOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
  `;

  const spinner = document.createElement("span");
  spinner.className = "loader";

  loadingOverlay.appendChild(spinner);
  document.body.appendChild(loadingOverlay);

  console.log("링크 저장 로딩 스피너 표시");
}

function hideLinkSaveLoading() {
  const loadingOverlay = document.getElementById("link-save-loading");
  if (loadingOverlay) {
    loadingOverlay.remove();
    console.log("링크 저장 로딩 스피너 숨김");
  }
}

export {
  showWeatherLoading,
  hideWeatherLoading,
  showLinkSaveLoading,
  hideLinkSaveLoading,
};
