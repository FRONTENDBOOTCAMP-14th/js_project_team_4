import { hideWeatherLoading, showWeatherLoading } from "./loading-spiner.js";
import { fetchWeatherData, formatCurrentDate } from "./weather-api.js";

/**
 * 날씨 탭의 UI 렌더링, 패널 제어, 사용자 입력을 관리하는 컨트롤러 클래스
 */
class WeatherUIController {
  constructor() {
    this.container = document.querySelector(".weather-tab");
    this.temp = document.querySelector(".weather-tab__temp");
    this.location = document.querySelector(".weather-tab__location");
    this.date = document.querySelector(".weather-tab__date");
    this.icon = document.querySelector(".weather-tab__icon");
    this.desc = document.querySelector(".weather-tab__desc-text");

    const weatherCards = document.querySelectorAll(".weather-tab__card");
    this.tempMax = weatherCards[0]?.querySelector("p:nth-child(2)");
    this.tempMin = weatherCards[1]?.querySelector("p:nth-child(2)");
    this.humidity = weatherCards[2]?.querySelector("p:nth-child(2)");
    this.cloudy = weatherCards[3]?.querySelector("p:nth-child(2)");
    this.wind = weatherCards[4]?.querySelector("p:nth-child(2)");

    this.forecastCards = document.querySelectorAll(
      ".weather-tab__forecast-card"
    );

    this.panel = document.querySelector(".weather-tab__panel");
    this.searchForm = document.querySelector(".weather-tab__search-form");
    this.searchInput = document.querySelector(".weather-tab__search-input");
    this.clearBtn = document.getElementById("clear-btn");
    this.searchIcon = document.getElementById("search-img");

    this.currentTimezone = null;
    this.realTimeInterval = null;
    this.refreshInterval = null;
  }

  init() {
    if (!this.container) return;

    if (this.clearBtn) {
      this.clearBtn.style.display = "none";
    }

    this.bindEvents();
    this.getUserLocation();
    this.startAutoRefresh();
  }

  bindEvents() {
    // 패널 열고 닫기 (검색창 내부 클릭 시 토글 방지)
    this.container.addEventListener("click", (e) => {
      if (
        !this.panel ||
        (this.searchForm && this.searchForm.contains(e.target))
      ) {
        return;
      }
      const isVisible = this.panel.style.display === "flex";
      this.panel.style.display = isVisible ? "none" : "flex";
    });

    // 검색창 입력 상태에 따른 아이콘 토글
    this.searchInput?.addEventListener("input", () => {
      const value = this.searchInput.value.trim();
      if (value !== "") {
        if (this.clearBtn) this.clearBtn.style.display = "block";
        if (this.searchIcon) this.searchIcon.style.display = "none";
      } else {
        if (this.clearBtn) this.clearBtn.style.display = "none";
        if (this.searchIcon) this.searchIcon.style.display = "block";
      }
    });

    // 검색창 지우기 버튼
    this.clearBtn?.addEventListener("click", () => {
      if (!this.searchInput) return;
      this.searchInput.value = "";
      if (this.clearBtn) this.clearBtn.style.display = "none";
      if (this.searchIcon) this.searchIcon.style.display = "block";
      this.searchInput.focus();
    });

    // 검색 폼 제출
    this.searchForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      const city = this.searchInput?.value.trim();
      if (city) {
        this.loadWeather({ city });
        this.searchInput.value = "";
        this.searchInput.dispatchEvent(new Event("input"));
      }
    });

    // 페이지 언로드 시 타이머 정리
    window.addEventListener("beforeunload", () => {
      this.stopRealTimeUpdate();
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
        this.refreshInterval = null;
      }
    });
  }

  async loadWeather(params = { city: "서울" }) {
    showWeatherLoading();
    try {
      const data = await fetchWeatherData(params);
      this.render(data);
    } catch (error) {
      console.error("날씨 데이터를 가져오는데 실패했습니다:", error);
      if (params.lat !== undefined) {
        return this.loadWeather({ city: "서울" });
      }
      alert(
        error.message ||
          "날씨 정보를 가져올 수 없습니다. 도시명을 확인해주세요."
      );
    } finally {
      hideWeatherLoading();
    }
  }

  render({ current, forecast }) {
    // 배경 이미지
    this.container.style.setProperty(
      "--background-image",
      `url("${current.bgUrl}")`
    );

    // 현재 날씨
    if (this.temp) this.temp.textContent = current.temp;
    if (this.location) this.location.textContent = current.location;
    if (this.date) this.date.textContent = current.formattedDate;

    if (this.icon) {
      this.icon.src = current.iconUrl;
      this.icon.alt = current.iconAlt;
    }

    if (this.desc) this.desc.textContent = current.desc;
    if (this.tempMax) this.tempMax.textContent = current.tempMax;
    if (this.tempMin) this.tempMin.textContent = current.tempMin;
    if (this.humidity) this.humidity.textContent = current.humidity;
    if (this.cloudy) this.cloudy.textContent = current.cloudy;
    if (this.wind) this.wind.textContent = current.wind;

    // 일기 예보
    forecast.forEach((item, index) => {
      if (index < this.forecastCards.length) {
        const card = this.forecastCards[index];
        const img = card.querySelector(".weather-tab__icon-medium");
        const timeElement = card.querySelector(
          ".weather-tab__forecast-desc p:first-child"
        );
        const descElement = card.querySelector(
          ".weather-tab__forecast-desc p:last-child"
        );
        const tempElement = card.querySelector(".weather-tab__forecast-temp");

        if (img) {
          img.src = item.iconUrl;
          img.alt = item.iconAlt;
        }
        if (timeElement) timeElement.textContent = item.time;
        if (descElement) descElement.textContent = item.desc;
        if (tempElement) tempElement.textContent = item.temp;
      }
    });

    // 실시간 시계 시작
    this.startRealTimeUpdate(current.timezone);
  }

  startRealTimeUpdate(timezone) {
    this.currentTimezone = timezone;
    this.stopRealTimeUpdate();

    this.realTimeInterval = setInterval(() => {
      if (this.currentTimezone !== null && this.date) {
        this.date.textContent = formatCurrentDate(this.currentTimezone);
      }
    }, 1000);
  }

  stopRealTimeUpdate() {
    if (this.realTimeInterval) {
      clearInterval(this.realTimeInterval);
      this.realTimeInterval = null;
    }
  }

  getUserLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          this.loadWeather({ lat: latitude, lon: longitude });
        },
        (error) => {
          console.error("위치 정보를 가져올 수 없습니다:", error);
          this.loadWeather({ city: "서울" });
        }
      );
    } else {
      console.error("이 브라우저는 위치 정보를 지원하지 않습니다.");
      this.loadWeather({ city: "서울" });
    }
  }

  startAutoRefresh() {
    // 10분마다 현재 표시 중인 도시 날씨 정보 자동 갱신
    this.refreshInterval = setInterval(() => {
      const currentCity = this.location?.textContent;
      if (currentCity) {
        this.loadWeather({ city: currentCity });
      }
    }, 600000);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const controller = new WeatherUIController();
  controller.init();
});
