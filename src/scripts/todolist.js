/* global DOMPurify */

const todoListForm = document.querySelector(".todo-list");
const todoList = document.querySelector(".todo-list__item");
const resetBtn = document.querySelector(".todo-list__reset");
const removeSelectedBtn = document.querySelector(".todo-list__remove");

// DB 연결
const dbPromise = new Promise((resolve, reject) => {
  const request = indexedDB.open("todoDB", 1);

  request.onupgradeneeded = (e) => {
    const dbInstance = e.target.result;
    if (!dbInstance.objectStoreNames.contains("todos")) {
      dbInstance.createObjectStore("todos", {
        keyPath: "id",
        autoIncrement: true,
      });
    }
  };

  request.onsuccess = (e) => {
    console.log("DB 연결 성공");
    resolve(e.target.result);
  };

  request.onerror = () => {
    console.error("DB 연결 실패");
    reject(request.error);
  };
});

// 초기 로드
dbPromise.then(() => loadTodos()).catch((err) => console.error(err));

// 할 일 추가
todoListForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const input = e.currentTarget.querySelector('[name="new-task"]');
  const taskContent = input.value.trim();
  if (!taskContent) return;

  addTodo(taskContent);
  e.currentTarget.reset();
});

async function addTodo(content) {
  const db = await dbPromise;
  const tx = db.transaction("todos", "readwrite");
  const store = tx.objectStore("todos");
  const todo = { content, isDone: false };
  store.add(todo);

  tx.oncomplete = () => loadTodos();
}

//  할 일 리스트 불러오기
async function loadTodos() {
  const db = await dbPromise;
  const tx = db.transaction("todos", "readonly");
  const store = tx.objectStore("todos");
  const request = store.getAll();

  request.onsuccess = () => {
    renderTodos(request.result);
  };
}

//  렌더링
function renderTodos(todos) {
  todoList.innerHTML = "";
  todos.forEach((todo) => {
    const li = document.createElement("li");
    li.className = "task";

    const uniqueId = `task-${todo.id}`;

    li.innerHTML = DOMPurify.sanitize(`
      <span class="task-text ${todo.isDone ? "done" : ""}">${todo.content}</span>
      <div class="form-checkbox_bg-icon">
        <input type="checkbox" id="${uniqueId}" ${todo.isDone ? "checked" : ""} data-id="${todo.id}" />
        <label for="${uniqueId}"></label>
      </div>
    `);

    todoList.appendChild(li);
  });
}

// 체크박스 토글 (isDone 업데이트)
todoList.addEventListener("change", async (e) => {
  if (e.target.matches('input[type="checkbox"]')) {
    const id = Number(e.target.dataset.id);
    const isDone = e.target.checked;

    const db = await dbPromise;
    const tx = db.transaction("todos", "readwrite");
    const store = tx.objectStore("todos");
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const todo = getReq.result;
      if (!todo) return;
      todo.isDone = isDone;
      store.put(todo);
      loadTodos();
    };
  }
});

//  전체 삭제
resetBtn.addEventListener("click", async () => {
  const db = await dbPromise;
  const tx = db.transaction("todos", "readwrite");
  const store = tx.objectStore("todos");
  const clearReq = store.clear();

  clearReq.onsuccess = () => loadTodos();
});

// 체크된 항목만 삭제
removeSelectedBtn.addEventListener("click", async () => {
  const checkboxes = todoList.querySelectorAll(
    'input[type="checkbox"]:checked'
  );
  if (checkboxes.length === 0) return;

  const db = await dbPromise;
  const tx = db.transaction("todos", "readwrite");
  const store = tx.objectStore("todos");

  checkboxes.forEach((checkbox) => {
    const id = Number(checkbox.dataset.id);
    store.delete(id);
  });

  tx.oncomplete = () => loadTodos();
});

//  팝오버 열고 닫기
const popoverTrigger = document.querySelector(".todo-list__popover-trigger");
const popover = document.querySelector(".todo-list__popover");

popover.setAttribute("hidden", "true");

popoverTrigger.addEventListener("click", () => {
  if (popover.hasAttribute("hidden")) {
    popover.removeAttribute("hidden");
  } else {
    popover.setAttribute("hidden", "true");
  }
});

document.addEventListener("click", (e) => {
  if (!popover.contains(e.target) && !popoverTrigger.contains(e.target)) {
    popover.setAttribute("hidden", "true");
  }
});
