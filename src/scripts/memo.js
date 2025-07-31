/* global DOMPurify */
import { openDialog } from "./dialog.js";

// --------------------------------------------------------------------------
// 설정값
// --------------------------------------------------------------------------
const DB_NAME = "MemoDB";

// --------------------------------------------------------------------------
// 전역 변수
// --------------------------------------------------------------------------
let db;
let memoData = [];
let deleteMode = false;

// --------------------------------------------------------------------------
// DOM 요소들
// --------------------------------------------------------------------------
// 메인
const checkAllButton = document.querySelector(".memo__button--all");
const mainMemoList = document.querySelector(".memo__list");
const mainNoData = document.querySelector(".memo__empty");

// 팝업
const dialogMemoList = document.querySelector(".dialog__memo-items");
const dialogEditor = document.querySelector(".dialog__editor");
const dialogDateText = document.querySelector(".dialog__date");
const dialogTitleInput = document.getElementById("inp-title");
const dialogTextArea = document.getElementById("inp-text-area");
const dialogAddMemoButton = document.querySelector(".dialog__button--add");
const dialogSaveMemoButton = document.querySelector(".dialog__button--save");
const dialogDeleteMemoButton = document.querySelector(
  ".dialog__button--delete"
);

// --------------------------------------------------------------------------
// 데이터베이스 관련 함수들
// --------------------------------------------------------------------------

// indexedDB 초기화
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = function (event) {
      db = event.target.result;

      if (!db.objectStoreNames.contains("memos")) {
        const objectStore = db.createObjectStore("memos", {
          keyPath: "id",
          autoIncrement: true,
        });

        objectStore.createIndex("title", "title", { unique: false });
        objectStore.createIndex("content", "content", { unique: false });
        objectStore.createIndex("createdAt", "createdAt", { unique: false });

        objectStore.transaction.oncomplete = function () {
          const transaction = db.transaction("memos", "readwrite");
          const memoObjectStore = transaction.objectStore("memos");

          memoData.forEach(function (memo) {
            memoObjectStore.add(memo);
          });

          transaction.oncomplete = function () {
            loadMemosFromDB().then(resolve);
          };
        };
      }
    };

    request.onsuccess = function (event) {
      db = event.target.result;
      loadMemosFromDB().then(resolve);
    };

    request.onerror = function (event) {
      console.error("Database error:", event.target.error);
      reject(event.target.error);
    };
  });
}

// indexedDB에서 모든 메모 로드
function loadMemosFromDB() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("memos", "readonly");
    const objectStore = transaction.objectStore("memos");
    const request = objectStore.getAll();

    request.onsuccess = function (event) {
      memoData = event.target.result;
      latestMemoDataSortFn();
      updateMainMemoListFn();
      updateDialogMemoListFn();
      resolve(memoData);
    };

    request.onerror = function (event) {
      console.error("Load error:", event.target.error);
      reject(event.target.error);
    };
  });
}

// indexedDB에 메모 추가
function addMemoToDB(memo) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("memos", "readwrite");
    const objectStore = transaction.objectStore("memos");
    const request = objectStore.add(memo);

    request.onsuccess = function (event) {
      const newId = event.target.result;
      memo.id = newId;
      resolve(newId);
    };

    request.onerror = function (event) {
      console.error("Add error:", event.target.error);
      reject(event.target.error);
    };
  });
}

// indexedDB에서 메모 업데이트
function updateMemoInDB(memo) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("memos", "readwrite");
    const objectStore = transaction.objectStore("memos");
    const request = objectStore.put(memo);

    request.onsuccess = function (event) {
      resolve(event.target.result);
    };

    request.onerror = function (event) {
      console.error("Update error:", event.target.error);
      reject(event.target.error);
    };
  });
}

// indexedDB에서 메모 삭제
function deleteMemoFromDB(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("memos", "readwrite");
    const objectStore = transaction.objectStore("memos");
    const request = objectStore.delete(id);

    request.onsuccess = function (event) {
      resolve(event.target.result);
    };

    request.onerror = function (event) {
      console.error("Delete error:", event.target.error);
      reject(event.target.error);
    };
  });
}

// --------------------------------------------------------------------------
// 유틸리티 함수들
// --------------------------------------------------------------------------

// 시간 차이 계산 함수(~분 전, ~시간 ~분 전으로 표시)
function getTimeAgoFn(date) {
  const ONE_SECOND = 1000;
  const ONE_MINUTE = 60;

  const currentDate = new Date();
  const memoDate = new Date(date);

  const secondDifference = currentDate - memoDate;
  const minuteDifference = Math.floor(
    secondDifference / ONE_SECOND / ONE_MINUTE
  );
  const hourDifference = Math.floor(minuteDifference / ONE_MINUTE);
  const remainMinutes = minuteDifference % ONE_MINUTE;

  if (minuteDifference === 0) return "Just Now";
  else if (minuteDifference <= 60) return `${minuteDifference}분 전`;
  else return `${hourDifference}시간 ${remainMinutes}분 전`;
}

// 날짜 포맷
function formatDate(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}.${month}.${day}`;
}

// 메모 데이터를 최신순으로 정렬
function latestMemoDataSortFn() {
  memoData.sort((firstMemo, secondMemo) => {
    return new Date(secondMemo.createdAt) - new Date(firstMemo.createdAt);
  });
}

// --------------------------------------------------------------------------
// UI 업데이트 함수들
// --------------------------------------------------------------------------

// 페이지 로드시 초기 업데이트
updateMainMemoListFn();
//팝업창 메모리스트 업데이트
updateDialogMemoListFn();

// 메모 리스트 업데이트 함수
function updateMainMemoListFn() {
  mainMemoList.innerHTML = DOMPurify.sanitize(""); // 기존 리스트 비우기

  // memoData 배열을 순회하며 li 요소 생성
  let memoCount = 0; // 메인 메모 리스트 초기값 0
  memoData.forEach((memo) => {
    // 메인 메모 리스트 최대 2개까지 보여지게 하기
    if (memoCount < 2) {
      const li = document.createElement("li");
      li.className = "memo__item";
      li.dataset.memoId = memo.id;

      // 각 메모 아이템의 HTML 구성
      li.innerHTML = DOMPurify.sanitize(`
        <button type="button" class="memo-card__button show-dialog" data-memo-id="${
          memo.id
        }" aria-label="메모 관리 팝업창 열기">
          <span class="memo-card__time" data-created-at="${memo.createdAt}">
            <span class="memo-card__status-icon"></span>
            <span class="memo-card__time-text">${getTimeAgoFn(
              memo.createdAt
            )}</span>
          </span>
          <span class="memo-card__title">${memo.title}</span>
          <span class="memo-card__desc">${memo.content}</span>
        </button>
        <div class="memo-card__checkbox">
          <label for="inp-memo-checkbox${
            memo.id
          }" class="sr-only">메모 선택</label>
          <input type="checkbox" name="inpMemoCheckBox" id="inp-memo-checkbox${
            memo.id
          }" />
        </div>
      `);

      mainMemoList.appendChild(li);
      memoCount++;
    }
  });

  getTimeAgoAllFn(); // 전체 메모 시간 표시 업데이트 함수 호출
  updateNoDataMessageFn(); // 데이터 없을 때 메시지 표시 함수 호출
}

// 메모가 없을 경우 표시 함수
function updateNoDataMessageFn() {
  const checkboxes = document.querySelectorAll('input[name="inpMemoCheckBox"]');
  mainNoData.style.display = checkboxes.length === 0 ? "flex" : "none";
}

// 전체 메모 시간 업데이트 함수
function getTimeAgoAllFn() {
  const memoTimes = document.querySelectorAll(".memo-card__time");

  memoTimes.forEach((time) => {
    const date = time.dataset.createdAt;
    const timeText = time.querySelector(".memo-card__time-text");

    if (!date || !timeText) return;

    const timeString = getTimeAgoFn(date);
    timeText.textContent = timeString;
  });
}

// 팝업창의 메모 저장시 팝업창 내 메모 리스트 업데이트 함수
function updateDialogMemoListFn() {
  dialogMemoList.innerHTML = DOMPurify.sanitize("");

  // 메모 리스트 목록이 없을 경우
  const dialogNoData = document.querySelector(".dialog__memo-empty");

  if (memoData.length === 0) {
    if (dialogNoData) dialogNoData.style.display = "flex";
    return;
  } else {
    if (dialogNoData) dialogNoData.style.display = "none";
  }

  memoData.forEach((memo, index) => {
    const li = document.createElement("li");
    li.className = "dialog__memo-item";
    li.innerHTML = DOMPurify.sanitize(`
      <button type="button" class="dialog__memo-button ${
        index === 0 ? "on" : ""
      }" data-memo-id="${memo.id}" aria-pressed="${
        index === 0 ? "true" : "false"
      }">
        <span class="dialog__memo-name">${memo.title}</span>
      </button>
    `);
    dialogMemoList.appendChild(li);
  });
}

// --------------------------------------------------------------------------
// 이벤트 처리 함수들
// --------------------------------------------------------------------------

// 전체 선택 버튼 함수
function allCheckFn() {
  const checkboxes = document.querySelectorAll('input[name="inpMemoCheckBox"]');
  const checkboxesArray = [...checkboxes];

  // 모든 체크박스가 전부 체크 확인(초기값 true)
  let isAllChecked = true;

  // 전체 체크되어 있으면 해제하고, 아니면 전체 체크함
  for (let i = 0; i < checkboxesArray.length; i++) {
    if (!checkboxesArray[i].checked) {
      isAllChecked = false;
      break;
    }
  }
  checkboxesArray.forEach((checkbox) => (checkbox.checked = !isAllChecked));

  // 버튼 텍스트 변경
  checkAllButton.textContent = isAllChecked ? "전체 선택" : "전체 해제";
}

// 삭제 버튼 함수
async function deleteButtonFn() {
  const checkedBoxes = document.querySelectorAll(
    'input[name="inpMemoCheckBox"]:checked'
  );
  const deleteToIds = [];

  checkedBoxes.forEach((item) => {
    const li = item.closest(".memo__item");
    if (li !== null) {
      const memoId = parseInt(li.dataset.memoId);
      deleteToIds.push(memoId);
    }
  });

  if (deleteToIds.length > 0) {
    const confirmed = confirm("메모를 정말 삭제하시겠습니까?");
    if (!confirmed) return;

    try {
      for (const id of deleteToIds) {
        await deleteMemoFromDB(id);
      }

      memoData = memoData.filter((memo) => !deleteToIds.includes(memo.id));

      updateMainMemoListFn();
      updateDialogMemoListFn();
      checkAllButton.textContent = "전체 선택";
      deleteMode = false;
    } catch (error) {
      console.error("삭제 실패:", error);
      alert("메모 삭제 중 오류가 발생했습니다.");
    }
  } else {
    alert("삭제할 메모를 선택해주세요.");
    deleteMode = !deleteMode;
  }
}

// 팝업창 열림과 메모 id값에 따라서 메모의 정보가 들어가며 그렇지 않을 경우 빈 값으로 들어감
function openDialogWithMemoId(memoId = null) {
  if (deleteMode) return; // 삭제 모드에서는 팝업 금지

  if (memoId !== null) {
    // 기존 메모 열기
    const selectedMemo = memoData.find((memo) => memo.id === memoId);
    if (selectedMemo) {
      dialogTitleInput.value = selectedMemo.title;
      dialogTextArea.value = selectedMemo.content;
      dialogDateText.textContent = formatDate(selectedMemo.createdAt);
      dialogEditor.dataset.id = selectedMemo.id;

      // 메모 리스트에서 해당 memoId 버튼에 on 클래스 추가
      const allButtons = dialogMemoList.querySelectorAll(
        ".dialog__memo-button"
      );
      allButtons.forEach((button) => {
        button.classList.remove("on");
        button.setAttribute("aria-pressed", "false");
      });

      const activebutton = dialogMemoList.querySelector(
        `.dialog__memo-button[data-memo-id="${memoId}"]`
      );

      if (activebutton) {
        activebutton.classList.add("on");
        activebutton.setAttribute("aria-pressed", "true");
      }
    }
  } else {
    // 새 메모일 때 빈 입력란과 오늘 날짜만 표시
    dialogTitleInput.value = "";
    dialogTextArea.value = "";
    // 오늘 날짜만 표시
    const today = new Date();
    dialogDateText.textContent = `${today.getFullYear()}.${(
      today.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}.${today.getDate().toString().padStart(2, "0")}`;
    delete dialogEditor.dataset.id;
  }

  openDialog({ type: "memo" });
}

// 팝업창 메모 아이템 리스트
function handleDialogMemoList(e) {
  const dialogMemoButton = e.target.closest(".dialog__memo-button");
  if (!dialogMemoButton) return;

  // 모든 버튼의 on 클래스 제거
  const allButtons = dialogMemoList.querySelectorAll(".dialog__memo-button");
  allButtons.forEach((button) => {
    button.classList.remove("on");
    button.setAttribute("aria-pressed", "false");
  });

  // 클릭된 버튼에만 on 클래스 추가
  dialogMemoButton.classList.add("on");
  dialogMemoButton.setAttribute("aria-pressed", "true");

  const memoId = parseInt(dialogMemoButton.dataset.memoId);
  if (isNaN(memoId)) return;

  const selectedMemo = memoData.find((memo) => memo.id === memoId);
  if (!selectedMemo) return;

  const date = new Date(selectedMemo.createdAt);
  const formattedDate = `${date.getFullYear()}.${String(
    date.getMonth() + 1
  ).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;

  dialogEditor.dataset.id = selectedMemo.id;
  dialogDateText.textContent = formattedDate;
  dialogTitleInput.value = selectedMemo.title;
  dialogTextArea.value = selectedMemo.content;
}

// 팝업창 메모 저장
async function handleDialogSaveMemo() {
  const title = dialogTitleInput.value.trim();
  const content = dialogTextArea.value.trim();
  const existingMemoId = parseInt(dialogEditor.dataset.id);

  if (!title || !content) {
    alert("제목과 내용을 입력해주세요.");
    return;
  }

  try {
    if (existingMemoId && !isNaN(existingMemoId)) {
      const memoIndex = memoData.findIndex(
        (memo) => memo.id === existingMemoId
      );
      if (memoIndex !== -1) {
        memoData[memoIndex].title = title;
        memoData[memoIndex].content = content;
        memoData[memoIndex].createdAt = new Date().toString();

        await updateMemoInDB(memoData[memoIndex]);

        dialogDateText.textContent = formatDate(new Date());
        latestMemoDataSortFn();
        updateMainMemoListFn();
        updateDialogMemoListFn();
      }
    } else {
      const newMemo = {
        title,
        content,
        createdAt: new Date().toString(),
      };

      const newId = await addMemoToDB(newMemo);
      newMemo.id = newId;

      memoData.unshift(newMemo);
      updateMainMemoListFn();
      updateDialogMemoListFn();

      dialogEditor.dataset.id = newId;
    }
  } catch (error) {
    console.error("저장 실패:", error);
    alert("메모 저장 중 오류가 발생했습니다.");
  }
}

// 메인과 팝업창 메모 추가
function handleDialogAddMemo() {
  // 새 메모 작성을 위해 편집기 초기화
  delete dialogEditor.dataset.id; // 기존 메모 ID 제거

  // 입력창 초기화
  dialogTitleInput.value = "";
  dialogTextArea.value = "";

  // 오늘 날짜 표시
  const dateText = document.querySelector(".dialog__date");
  const today = new Date();
  dateText.textContent = `${today.getFullYear()}.${(today.getMonth() + 1)
    .toString()
    .padStart(2, "0")}.${today.getDate().toString().padStart(2, "0")}`;

  latestMemoDataSortFn();

  // 팝업 열기
  openDialog({ type: "memo" });
}

// 팝업창 메모 삭제
async function handleDialogDeleteMemo() {
  const memoId = parseInt(dialogEditor.dataset.id);
  const title = dialogTitleInput.value.trim();
  const content = dialogTextArea.value.trim();

  if (!memoId && (title || content)) {
    alert("먼저 저장 후 삭제할 수 있습니다.");
    return;
  }

  if (!memoId) return alert("삭제할 메모가 없습니다.");

  const confirmed = confirm("이 메모를 정말 삭제하시겠습니까?");
  if (!confirmed) return;

  try {
    await deleteMemoFromDB(memoId);
    memoData = memoData.filter((memo) => memo.id !== memoId);

    updateMainMemoListFn();
    updateDialogMemoListFn();

    dialogTitleInput.value = "";
    dialogTextArea.value = "";
    const today = new Date();
    dialogDateText.textContent = `${today.getFullYear()}.${(
      today.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}.${today.getDate().toString().padStart(2, "0")}`;

    dialogEditor.removeAttribute("data-id");
  } catch (error) {
    console.error("삭제 실패:", error);
    alert("메모 삭제 중 오류가 발생했습니다.");
  }
}

// --------------------------------------------------------------------------
// 이벤트 리스너 등록
// --------------------------------------------------------------------------

// 메인 전체 선택, 삭제, 팝업 열기 이벤트 위임으로 클릭 이벤트 리스너 추가
document.addEventListener("click", (e) => {
  const allButton = e.target.closest(".memo__button--all");
  const deleteButton = e.target.closest(".memo__button--delete");
  const showDialogButton = e.target.closest(".show-dialog");

  // allButton이 존재한다면 전체 선택, 해제 실행
  if (allButton !== null) {
    allCheckFn();
  }

  // deleteButton이 존재한다면 삭제 실행
  if (deleteButton !== null) {
    deleteButtonFn();
  }

  if (!showDialogButton) return;

  // memoId가 있는 경우 기존 메모 열고 그렇지 않을 경우 새 메모 열기
  const memoId = parseInt(showDialogButton.dataset.memoId);
  if (!isNaN(memoId)) {
    openDialogWithMemoId(memoId); // 기존 메모 열기
  } else {
    openDialogWithMemoId(); // 새 메모 작성
  }
});

// 팝업창 버튼 이벤트
dialogAddMemoButton.addEventListener("click", handleDialogAddMemo);
dialogSaveMemoButton.addEventListener("click", handleDialogSaveMemo);
dialogMemoList.addEventListener("click", handleDialogMemoList);
dialogDeleteMemoButton.addEventListener("click", handleDialogDeleteMemo);

// --------------------------------------------------------------------------
// 앱 초기화
// --------------------------------------------------------------------------

// 앱 시작
async function initApp() {
  try {
    await initDB();
    console.log("앱이 성공적으로 초기화되었습니다.");
  } catch (error) {
    console.error("앱 초기화 실패:", error);
  }
}

// 60초마다 시간 업데이트
setInterval(() => {
  getTimeAgoAllFn();
}, 60000);

// 앱 실행
initApp();
