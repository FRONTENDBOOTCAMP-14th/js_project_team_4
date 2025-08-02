// 로딩 스피너
import { showWeatherLoading, hideWeatherLoading } from "./loading-spiner.js";

// Netlify Functions 엔드포인트
const WEATHER_API_ENDPOINT = "/.netlify/functions/weather";

const weatherTemp = document.querySelector(".weather-tab__temp");
const weatherLocation = document.querySelector(".weather-tab__location");
const weatherDate = document.querySelector(".weather-tab__date");
const weatherIcon = document.querySelector(".weather-tab__icon");
const weatherContainer = document.querySelector(".weather-tab");
const searchForm = document.querySelector(".weather-tab__search-form");
const searchInput = document.querySelector(".weather-tab__search-input");

const weatherDesc = document.querySelector(".weather-tab__desc-text");
const weatherCards = document.querySelectorAll(".weather-tab__card");

// 각 카드의 온도/데이터 요소들
const tempMaxElement = weatherCards[0]?.querySelector("p:nth-child(2)");
const tempMinElement = weatherCards[1]?.querySelector("p:nth-child(2)");
const humidityElement = weatherCards[2]?.querySelector("p:nth-child(2)");
const cloudyElement = weatherCards[3]?.querySelector("p:nth-child(2)");
const windElement = weatherCards[4]?.querySelector("p:nth-child(2)");

const forecastCards = document.querySelectorAll(".weather-tab__forecast-card");

// 배경이미지 매핑
const backgroundImages = {
  clear: "/img/bg/clear.jpg",
  clouds: "/img/bg/clouds.jpg",
  "clouds-night": "/img/bg/clouds-night.jpg",
  rain: "/img/bg/rain.jpg",
  drizzle: "/img/bg/rain.jpg",
  thunderstorm: "/img/bg/thunderstorm.jpg",
  snow: "/img/bg/snow.jpg",
  mist: "/img/bg/mist.jpg",
  fog: "/img/bg/mist.jpg",
  haze: "/img/bg/mist.jpg",
  night: "/img/bg/night.jpg",
  default: "/img/bg/clouds.jpg",
};

// 아이콘 매핑
const iconMapping = {
  "01d": "01d.svg",
  "01n": "01n.svg",
  "02d": "02d.svg",
  "02n": "02n.svg",
  "03d": "03d.svg",
  "03n": "03n.svg",
  "04d": "04d.svg",
  "04n": "04n.svg",
  "09d": "09d.svg",
  "09n": "09n.svg",
  "10d": "10d.svg",
  "10n": "10n.svg",
  "11d": "11d.svg",
  "11n": "11n.svg",
  "13d": "13d.svg",
  "13n": "13n.svg",
  "50d": "50d.svg",
  "50n": "50n.svg",
};

// 날씨 상태 한글 번역 매핑
const weatherTranslations = {
  "thunderstorm with light rain": "약한 비와 천둥번개",
  "thunderstorm with rain": "비와 천둥번개",
  "thunderstorm with heavy rain": "폭우와 천둥번개",
  "light thunderstorm": "약한 천둥번개",
  thunderstorm: "천둥번개",
  "heavy thunderstorm": "강한 천둥번개",
  "ragged thunderstorm": "불규칙한 천둥번개",
  "thunderstorm with light drizzle": "약한 이슬비와 천둥번개",
  "thunderstorm with drizzle": "이슬비와 천둥번개",
  "thunderstorm with heavy drizzle": "강한 이슬비와 천둥번개",

  "light intensity drizzle": "약한 이슬비",
  drizzle: "이슬비",
  "heavy intensity drizzle": "강한 이슬비",
  "light intensity drizzle rain": "약한 이슬비",
  "drizzle rain": "이슬비",
  "heavy intensity drizzle rain": "강한 이슬비",
  "shower rain and drizzle": "소나기와 이슬비",
  "heavy shower rain and drizzle": "강한 소나기와 이슬비",
  "shower drizzle": "이슬비 소나기",

  "light rain": "약한 비",
  "moderate rain": "비",
  "heavy intensity rain": "강한 비",
  "very heavy rain": "매우 강한 비",
  "extreme rain": "폭우",
  "freezing rain": "얼어붙는 비",
  "light intensity shower rain": "약한 소나기",
  "shower rain": "소나기",
  "heavy intensity shower rain": "강한 소나기",
  "ragged shower rain": "불규칙한 소나기",

  "light snow": "약한 눈",
  snow: "눈",
  "heavy snow": "폭설",
  sleet: "진눈깨비",
  "light shower sleet": "약한 진눈깨비",
  "shower sleet": "진눈깨비",
  "light rain and snow": "비와 눈",
  "rain and snow": "비와 눈",
  "light shower snow": "약한 눈보라",
  "shower snow": "눈보라",
  "heavy shower snow": "강한 눈보라",

  mist: "안개",
  smoke: "연기",
  haze: "실안개",
  "sand/dust whirls": "모래먼지 회오리",
  fog: "짙은 안개",
  sand: "모래바람",
  dust: "황사",
  "volcanic ash": "화산재",
  squalls: "돌풍",
  tornado: "토네이도",

  "clear sky": "맑음",
  "few clouds": "구름 조금",
  "scattered clouds": "구름 많음",
  "broken clouds": "흐림",
  "overcast clouds": "흐림",
  overcast: "흐림",

  clear: "맑음",
  clouds: "구름",
  rain: "비",
  drizzle: "이슬비",
  thunderstorm: "천둥번개",
  snow: "눈",
  mist: "안개",
  smoke: "연기",
  haze: "실안개",
  dust: "황사",
  fog: "짙은 안개",
  sand: "모래바람",
  ash: "화산재",
  squall: "돌풍",
  tornado: "토네이도",
  atmosphere: "대기현상",
};

// 도시명 한글-영어 매핑 (검색 지원용)
const cityTranslations = {
  서울: "seoul",
  부산: "busan",
  대구: "daegu",
  인천: "incheon",
  광주: "gwangju",
  대전: "daejeon",
  울산: "ulsan",
  수원: "suwon",
  창원: "changwon",
  성남: "seongnam",
  고양: "goyang",
  용인: "yongin",
  부천: "bucheon",
  안산: "ansan",
  안양: "anyang",
  남양주: "namyangju",
  제주: "jeju",
  춘천: "chuncheon",
  전주: "jeonju",
  천안: "cheonan",
  안성: "anseong",
  용산: "yongsan",
};

// 도시명을 한글로 변환하는 함수
function translateCityToKorean(englishName) {
  const cityMap = {
    seoul: "서울",
    busan: "부산",
    daegu: "대구",
    incheon: "인천",
    gwangju: "광주",
    daejeon: "대전",
    ulsan: "울산",
    "suwon-si": "수원",
    suwon: "수원",
    changwon: "창원",
    "seongnam-si": "성남",
    seongnam: "성남",
    "goyang-si": "고양",
    goyang: "고양",
    yongin: "용인",
    "bucheon-si": "부천",
    bucheon: "부천",
    "ansan-si": "안산",
    ansan: "안산",
    anyang: "안양",
    namyangju: "남양주",
    jeju: "제주",
    chuncheon: "춘천",
    jeonju: "전주",
    cheonan: "천안",
    anseong: "안성",
    yongsan: "용산",
    "kwanghŭi-dong": "서울",
  };

  return cityMap[englishName.toLowerCase()] || englishName;
}

// 날씨 설명을 한글로 번역하는 함수
function translateWeatherToKorean(englishDescription) {
  const lowerDesc = englishDescription.toLowerCase();
  return weatherTranslations[lowerDesc] || englishDescription;
}

// 실시간 현지 시간 계산 - OpenWeather 타임존 정보만 활용
function getCurrentLocalTime(timezoneOffset) {
  // 현재 UTC 시간을 초 단위로 구하기
  const nowUTC = Math.floor(Date.now() / 1000);

  // UTC 시간에 해당 지역의 타임존 오프셋을 더해서 현지 시간 계산
  const localTimeSeconds = nowUTC + timezoneOffset;

  // 밀리초로 변환하여 Date 객체 생성
  return new Date(localTimeSeconds * 1000);
}

// 실시간 기반 날짜 포맷팅 함수
function formatCurrentDate(timezoneOffset) {
  const localDate = getCurrentLocalTime(timezoneOffset);

  // UTC 메서드를 사용하여 이미 현지 시간으로 계산된 값 추출
  const year = localDate.getUTCFullYear();
  const month = localDate.getUTCMonth() + 1;
  const day = localDate.getUTCDate();
  const hours = localDate.getUTCHours();
  const minutes = localDate.getUTCMinutes();
  const weekday = localDate.getUTCDay();

  const weekdays = [
    "일요일",
    "월요일",
    "화요일",
    "수요일",
    "목요일",
    "금요일",
    "토요일",
  ];
  const monthNames = [
    "1월",
    "2월",
    "3월",
    "4월",
    "5월",
    "6월",
    "7월",
    "8월",
    "9월",
    "10월",
    "11월",
    "12월",
  ];

  const formattedTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  const formattedDate = `${year}년 ${monthNames[month - 1]} ${day}일 ${weekdays[weekday]}`;

  return `${formattedTime} - ${formattedDate}`;
}

// 예보용 시간 포맷팅 함수 - API 타임스탬프 사용
function formatForecastTime(timestamp, timezoneOffset) {
  // 예보 데이터는 API 타임스탬프를 그대로 사용
  const utcTime = timestamp * 1000;
  const localTime = utcTime + timezoneOffset * 1000;
  const localDate = new Date(localTime);

  const hours = localDate.getUTCHours();
  const minutes = localDate.getUTCMinutes();

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

// 배경이미지 변경 함수 - 아이콘 코드 기반 낮/밤 판단
function updateBackground(weatherMain, iconCode) {
  const weatherType = weatherMain.toLowerCase();

  // 아이콘 코드로 낮/밤 판단
  const isNight = iconCode && iconCode.endsWith("n");

  let backgroundImage;

  // 밤시간대 처리
  if (isNight) {
    if (weatherType === "clouds") {
      backgroundImage = backgroundImages["clouds-night"];
    } else if (weatherType === "clear") {
      backgroundImage = backgroundImages["night"];
    } else {
      backgroundImage =
        backgroundImages[weatherType] || backgroundImages.default;
    }
  } else {
    backgroundImage = backgroundImages[weatherType] || backgroundImages.default;
  }

  weatherContainer.style.setProperty(
    "--background-image",
    `url("${backgroundImage}")`
  );
}

// 실시간 시간 업데이트를 위한 전역 변수
let currentTimezone = null;
let realTimeInterval = null;

// 실시간 시간 업데이트 시작 함수
function startRealTimeUpdate() {
  // 기존 인터벌이 있다면 정리
  if (realTimeInterval) {
    clearInterval(realTimeInterval);
  }

  // 1초마다 시간 업데이트
  realTimeInterval = setInterval(() => {
    if (currentTimezone !== null && weatherDate) {
      weatherDate.textContent = formatCurrentDate(currentTimezone);
    }
  }, 1000);
}

// 실시간 시간 업데이트 중지 함수
function stopRealTimeUpdate() {
  if (realTimeInterval) {
    clearInterval(realTimeInterval);
    realTimeInterval = null;
  }
}

// 현재 날씨 데이터 표시 - timezone 정보 저장 및 실시간 업데이트 시작
function displayCurrentWeather(data) {
  // timezone 정보 저장
  currentTimezone = data.timezone;

  // 온도 (소수점 제거)
  if (weatherTemp) {
    weatherTemp.textContent = `${Math.round(data.main.temp)}°`;
  }

  // 위치 - 한글로 변환
  const cityName = translateCityToKorean(data.name);
  if (weatherLocation) {
    weatherLocation.textContent = cityName;
  }

  // 실시간 현재 시간 표시 - timezone 정보 활용
  if (weatherDate) {
    weatherDate.textContent = formatCurrentDate(data.timezone);
  }

  // 날씨 아이콘
  const iconCode = data.weather[0].icon;
  const iconFile = iconMapping[iconCode] || "01d.svg";
  if (weatherIcon) {
    weatherIcon.src = `/img/icons/${iconFile}`;
    weatherIcon.alt = data.weather[0].description;
  }

  // 배경이미지 변경 - 아이콘 코드 기반 낮/밤 판단
  updateBackground(data.weather[0].main, iconCode);

  // Weather Details 업데이트 - 한글 번역
  if (weatherDesc) {
    const translatedDesc = translateWeatherToKorean(
      data.weather[0].description
    );
    weatherDesc.textContent = translatedDesc;
  }

  if (tempMaxElement) {
    tempMaxElement.textContent = `${Math.round(data.main.temp_max)}°`;
  }

  if (tempMinElement) {
    tempMinElement.textContent = `${Math.round(data.main.temp_min)}°`;
  }

  if (humidityElement) {
    humidityElement.textContent = `${data.main.humidity}%`;
  }

  if (cloudyElement) {
    cloudyElement.textContent = `${data.clouds.all}%`;
  }

  if (windElement) {
    windElement.textContent = `${Math.round(data.wind.speed * 3.6)}km/h`; // m/s를 km/h로 변환
  }

  // 실시간 시간 업데이트 시작
  startRealTimeUpdate();
}

// 예보 데이터 표시
function displayForecast(data) {
  // 5개의 예보만 표시 (3시간 간격)
  const forecastList = data.list.slice(0, 5);

  forecastList.forEach((forecast, index) => {
    if (index < forecastCards.length) {
      const card = forecastCards[index];
      const img = card.querySelector(".weather-tab__icon-medium");
      const timeElement = card.querySelector(
        ".weather-tab__forecast-desc p:first-child"
      );
      const descElement = card.querySelector(
        ".weather-tab__forecast-desc p:last-child"
      );
      const tempElement = card.querySelector(".weather-tab__forecast-temp");

      if (img) {
        // 아이콘
        const iconCode = forecast.weather[0].icon;
        const iconFile = iconMapping[iconCode] || "01d.svg";
        img.src = `/img/icons/${iconFile}`;
        img.alt = forecast.weather[0].description;
      }

      if (timeElement) {
        // 예보 시간 표시 - API 타임스탬프 사용
        timeElement.textContent = formatForecastTime(
          forecast.dt,
          data.city.timezone
        );
      }

      if (descElement) {
        // 날씨 설명 - 한글 번역
        const translatedDesc = translateWeatherToKorean(
          forecast.weather[0].description
        );
        descElement.textContent = translatedDesc;
      }

      if (tempElement) {
        // 온도
        tempElement.textContent = `${Math.round(forecast.main.temp)}°`;
      }
    }
  });
}

// 검색어 처리 함수 (한글/영어 모두 지원)
function processSearchQuery(query) {
  const trimmedQuery = query.trim();

  // 한글 도시명인 경우 영어로 변환
  if (cityTranslations[trimmedQuery]) {
    return cityTranslations[trimmedQuery];
  }

  return trimmedQuery;
}

// 현재 날씨 가져오기 - Netlify Functions 사용
async function fetchCurrentWeather(city = "서울") {
  showWeatherLoading(); // 로딩 스피너 표시
  try {
    // 검색어 처리 (한글->영어 변환)
    const processedCity = processSearchQuery(city);

    // Netlify Functions 호출
    const response = await fetch(
      `${WEATHER_API_ENDPOINT}?city=${encodeURIComponent(processedCity)}&type=current`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`
      );
    }

    const data = await response.json();
    displayCurrentWeather(data);

    // 좌표를 이용해 예보 데이터도 가져오기
    fetchForecast(data.coord.lat, data.coord.lon);
  } catch (error) {
    console.error("현재 날씨 데이터를 가져오는데 실패했습니다:", error);
    alert("날씨 정보를 가져올 수 없습니다. 도시명을 확인해주세요.");
  } finally {
    hideWeatherLoading(); // 로딩 스피너 숨김
  }
}

// 로딩 스피너 호출
fetchCurrentWeather();

// 예보 데이터 가져오기 - Netlify Functions 사용
async function fetchForecast(lat, lon) {
  try {
    // Netlify Functions 호출
    const response = await fetch(
      `${WEATHER_API_ENDPOINT}?lat=${lat}&lon=${lon}&type=forecast`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`
      );
    }

    const data = await response.json();
    displayForecast(data);
  } catch (error) {
    console.error("예보 데이터를 가져오는데 실패했습니다:", error);
  }
}

// 위치 기반 날씨 가져오기 - Netlify Functions 사용
async function fetchWeatherByLocation(lat, lon) {
  try {
    // Netlify Functions 호출
    const response = await fetch(
      `${WEATHER_API_ENDPOINT}?lat=${lat}&lon=${lon}&type=current`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`
      );
    }

    const data = await response.json();
    displayCurrentWeather(data);
    fetchForecast(lat, lon);
  } catch (error) {
    console.error("위치 기반 날씨 데이터를 가져오는데 실패했습니다:", error);
    // 실패시 기본 도시(서울)로 폴백
    fetchCurrentWeather("서울");
  }
}

// 사용자 위치 가져오기
function getUserLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        fetchWeatherByLocation(latitude, longitude);
      },
      (error) => {
        console.error("위치 정보를 가져올 수 없습니다:", error);
        // 위치 정보 실패시 서울 날씨로 기본 설정
        fetchCurrentWeather("서울");
      }
    );
  } else {
    console.error("이 브라우저는 위치 정보를 지원하지 않습니다.");
    fetchCurrentWeather("서울");
  }
}

// 검색 폼 이벤트 리스너
if (searchForm) {
  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const city = searchInput.value.trim();

    if (city) {
      fetchCurrentWeather(city);
      // 검색 후 입력 초기화
      searchInput.value = "";

      // 검색 아이콘 상태 업데이트
      const clearBtn = document.getElementById("clear-btn");
      const searchIcon = document.getElementById("search-img");
      if (clearBtn) clearBtn.style.display = "none";
      if (searchIcon) searchIcon.style.display = "block";
    }
  });
}

// 페이지 로드시 초기화
document.addEventListener("DOMContentLoaded", () => {
  // 사용자 위치 기반으로 날씨 정보 가져오기 시도
  getUserLocation();

  // 10분마다 날씨 정보 업데이트
  setInterval(() => {
    const currentCity = weatherLocation?.textContent;
    if (currentCity) {
      fetchCurrentWeather(currentCity);
    }
  }, 600000);
});

// 페이지 언로드시 정리
window.addEventListener("beforeunload", () => {
  stopRealTimeUpdate();
});

// 전역에서 접근 가능하도록 함수 노출
window.weatherAPI = {
  fetchCurrentWeather,
  fetchWeatherByLocation,
  getUserLocation,
};
