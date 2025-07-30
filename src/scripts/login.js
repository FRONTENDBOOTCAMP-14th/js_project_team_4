// 구글 OAuth 로그인

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// 1. 로그인 콜백 함수
function handleCredentialResponse(response) {
  const idToken = response.credential;
  const payload = parseJwt(idToken);

  const userName = payload.name;
  const userEmail = payload.email;
  const userPicture = payload.picture;

  console.log("로그인 완료:", payload);

  // 기존 버튼을 프로필로 변경
  const loginBtnIcon = document.querySelector(".login-btn__icon");
  const loginBtn = document.querySelector(".login-btn");

  if (loginBtnIcon && loginBtn) {
    // 기존 구글 버튼 숨기기
    const googleBtn = loginBtn.querySelector('div[data-google="true"]');
    if (googleBtn) {
      googleBtn.style.display = "none";
    }

    // 프로필 이미지로 변경 (login-btn__icon에 적용)
    loginBtnIcon.style.backgroundImage = `url("${userPicture}")`;
    loginBtnIcon.style.borderRadius = "50%";
    loginBtnIcon.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";

    loginBtn.setAttribute("title", `${userName}님 - 로그아웃하려면 클릭`);

    // 로그아웃 기능 추가
    loginBtn.onclick = logout;
  }

  // 사용자 정보 저장
  localStorage.setItem("googleUser", JSON.stringify(payload));

  alert(`환영합니다, ${userName}님!`);
}

// 2. JWT 토큰 디코딩
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

// 3. 로그아웃 함수
function logout() {
  // 로컬 스토리지 클리어
  localStorage.removeItem("googleUser");

  // 구글 로그아웃
  google.accounts.id.disableAutoSelect();

  // 버튼 원래대로 복구
  const loginBtnIcon = document.querySelector(".login-btn__icon");
  const loginBtn = document.querySelector(".login-btn");

  if (loginBtnIcon && loginBtn) {
    // 스타일 초기화 (login-btn__icon에 적용)
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const iconPath = isDark
      ? "/img/icons/person-white.svg"
      : "/img/icons/person.svg";

    loginBtnIcon.style.backgroundImage = `url("${iconPath}")`;
    loginBtnIcon.style.borderRadius = "0";
    loginBtnIcon.style.border = "none";
    loginBtnIcon.style.boxShadow = "none";

    loginBtn.setAttribute("title", "Google 계정으로 로그인");
    loginBtn.onclick = null;

    // 구글 버튼 다시 렌더링
    renderGoogleButton();
  }

  alert("로그아웃되었습니다.");
}

// 4. 구글 버튼 렌더링
function renderGoogleButton() {
  const loginBtn = document.querySelector(".login-btn");
  if (!loginBtn) return;

  // 기존 구글 버튼 제거
  const existingGoogleBtn = loginBtn.querySelector('div[data-google="true"]');
  if (existingGoogleBtn) {
    existingGoogleBtn.remove();
  }

  // 새 div 생성 (투명하게 만들어서 배경 아이콘 보이게)
  const googleBtnContainer = document.createElement("div");
  googleBtnContainer.setAttribute("data-google", "true");
  googleBtnContainer.style.position = "absolute";
  googleBtnContainer.style.top = "0";
  googleBtnContainer.style.left = "0";
  googleBtnContainer.style.width = "48px";
  googleBtnContainer.style.height = "48px";
  googleBtnContainer.style.opacity = "0";
  googleBtnContainer.style.zIndex = "10";

  loginBtn.appendChild(googleBtnContainer);
  loginBtn.style.position = "relative";

  // 구글 버튼 렌더링 (투명한 div 안에)
  google.accounts.id.renderButton(googleBtnContainer, {
    theme: "outline",
    size: "large",
    type: "icon",
    shape: "circle",
    width: 48,
  });
}

// 5. 기존 로그인 확인
function checkExistingLogin() {
  const savedUser = localStorage.getItem("googleUser");
  if (savedUser) {
    try {
      const payload = JSON.parse(savedUser);

      // UI 업데이트 (로그인 상태로)
      const loginBtnIcon = document.querySelector(".login-btn__icon");
      const loginBtn = document.querySelector(".login-btn");

      if (loginBtnIcon && loginBtn) {
        loginBtnIcon.style.backgroundImage = `url("${payload.picture}")`;
        loginBtnIcon.style.borderRadius = "50%";
        loginBtnIcon.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";

        loginBtn.setAttribute(
          "title",
          `${payload.name}님 - 로그아웃하려면 클릭`
        );
        loginBtn.onclick = logout;
      }

      console.log("기존 로그인 복원:", payload.name);
    } catch (error) {
      localStorage.removeItem("googleUser");
      renderGoogleButton();
    }
  } else {
    // 로그인 안된 상태면 구글 버튼 렌더링
    renderGoogleButton();
  }
}

// 6. 초기화
window.onload = () => {
  if (typeof google === "undefined") {
    console.error("Google API가 로드되지 않았습니다.");
    return;
  }

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleCredentialResponse,
    auto_select: false, // 자동 로그인 비활성화
  });

  // 기존 로그인 확인
  checkExistingLogin();
};
