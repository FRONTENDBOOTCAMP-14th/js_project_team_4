/**
 * 팝업창(dialog) 함수
 * 공통 팝업 UI에서 재사용 가능한 함수
 *
 * @param {Object} [options={}] 옵션 객체 -> 기본값: 빈 객체
 * @param {string} [options.type=''] 열리는 팝업의 data-type 값 -> 기본값: 빈 문자열
 * @returns {undefined} 반환값 없음
 *
 * @author 성정은
 */

export function openDialog({ type = "" } = {}) {
  const dialog = document.querySelector(".dialog");
  if (!dialog) return;

  dialog.dataset.type = type;

  dialog.showModal();
}

export function closeDialog() {
  const dialog = document.querySelector(".dialog");
  if (!dialog) return;
  dialog.close();
}

// 닫기 버튼 클릭 팝업창 닫힘
document.addEventListener("DOMContentLoaded", () => {
  const dialogCloseButton = document.querySelector(".dialog__close");
  if (dialogCloseButton) {
    dialogCloseButton.addEventListener("click", closeDialog);
  }
});
