const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const pauseBtn = document.getElementById("pause-btn");

// 캔버스 크기 설정
canvas.width = 800;
canvas.height = 300;

// 이미지 불러오기
const cactusImage = new Image();
cactusImage.src = "/img/dinosour/cactus.png";

const dinosourRunImage = new Image();
dinosourRunImage.src = "/img/dinosour/dinosour-run1.png";

const dinosourRun2Image = new Image();
dinosourRun2Image.src = "/img/dinosour/dinosour-run2.png";

const dinosourFailImage = new Image();
dinosourFailImage.src = "/img/dinosour/dinosour-fail.png";

const dinosourJumpImage = new Image();
dinosourJumpImage.src = "/img/dinosour/dinosour-jump.png";

// 게임 상태 변수
let gameStarted = false;
let nextCactusTimer = 0;
let cactusInterval = 200;
let gameSpeed = 1;
let gamePaused = false;

// 다크모드 전환에 따라 글자색이 바뀌도록 설정 - 함수로 변경
function getCurrentThirdColor() {
  return getComputedStyle(document.documentElement)
    .getPropertyValue("--third-color")
    .trim();
}

// 공룡 설정
const dino = {
  x: 10,
  y: 200,
  width: 50,
  height: 50,
  state: "run",
  draw() {
    let image;
    if (this.state === "jump") {
      image = dinosourJumpImage;
    } else if (this.state === "fail") {
      image = dinosourFailImage;
    } else {
      image =
        Math.floor(timer / 10) % 2 === 0 ? dinosourRunImage : dinosourRun2Image;
    }
    ctx.drawImage(image, this.x, this.y);
  },
};

// 장애물 설정
class Cactus {
  constructor() {
    this.x = 800;
    this.y = 200;
    this.width = 50;
    this.height = 50;
  }
  draw() {
    ctx.drawImage(cactusImage, this.x, this.y);
  }
}

// 타이머 및 장애물 배열
let timer = 0;
const cactuses = [];

let jumpSwitch = false;
let jumpTimer = 0;
let animation;
let gameOver = false;

// 스코어 표시 함수 수정 - 실시간으로 색상 가져오기
function drawScore() {
  const score = Math.floor(timer / 10);
  ctx.fillStyle = getCurrentThirdColor();
  ctx.font = "20px Arial";
  ctx.textAlign = "right";
  ctx.fillText(`Score: ${score}`, canvas.width - 20, 30);
}

// 게임오버 메시지 표시 함수 수정 - 실시간으로 색상 가져오기
function drawGameOver() {
  ctx.fillStyle = getCurrentThirdColor();
  ctx.font = "bold 36px Arial";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 20);

  ctx.fillStyle = "#666666";
  ctx.font = "18px Arial";
  ctx.fillText(
    "Press SPACE to restart",
    canvas.width / 2,
    canvas.height / 2 + 20
  );
}

// 일시정지 메시지 표시 함수 수정 - 실시간으로 색상 가져오기
function drawPaused() {
  ctx.fillStyle = getCurrentThirdColor();
  ctx.font = "bold 36px Arial";
  ctx.textAlign = "center";
  ctx.fillText("PAUSE", canvas.width / 2, canvas.height / 2 - 20);

  ctx.fillStyle = "#666666";
  ctx.font = "18px Arial";
  ctx.fillText(
    "Click PAUSE button to resume",
    canvas.width / 2,
    canvas.height / 2 + 20
  );
}

// 게임 초기화 함수
function resetGame() {
  timer = 0;
  cactuses.length = 0;
  jumpSwitch = false;
  jumpTimer = 0;
  gameOver = false;
  gamePaused = false;
  dino.y = 200;
  dino.state = "run";
  nextCactusTimer = 0;
  cactusInterval = 200;
  gameSpeed = 1;
}

// 게임 일시정지 함수
function togglePause() {
  if (gameStarted && !gameOver) {
    gamePaused = !gamePaused;

    if (gamePaused) {
      pauseBtn.textContent = "이어서하기";
    } else {
      pauseBtn.textContent = "일시정지";
    }
  }
}

// 게임 시작 함수
function startGame() {
  gameStarted = true;
  startBtn.disabled = true;
  restartBtn.disabled = false;
  pauseBtn.disabled = false;
  pauseBtn.textContent = "Pause";
  resetGame();
  frame();
}

// 게임 재시작 함수
function restartGame() {
  if (animation) cancelAnimationFrame(animation);
  resetGame();
  gameStarted = true;
  startBtn.disabled = true;
  restartBtn.disabled = false;
  pauseBtn.disabled = false;
  pauseBtn.textContent = "Pause";
  frame();
}

// 게임 프레임
function frame() {
  animation = requestAnimationFrame(frame);

  if (gameStarted && !gameOver && !gamePaused) {
    timer++;
    gameSpeed = 2 + Math.floor(timer / 500) * 0.3;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (gameStarted && !gameOver && !gamePaused) {
    nextCactusTimer++;
    if (nextCactusTimer >= cactusInterval) {
      const cactus = new Cactus();
      cactuses.push(cactus);
      nextCactusTimer = 0;
      cactusInterval = Math.floor(Math.random() * 180) + 120;
    }
  }

  cactuses.forEach((a, i, o) => {
    if (a.x < 0) o.splice(i, 1);
    if (gameStarted && !gameOver && !gamePaused) a.x -= gameSpeed;
    crash(dino, a);
    a.draw();
  });

  if (gameStarted && !gameOver && !gamePaused) {
    if (jumpSwitch === true) {
      dino.y -= 5;
      jumpTimer++;
      dino.state = "jump";
    } else {
      if (dino.y < 200) {
        dino.y += 5;
        dino.state = "jump";
      } else {
        dino.state = "run";
      }
    }

    if (jumpTimer > 40) {
      jumpSwitch = false;
      jumpTimer = 0;
    }
  }

  dino.draw();

  // 스코어 표시 추가
  if (gameStarted) {
    drawScore();
  }

  // 게임오버 메시지 표시 추가
  if (gameOver) {
    drawGameOver();
  }

  // 일시정지 메시지 표시 추가
  if (gamePaused) {
    drawPaused();
  }
}

// 충돌 확인
function crash(dino, cactus) {
  const xSub = cactus.x - (dino.x + dino.width);
  const ySub = cactus.y - (dino.y + dino.height);
  if (xSub < 0 && ySub < 0 && !gameOver) {
    dino.state = "fail";
    gameOver = true;
    pauseBtn.disabled = true;
    setTimeout(() => cancelAnimationFrame(animation), 100);
  }
}

// 키보드 이벤트 (스페이스바) <- 모달창 작동 안할때도 적용되는 부분 수정
document.addEventListener("keydown", function (e) {
  if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;

  if (!gameModal || !gameModal.open) return;

  if (e.code === "Space") {
    e.preventDefault();

    if (!gameStarted) {
      startGame();
    } else if (gameOver) {
      restartGame();
    } else if (gameStarted && !gameOver && !gamePaused && dino.y >= 200) {
      jumpSwitch = true;
    }
  }
});

// 버튼 이벤트
startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", restartGame);
pauseBtn.addEventListener("click", togglePause);

// 초기 화면
function drawInitialScreen() {
  if (!gameStarted) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    dino.draw();
    requestAnimationFrame(drawInitialScreen);
  }
}
drawInitialScreen();

// -----------------------------------------------------------------------------------
// 모달창 제어 기능
const modalStartBtn = document.querySelector(".modal-start__btn");
const modalEndBtn = document.querySelector(".modal-end__btn");
const gameModal = document.querySelector(".dino-game__modal__canvas");

// 페이지 로드 시 모달창 숨기기
document.addEventListener("DOMContentLoaded", function () {
  if (gameModal) {
    gameModal.style.display = "none";
  }
});

// 게임하기 버튼 클릭 시 모달창 열기
if (modalStartBtn) {
  modalStartBtn.addEventListener("click", () => {
    if (gameModal) {
      gameModal.style.display = "block";
      gameModal.showModal();
    }
  });
}

// 게임나가기 버튼 클릭 시 모달창 닫기
if (modalEndBtn) {
  modalEndBtn.addEventListener("click", () => {
    if (gameModal) {
      gameModal.close();
      gameModal.style.display = "none";
    }
    if (!gamePaused && gameStarted && !gameOver) {
      togglePause();
    }
  });
}

// 다크모드 감지
const darkModeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

darkModeMediaQuery.addEventListener("change", () => {
  if (gameOver) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    dino.draw();
    drawScore();
    drawGameOver(); 
  } else if (gamePaused) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    dino.draw();
    drawScore();
    drawPaused(); 
  }
});
