// Netlify Functions 엔드포인트
const WEATHER_API_ENDPOINT = "/.netlify/functions/weather";

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
  ash: "화산재",
  squall: "돌풍",
  atmosphere: "대기현상",
};

// 도시명 [한글, 영문] 쌍 매핑 (단일 진실 원천)
const CITY_PAIRS = [
  ["서울", "seoul"],
  ["부산", "busan"],
  ["대구", "daegu"],
  ["인천", "incheon"],
  ["광주", "gwangju"],
  ["대전", "daejeon"],
  ["울산", "ulsan"],
  ["수원", "suwon"],
  ["창원", "changwon"],
  ["성남", "seongnam"],
  ["고양", "goyang"],
  ["용인", "yongin"],
  ["부천", "bucheon"],
  ["안산", "ansan"],
  ["안양", "anyang"],
  ["남양주", "namyangju"],
  ["제주", "jeju"],
  ["춘천", "chuncheon"],
  ["전주", "jeonju"],
  ["천안", "cheonan"],
  ["안성", "anseong"],
  ["용산", "yongsan"],
];

const KOR_TO_ENG = new Map(CITY_PAIRS);
const ENG_TO_KOR = new Map(CITY_PAIRS.map(([kor, eng]) => [eng, kor]));
// OpenWeatherMap 중구 광희동 좌표 응답명 대응
ENG_TO_KOR.set("kwanghŭi-dong", "서울");
ENG_TO_KOR.set("kwanghui-dong", "서울");

// 도시명을 한글로 변환하는 함수
function translateCityToKorean(englishName) {
  if (!englishName) return "";
  const normalized = englishName.toLowerCase().replace(/-si$/, "");
  return ENG_TO_KOR.get(normalized) || englishName;
}

// 날씨 설명을 한글로 번역하는 함수
function translateWeatherToKorean(englishDescription) {
  const lowerDesc = englishDescription.toLowerCase();
  return weatherTranslations[lowerDesc] || englishDescription;
}

const localTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "UTC",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const localDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "UTC",
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
});

// 실시간 현지 시간 계산 - OpenWeather 타임존 정보만 활용
function getCurrentLocalTime(timezoneOffset) {
  return new Date(Date.now() + timezoneOffset * 1000);
}

// 실시간 기반 날짜 포맷팅 함수
export function formatCurrentDate(timezoneOffset) {
  const localDate = getCurrentLocalTime(timezoneOffset);
  return `${localTimeFormatter.format(localDate)} - ${localDateFormatter.format(localDate)}`;
}

// 예보용 시간 포맷팅 함수 - API 타임스탬프 사용
function formatForecastTime(timestamp, timezoneOffset) {
  const localDate = new Date((timestamp + timezoneOffset) * 1000);
  const hours = localDate.getUTCHours();
  const minutes = localDate.getUTCMinutes();

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

// 배경이미지 URL 결정 함수
function getBackgroundImage(weatherMain, iconCode) {
  const weatherType = weatherMain.toLowerCase();
  const isNight = iconCode && iconCode.endsWith("n");

  if (isNight) {
    if (weatherType === "clouds") {
      return backgroundImages["clouds-night"];
    } else if (weatherType === "clear") {
      return backgroundImages.night;
    }
  }

  return backgroundImages[weatherType] || backgroundImages.default;
}

// 검색어 처리 함수 (한글/영어 모두 지원)
function processSearchQuery(query) {
  const trimmed = query.trim();
  return KOR_TO_ENG.get(trimmed) || trimmed;
}

// Netlify Functions 날씨 API 호출 공통 헬퍼
async function callWeather(params) {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${WEATHER_API_ENDPOINT}?${query}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `HTTP error! status: ${response.status}`
    );
  }

  return response.json();
}

/**
 * 날씨 및 예보 데이터를 fetch하여 정제된 뷰 모델을 반환합니다.
 * @param {{ city?: string, lat?: number, lon?: number }} params
 * @returns {Promise<{ current: Object, forecast: Array }>}
 */
export async function fetchWeatherData(params = { city: "서울" }) {
  const queryParams = { ...params, type: "current" };
  if (queryParams.city) {
    queryParams.city = processSearchQuery(queryParams.city);
  }

  const currentData = await callWeather(queryParams);
  const forecastData = await callWeather({
    lat: currentData.coord.lat,
    lon: currentData.coord.lon,
    type: "forecast",
  });

  const iconCode = currentData.weather[0]?.icon || "01d";

  const current = {
    temp: `${Math.round(currentData.main.temp)}°`,
    location: translateCityToKorean(currentData.name),
    timezone: currentData.timezone,
    formattedDate: formatCurrentDate(currentData.timezone),
    iconUrl: `/img/icons/${iconCode}.svg`,
    iconAlt: currentData.weather[0]?.description || "",
    bgUrl: getBackgroundImage(currentData.weather[0]?.main || "", iconCode),
    desc: translateWeatherToKorean(currentData.weather[0]?.description || ""),
    tempMax: `${Math.round(currentData.main.temp_max)}°`,
    tempMin: `${Math.round(currentData.main.temp_min)}°`,
    humidity: `${currentData.main.humidity}%`,
    cloudy: `${currentData.clouds.all}%`,
    wind: `${Math.round(currentData.wind.speed * 3.6)}km/h`,
  };

  const forecast = forecastData.list.slice(0, 5).map((item) => {
    const itemIcon = item.weather[0]?.icon || "01d";
    return {
      iconUrl: `/img/icons/${itemIcon}.svg`,
      iconAlt: item.weather[0]?.description || "",
      time: formatForecastTime(item.dt, forecastData.city.timezone),
      desc: translateWeatherToKorean(item.weather[0]?.description || ""),
      temp: `${Math.round(item.main.temp)}°`,
    };
  });

  return { current, forecast };
}
