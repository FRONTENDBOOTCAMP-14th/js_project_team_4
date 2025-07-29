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

export { showWeatherLoading, hideWeatherLoading };
