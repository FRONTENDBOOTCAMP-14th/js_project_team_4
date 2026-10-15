/* global exports process */

exports.handler = async function (event) {
  // CORS 헤더 설정
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  // OPTIONS 요청 처리 (CORS preflight)
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  // 쿼리 파라미터 추출
  const city = event.queryStringParameters?.city;
  const lat = event.queryStringParameters?.lat;
  const lon = event.queryStringParameters?.lon;
  const type = event.queryStringParameters?.type || "current";

  const API_KEY = process.env.OPENWEATHER_API_KEY;
  const BASE_URL = "https://api.openweathermap.org/data/2.5";

  // API 키 확인
  if (!API_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "OpenWeather API Key가 설정되지 않았습니다",
      }),
    };
  }

  let url;

  // URL 구성 - 기존 로직 그대로 유지
  if (type === "forecast" && lat && lon) {
    // 예보 데이터 (좌표 기반)
    url = `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=en`;
  } else if (lat && lon) {
    // 현재 날씨 (좌표 기반)
    url = `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=en`;
  } else if (city) {
    // 현재 날씨 (도시명 기반)
    url = `${BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=en`;
  } else {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: "city 또는 lat/lon 파라미터가 필요합니다",
      }),
    };
  }

  try {
    console.log(`API 호출: ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenWeather API 에러: ${response.status} - ${errorText}`);

      let errorMessage = "날씨 정보를 가져오는데 실패했습니다";
      if (response.status === 404) {
        errorMessage = "도시를 찾을 수 없습니다";
      } else if (response.status === 401) {
        errorMessage = "API Key가 유효하지 않습니다";
      } else if (response.status === 429) {
        errorMessage = "API 요청 한도를 초과했습니다";
      }

      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: errorMessage,
          status: response.status,
        }),
      };
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("날씨 API 호출 에러:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "날씨 데이터를 가져오는데 실패했습니다",
        details: error.message,
      }),
    };
  }
};
