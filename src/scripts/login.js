// .env에서 설정한 Google OAuth 클라이언트 ID 가져오기
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// 로그인 버튼 요소 선택
const loginBtn = document.querySelector(".login-btn");

// Google 로그인 성공 시 호출되는 콜백 함수
function handleCredentialResponse(response) {
  const payload = parseJwt(response.credential); // JWT 토큰 디코딩

  console.log("로그인 완료:", payload);

  // 버튼을 사용자 프로필 이미지로 스타일 변경
  applyProfileStyle(payload);

  // 사용자 정보를 localStorage에 저장
  localStorage.setItem("googleUser", JSON.stringify(payload));
  alert(`환영합니다, ${payload.name}님!`);
}

// JWT 토큰을 디코딩하여 사용자 정보 추출
function parseJwt(token) {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => `%${("00" + c.charCodeAt(0).toString(16)).slice(-2)}`)
      .join("")
  );
  return JSON.parse(jsonPayload);
}

// 로그인 후 버튼을 사용자 프로필 스타일로 변경하는 함수
function applyProfileStyle(payload) {
  if (!loginBtn) return;

  // 투명한 구글 OAuth 버튼 숨기기
  const googleBtn = loginBtn.querySelector('div[data-google="true"]');
  if (googleBtn) googleBtn.style.display = "none";

  // 버튼 배경을 사용자 프로필 이미지로 설정
  loginBtn.style.backgroundImage = `url("${payload.picture}")`;
  loginBtn.style.borderRadius = "50%";
  loginBtn.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
  loginBtn.title = `${payload.name}님 - 로그아웃하려면 클릭`;

  // 버튼 클릭 시 로그아웃되도록 설정
  loginBtn.onclick = logout;
}

// 로그아웃 처리 함수
function logout() {
  // 저장된 사용자 정보 삭제
  localStorage.removeItem("googleUser");

  // 자동 로그인 해제
  google.accounts.id.disableAutoSelect();

  if (!loginBtn) return;

  // 다크모드 여부에 따라 기본 아이콘 설정
  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const icon = isDark ? "/img/icons/person-white.svg" : "/img/icons/person.svg";

  // 버튼 스타일 초기화
  loginBtn.style.backgroundImage = `url("${icon}")`;
  loginBtn.style.borderRadius = "0";
  loginBtn.style.boxShadow = "none";
  loginBtn.title = "Google 계정으로 로그인";
  loginBtn.onclick = null;

  // 구글 버튼 다시 렌더링
  renderGoogleButton();
  alert("로그아웃되었습니다.");
}

// 투명한 Google OAuth 버튼을 생성하고 렌더링하는 함수
function renderGoogleButton() {
  if (!loginBtn) return;

  // 기존 버튼이 있으면 제거
  const existing = loginBtn.querySelector('div[data-google="true"]');
  if (existing) existing.remove();

  // 새로운 OAuth 버튼을 위한 투명한 div 생성
  const container = document.createElement("div");
  container.setAttribute("data-google", "true");
  Object.assign(container.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: "48px",
    height: "48px",
    opacity: "0",
    zIndex: "10",
  });

  // 버튼에 자식으로 추가
  loginBtn.appendChild(container);

  // 구글 OAuth 버튼 렌더링
  google.accounts.id.renderButton(container, {
    theme: "outline",
    size: "large",
    type: "icon",
    shape: "circle",
    width: 48,
  });
}

// 기존 로그인 정보가 있으면 로그인 상태 복원
function checkExistingLogin() {
  const saved = localStorage.getItem("googleUser");
  if (!saved) return renderGoogleButton();

  try {
    const payload = JSON.parse(saved);
    applyProfileStyle(payload); // 로그인 상태 복원
    console.log("기존 로그인 복원:", payload.name);
  } catch {
    localStorage.removeItem("googleUser");
    renderGoogleButton();
  }
}

// 페이지 로드 시 실행되는 초기화 함수
window.onload = () => {
  if (typeof google === "undefined") {
    console.error("Google API가 로드되지 않았습니다.");
    return;
  }

  // Google OAuth 초기화
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleCredentialResponse,
    auto_select: false,
  });

  // 로그인 상태 확인 및 버튼 렌더링
  checkExistingLogin();
};
