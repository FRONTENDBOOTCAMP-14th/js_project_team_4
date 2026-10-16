/**
 * 팝오버 트리거와 요소를 바인딩하고 외부 클릭 시 자동으로 닫히도록 설정합니다.
 * @param {HTMLElement} trigger
 * @param {HTMLElement} popover
 * @returns {() => void} 이벤트 리스너 정리 함수
 */
export function attachPopover(trigger, popover) {
  if (!trigger || !popover) return () => {};

  popover.setAttribute("hidden", "true");

  const onTriggerClick = () => {
    if (popover.hasAttribute("hidden")) {
      popover.removeAttribute("hidden");
    } else {
      popover.setAttribute("hidden", "true");
    }
  };

  const onDocClick = (e) => {
    if (!popover.contains(e.target) && !trigger.contains(e.target)) {
      popover.setAttribute("hidden", "true");
    }
  };

  trigger.addEventListener("click", onTriggerClick);
  document.addEventListener("click", onDocClick);

  return () => {
    trigger.removeEventListener("click", onTriggerClick);
    document.removeEventListener("click", onDocClick);
  };
}
