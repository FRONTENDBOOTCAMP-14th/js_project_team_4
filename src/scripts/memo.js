/* global DOMPurify */
import { openDialog, closeDialog } from './dialog.js'

;(() => {
  // 문서에서 요소 찾기
  // 메인
  const checkAllButton = document.querySelector('.memo__button--all')
  const mainMemoList = document.querySelector('.memo__list')
  const mainNoData = document.querySelector('.memo__empty')
  
  // 팝업
  const dialogMemoList = document.querySelector('.dialog__memo-items')
  const dialogEditor = document.querySelector('.dialog__editor')
  const dialogDateText = document.querySelector('.dialog__date')
  const dialogTitleInput = document.getElementById('inp-title')
  const dialogTextArea = document.getElementById('inp-text-area')
  const dialogAddMemoBtn = document.querySelector('.dialog__button--add')
  const dialogSaveMemoBtn = document.querySelector('.dialog__button--save')
  const dialogDeleteMemoButton = document.querySelector('.dialog__button--delete')
  
  // 초기 메모 데이터
  // 시간을 이용한 ID값 추출 추후 mongoDB를 이용하여 변경 예정
  let memoData = [
    {
      id: Date.now(),
      title: '첫번째 메모',
      content: '메모내용입니다.메모내용입니다.메모내용입니다.',
      createdAt: '2025-07-24T12:55:00'
    },
    {
      id: Date.now() + 1,
      title: '두번째 메모',
      content: '메모내용입니다. 테스트입니다',
      createdAt: '2025-07-21T12:50:00'
    }
  ]

  let deleteMode = false // 삭제 모드 상태 초기값 false

  // 페이지 로드시 초기 업데이트
  updateMainMemoListFn()
  //팝업창 메모리스트 업데이트
  updateDialogMemoListFn()

  // 메모 리스트 업데이트 함수
  function updateMainMemoListFn() {
    mainMemoList.innerHTML = DOMPurify.sanitize('') // 기존 리스트 비우기

    // memoData 배열을 순회하며 li 요소 생성
    memoData.forEach(memo => {
      const li = document.createElement('li')
      li.className = 'memo__item'
      li.dataset.memoId = memo.id

      // 각 메모 아이템의 HTML 구성
      li.innerHTML = DOMPurify.sanitize(`
        <button type="button" class="memo-card__button show-dialog" data-memo-id="${memo.id}">
          <span class="memo-card__time" data-created-at="${memo.createdAt}">
            <span class="memo-card__status-icon"></span>
            <span class="memo-card__time-text">${getTimeAgoFn(memo.createdAt)}</span>
          </span>
          <span class="memo-card__title">${memo.title}</span>
          <span class="memo-card__desc">${memo.content}</span>
        </button>
        <div class="memo-card__checkbox">
          <label for="inp-memo-checkbox${memo.id}" class="sr-only">메모 선택</label>
          <input type="checkbox" name="inpMemoCheckBox" id="inp-memo-checkbox${memo.id}" />
        </div>
      `)

      mainMemoList.appendChild(li) // 리스트에 추가
    })

    getTimeAgoAllFn() // 전체 메모 시간 표시 업데이트 함수 호출
    updateNoDataMessageFn() // 데이터 없을 때 메시지 표시 함수 호출
  }

  // 메모가 없을 경우 표시 함수
  function updateNoDataMessageFn() {
    const checkboxes = document.querySelectorAll('input[name="inpMemoCheckBox"]')
    mainNoData.style.display = checkboxes.length === 0 ? 'block' : 'none'
  }

  // 전체 메모 시간 업데이트 함수
  function getTimeAgoAllFn() {
    const memoTimes = document.querySelectorAll('.memo-card__time')

    memoTimes.forEach(time => {
      const date = time.dataset.createdAt
      const timeText = time.querySelector('.memo-card__time-text')

      if (!date || !timeText) return

      const timeString = getTimeAgoFn(date)
      timeText.textContent = timeString
    })
  }

  // 시간 차이 계산 함수(~분 전, ~시간 ~분 전으로 표시)
  function getTimeAgoFn(date) {
    const ONE_SECOND = 1000
    const ONE_MINUTE = 60

    const currentDate = new Date()
    const memoDate = new Date(date)

    const secondDifference = currentDate - memoDate
    const minuteDifference = Math.floor(secondDifference / ONE_SECOND / ONE_MINUTE)
    const hourDifference = Math.floor(minuteDifference / ONE_MINUTE)
    const remainMinutes = minuteDifference % ONE_MINUTE

    if (minuteDifference === 0) return 'Just Now'
    else if (minuteDifference <= 60) return `${minuteDifference}분 전`
    else return `${hourDifference}시간 ${remainMinutes}분 전`
  }

  // 전체 선택 버튼 함수
  function allCheckFn() {
    const checkboxes = document.querySelectorAll('input[name="inpMemoCheckBox"]')
    const checkboxesArray = [...checkboxes]

    // 모든 체크박스가 전부 체크 확인(초기값 true)
    let isAllChecked = true

    // 전체 체크되어 있으면 해제하고, 아니면 전체 체크함
    for (let i = 0; i < checkboxesArray.length; i++) {
      if (!checkboxesArray[i].checked) {
        isAllChecked = false
        break
      }
    }
    checkboxesArray.forEach(checkbox => checkbox.checked = !isAllChecked)

    // 버튼 텍스트 변경
    checkAllButton.textContent = isAllChecked ? '전체 선택' : '전체 해제'
  }

  // 삭제 버튼 함수
  function deleteButtonFn() {
    const checkedBoxes = document.querySelectorAll('input[name="inpMemoCheckBox"]:checked')
    const deleteToIds = []

    // 체크된 메모들의 id 수집
    checkedBoxes.forEach(item => {
      const li = item.closest('.memo__item')
      // li 요소가 존재하는지 확인
      if (li !== null) {
        // li 요소의 data-memo-id 속성 값을 가져와 정수로 변환
        const memoId = parseInt(li.dataset.memoId)

        // 변환한 id를 삭제할 id 목록 배열에 추가
        deleteToIds.push(memoId)
      }
    })

    // 선택된 메모가 있다면 삭제하고, 없으면 삭제 모드만 토글
    // 사용자가 메모를 선택했을 때 배열에 id가 하나 이상 있으면 
    if (deleteToIds.length > 0) {
      const confirmed = confirm('메모를 정말 삭제하시겠습니까?')
      if (!confirmed) return // 취소를 누르면 삭제 중단

      // 메모 id가 포함된 배열이 없다면 거르기
      memoData = memoData.filter(memo => !deleteToIds.includes(memo.id))
      updateMainMemoListFn() // 화면에 다시 그리기
      updateDialogMemoListFn() // 팝업 내 메모리스트도 업데이트
      checkAllButton.textContent = '전체' // 텍스트 초기화

      deleteMode = false // 삭제 후 모두 초기화
    } else {
      deleteMode = !deleteMode
    }
  }

  // 팝업창 열림과 메모 id값에 따라서 메모의 정보가 들어가며 그렇지 않을 경우 빈 값으로 들어감
  function openDialogWithMemoId(memoId = null) {
    if (deleteMode) return // 삭제 모드에서는 팝업 금지

    if (memoId !== null) {
      // 기존 메모 열기
      const selectedMemo = memoData.find((memo) => memo.id === memoId)
      if (selectedMemo) {
        dialogTitleInput.value = selectedMemo.title
        dialogTextArea.value = selectedMemo.content
        dialogDateText.textContent = formatDate(selectedMemo.createdAt)
        dialogEditor.dataset.id = selectedMemo.id
      }
    } else {
      // 새 메모일 때 빈 입력란과 오늘 날짜만 표시
      dialogTitleInput.value = ''
      dialogTextArea.value = ''
      // 오늘 날짜만 표시
      const today = new Date()
      dialogDateText.textContent = `${today.getFullYear()}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getDate().toString().padStart(2, '0')}`
      delete dialogEditor.dataset.id
    }

    openDialog({ type: 'memo' })
  }

  // 날짜 포맷
  function formatDate(dateString) {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}.${month}.${day}`
  }

  // 전체 선택, 삭제, 팝업 열기 이벤트 위임으로 클릭 이벤트 리스너 추가
  document.addEventListener('click', (e) => {
    const allButton = e.target.closest('.memo__button--all')
    const deleteButton = e.target.closest('.memo__button--delete')
    const showDialogButton = e.target.closest('.show-dialog')

    // allBtn이 존재한다면 전체 선택, 해제 실행
    if (allButton !== null) {
      allCheckFn()
    }

    // delBtn이 존재한다면 삭제 실행
    if (deleteButton !== null) {
      deleteButtonFn()
    }

    if (!showDialogButton) return

    // memoId가 있는 경우 기존 메모 열고 그렇지 않을 경우 새 메모 열기
    const memoId = parseInt(showDialogButton.dataset.memoId)
    if (!isNaN(memoId)) {
      openDialogWithMemoId(memoId) // 기존 메모 열기
    } else {
      openDialogWithMemoId() // 새 메모 작성
    }
  })

  // 메인과 팝업창 추가 버튼 클릭 이벤트 리스너 추가
  dialogAddMemoBtn.addEventListener('click', () => {
    // 새 메모 작성을 위해 편집기 초기화
    delete dialogEditor.dataset.id // 기존 메모 ID 제거
    
    // 입력창 초기화
    dialogTitleInput.value = ''
    dialogTextArea.value = ''
    
    // 오늘 날짜 표시
    const dateText = document.querySelector('.dialog__date')
    const today = new Date()
    dateText.textContent = `${today.getFullYear()}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getDate().toString().padStart(2, '0')}`

    // 팝업 열기
    openDialog({ type: 'memo' })
  })

  // 팝업창 저장 버튼 클릭 이벤트 리스너 추가
  dialogSaveMemoBtn.addEventListener('click', () => {
    const title = dialogTitleInput.value.trim()
    const content = dialogTextArea.value.trim()
    const existingMemoId = parseInt(dialogEditor.dataset.id)

    // 제목과 내용이 비어 있으면 저장하지 않고 alert 실행
    if (!title || !content) {
      alert('제목과 내용을 입력해주세요.')
      return
    }

    // existingMemoId가 있고, 그 값이 숫자인지 확인하고 배열에서 찾아서 기존 메모 수정 그렇지 않으면 새 메모 추가(날짜는 현재)
    if (existingMemoId && !isNaN(existingMemoId)) {
      // 기존 메모 수정
      const memoIndex = memoData.findIndex(memo => memo.id === existingMemoId)
      // 찾은 인덱스값이 있다면 내용 수정
      if (memoIndex !== -1) {
        memoData[memoIndex].title = title
        memoData[memoIndex].content = content
        memoData[memoIndex].createdAt = new Date().toString() 

        // 팝업 날짜 텍스트도 갱신
        dialogDateText.textContent = formatDate(new Date())

        // 수정된 날짜로 업데이트하지 않고 원래 생성일 유지
        updateMainMemoListFn()
        updateDialogMemoListFn()
      }
    } else {
      // 새로운 메모 추가
      const newMemo = {
        id: Date.now(),
        title,
        content,
        createdAt: new Date().toString()
      }

      memoData.unshift(newMemo) // 기존메모의 앞에 추가
      updateMainMemoListFn() // 메인에 메모리스트 업데이트
      updateDialogMemoListFn() // 팝업창 메모리스트 업데이트

      // 저장 후 편집기 dataset에 새 id 할당
      dialogEditor.dataset.id = newMemo.id
    }
  })

  // 팝업창의 메모 저장시 팝업창 내 메모 리스트 업데이트 함수
  function updateDialogMemoListFn() {
    dialogMemoList.innerHTML = DOMPurify.sanitize('')

    // 메모 리스트 목록이 없을 경우
    const dialogNoData = document.querySelector('.dialog__memo-empty')

    if (memoData.length === 0) {
      if (dialogNoData) dialogNoData.style.display = 'block'
      return
    } else {
      if (dialogNoData) dialogNoData.style.display = 'none'
    }

    memoData.forEach(memo => {
      const li = document.createElement('li')
      li.className = 'dialog__memo-item'
      li.innerHTML = DOMPurify.sanitize(`
        <button type="button" class="dialog__memo-button" data-memo-id="${memo.id}">
          <span class="dialog__memo-name">${memo.title}</span>
        </button>
      `)
      dialogMemoList.appendChild(li)
    })
  }

  // 팝업창 메모 리스트 메모 클릭시 이벤트 리스너 추가
  dialogMemoList.addEventListener('click', (e) => {
    const dialogMemoButton = e.target.closest('.dialog__memo-button')
    if (!dialogMemoButton) return

    const memoId = parseInt(dialogMemoButton.dataset.memoId)
    if (isNaN(memoId)) return

    const selectedMemo = memoData.find(memo => memo.id === memoId)
    if (!selectedMemo) return

    const date = new Date(selectedMemo.createdAt)
    const formattedDate = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`

    dialogEditor.dataset.id = selectedMemo.id
    dialogDateText.textContent = formattedDate
    dialogTitleInput.value = selectedMemo.title
    dialogTextArea.value = selectedMemo.content
  })

  // 팝업창 삭제 버튼에 클릭 이벤트 리스너 추가
  dialogDeleteMemoButton.addEventListener('click', () => {
    const memoId = parseInt(dialogEditor.dataset.id) // 현재 보고 있는 메모 ID
    const title = dialogTitleInput.value.trim()
    const content = dialogTextArea.value.trim()

    // 저장되지 않은 상태에서 입력 내용이 있는 경우 alert 실행
    if (!memoId && (title || content)) {
      alert('먼저 저장 후 삭제할 수 있습니다.')
      return
    }

    // 삭제할 메모가 없을 경우 alert 실행
    if (!memoId) return alert('삭제할 메모가 없습니다.')

    const confirmed = confirm('이 메모를 정말 삭제하시겠습니까?')
    if (!confirmed) return

    // memoData에서 해당 메모 삭제
    memoData = memoData.filter(memo => memo.id !== memoId)

    // 메모 리스트 업데이트
    updateMainMemoListFn()
    updateDialogMemoListFn()

    // 팝업 입력란 초기화 및 오늘 날짜 표시
    dialogTitleInput.value = ''
    dialogTextArea.value = ''
    const today = new Date()
    dialogDateText.textContent = `
      ${today.getFullYear()}.${(today.getMonth() + 1)
      .toString()
      .padStart(2, '0')}.${today.getDate().toString().padStart(2, '0')}
    `

    // 현재 편집중인 메모 id 제거
    dialogEditor.removeAttribute('data-id')
  })

  // 60초마다 시간 업데이트
  setInterval(() => {
    getTimeAgoAllFn()
  }, 60000)
})()