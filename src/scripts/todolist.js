/* global DOMPurify */

const todoListForm = document.querySelector('.todo-list');
const todoList = document.querySelector('.todo-list__item');


todoListForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const form = e.currentTarget;

  const input = form.querySelector('[name="new-task"]')
  const taskContent = input.value.trim()

  if(!taskContent) return

  const newTask = createTask(taskContent)
  todoList.append(newTask)
  form.reset()


})


function createTask(content) {
  const taskElement = document.createElement('li')
  taskElement.classList.add('task')

  const uniqueId = generateUniqueId(10)

  taskElement.innerHTML = DOMPurify.sanitize(/* html */`
    <span class="task-text">${content}</span>
    <div class="form-checkbox_bg-icon">
      <input type="checkbox" id="${uniqueId}" name="${uniqueId}" />
      <label for="${uniqueId}"></label>
    </div>
  `)

  return taskElement
}


  function generateUniqueId(length = 5) {
    return Math.random().toString(36).substring(2, length + 2)
  }

// 할 일 달성 체크(체크박스)시, 비활성화 (새로 추가되는 항목도 적용되도록 위임사용)
todoListForm.addEventListener('change', (e) => {
  if (e.target.matches('input[type="checkbox"]')) {
    const task = e.target.closest('.task');
    const text = task.querySelector('.task-text');

    if (e.target.checked) {
      text.classList.add('done')
    } else {
      text.classList.remove('done')
    }
  }
})

// 초기화 (전체삭제)
const resetBtn = document.querySelector('.todo-list__reset')
const removeSelectedBtn = document.querySelector('.todo-list__remove')

resetBtn.addEventListener('click', (e) => {
  e.preventDefault();
  const tasks = todoList.querySelectorAll('.task');
  tasks.forEach(task => task.remove());
});

// 할 일 삭제 - checked 된 항목만
removeSelectedBtn.addEventListener('click', () => {
  const tasks = todoList.querySelectorAll('.task');
  tasks.forEach((task) => {
    const checkbox = task.querySelector('input[type="checkbox"]');
    if (checkbox && checkbox.checked) {
      task.remove();
    }
  })
})



// ------------------------------------------------------------------------------
// 팝오버 창

// 설정 버튼 클릭시 팝오버 나오게 구현
const popoverTrigger = document.querySelector('.todo-list__popover-trigger')
const popover = document.querySelector('.todo-list__popover')



popover.setAttribute('hidden', 'true'); 

// 클릭시 팝오버 on/off
popoverTrigger.addEventListener('click', () => {
  if (popover.hasAttribute('hidden')) {
    popover.removeAttribute('hidden');
  } else {
    popover.setAttribute('hidden', 'true')
  }
})

// 팝오버 외부 클릭 시 닫기
document.addEventListener('click', (e) => {
  if (!popover.contains(e.target) && !popoverTrigger.contains(e.target)) {
    popover.setAttribute('hidden', 'true')
  }
})
