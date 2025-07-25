// 팝업창(dialog)의 data-type 값에 따라 해당 화면이 열림
export function openDialog({ type = '' } = {}) {
  const dialog = document.querySelector('.dialog')
  if (!dialog) return

  dialog.dataset.type = type

  dialog.showModal()
}

export function closeDialog() {
  const dialog = document.querySelector('.dialog')
  if (!dialog) return
  dialog.close()
}

// 닫기 버튼 클릭 팝업창 닫힘
document.addEventListener('DOMContentLoaded', () => {
  const dialogCloseButton = document.querySelector('.dialog__close')
  if (dialogCloseButton) {
    dialogCloseButton.addEventListener('click', closeDialog)
  }
})