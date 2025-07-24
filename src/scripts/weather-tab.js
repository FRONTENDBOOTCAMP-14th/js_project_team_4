// 패널 열고 닫기 기능
const panel = document.querySelector(".weather-tab__panel");
const toggleTarget = document.querySelector(".weather-tab");
const searchForm = document.querySelector(".weather-tab__search-form");

toggleTarget.addEventListener("click", (e) => {
  // 검색창 클릭 시 토글되지 않도록 예외처리
  if (searchForm.contains(e.target)) return;

  const isVisible = panel.style.display === "flex";

  if (isVisible) {
    panel.style.display = "none";
  } else {
    panel.style.display = "flex";
  }
});

// 검색창 입력/초기화 기능
const searchInput = document.querySelector(".weather-tab__search-input");
const clearBtn = document.getElementById("clear-btn");
const searchIcon = document.getElementById("search-img");

clearBtn.style.display = "none";

searchInput.addEventListener("input", () => {
  const value = searchInput.value.trim();

  if (value !== "") {
    clearBtn.style.display = "block";
    searchIcon.style.display = "none";
  } else {
    clearBtn.style.display = "none";
    searchIcon.style.display = "block";
  }
});

clearBtn.addEventListener("click", () => {
  searchInput.value = "";
  clearBtn.style.display = "none";
  searchIcon.style.display = "block";
  searchInput.focus();
});
