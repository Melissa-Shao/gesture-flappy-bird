const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const GAME_WIDTH = canvas.width;
const GAME_HEIGHT = canvas.height;
const GROUND_HEIGHT = 80;

const bgImage = new Image();
bgImage.src = "assets/background.png";

const birdFrames = [];
const bird1 = new Image();
bird1.src = "assets/redbird-upflap.png";

const bird2 = new Image();
bird2.src = "assets/redbird-midflap.png";

const bird3 = new Image();
bird3.src = "assets/redbird-downflap.png";

birdFrames.push(bird1);
birdFrames.push(bird2);
birdFrames.push(bird3);

const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");

const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

const finalScore = document.getElementById("finalScore");

let gameStarted = false;
let gameOver = false;
let animationId = null;

let score = 0;
let frameCount = 0;
let birdFrameIndex = 0;
let birdAnimationSpeed = 6;
let bgX = 0;
let bgSpeed = 0.5;

const bird = {
  x: 100,
  y: 250,
  radius: 16,
  velocity: 0,
  gravity: 0.045,
  jumpStrength: -2.2,
  maxFallSpeed: 3.2,
};

const pipeConfig = {
  width: 60,
  gap: 220,
  speed: 1.25,
  spawnInterval: 220,
};

let pipes = [];

function resetGame() {
  bird.y = 250;
  bird.velocity = 0;

  pipes = [];
  frameCount = 0;
  score = 0;

  gameOver = false;

  gameOverScreen.classList.add("hidden");

  if (animationId) {
    cancelAnimationFrame(animationId);
  }

  gameLoop();
}

function jump() {
  if (!gameStarted || gameOver) return;
  bird.velocity = bird.jumpStrength;
  if (bird.velocity < -3.2) {
    bird.velocity = -3.2;
  }
}

function createPipe() {
  const minTopHeight = 120;
  const maxTopHeight = GAME_HEIGHT - GROUND_HEIGHT - pipeConfig.gap - 120;

  const topHeight =
    Math.floor(Math.random() * (maxTopHeight - minTopHeight + 1)) +
    minTopHeight;

  pipes.push({
    x: GAME_WIDTH,
    topHeight,
    bottomY: topHeight + pipeConfig.gap,
    passed: false,
  });
}

function updateBird() {
  bird.velocity += bird.gravity;

  if (bird.velocity > bird.maxFallSpeed) {
    bird.velocity = bird.maxFallSpeed;
  }

  bird.y += bird.velocity;

  const birdTop = bird.y - bird.radius;
  const birdBottom = bird.y + bird.radius;

  if (birdTop <= 0) {
    bird.y = bird.radius;
    bird.velocity = 0;
  }

  if (birdBottom >= GAME_HEIGHT - GROUND_HEIGHT) {
    bird.y = GAME_HEIGHT - GROUND_HEIGHT - bird.radius;
    endGame();
  }

  if (frameCount > 120 && frameCount % birdAnimationSpeed === 0) {
    birdFrameIndex++;
    if (birdFrameIndex >= birdFrames.length) {
      birdFrameIndex = 0;
    }
  }
}

function updatePipes() {
  frameCount++;

  if (frameCount % pipeConfig.spawnInterval === 0) {
    createPipe();
  }

  for (let pipe of pipes) {
    pipe.x -= pipeConfig.speed;

    if (!pipe.passed && pipe.x + pipeConfig.width < bird.x) {
      pipe.passed = true;
      score++;
    }
  }

  pipes = pipes.filter((pipe) => pipe.x + pipeConfig.width > 0);
}

function checkCollision() {
  for (let pipe of pipes) {
    const birdLeft = bird.x - bird.radius;
    const birdRight = bird.x + bird.radius;
    const birdTop = bird.y - bird.radius;
    const birdBottom = bird.y + bird.radius;

    const pipeLeft = pipe.x;
    const pipeRight = pipe.x + pipeConfig.width;

    const hitHorizontally = birdRight > pipeLeft && birdLeft < pipeRight;

    const hitTopPipe = birdTop < pipe.topHeight;
    const hitBottomPipe = birdBottom > pipe.bottomY;

    if (hitHorizontally && (hitTopPipe || hitBottomPipe)) {
      endGame();
      return;
    }
  }
}

function endGame() {
  gameOver = true;

  finalScore.innerText = "Score: " + score;

  gameOverScreen.classList.remove("hidden");
}

function drawBackground() {
  if (bgImage.complete) {
    ctx.drawImage(bgImage, bgX, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.drawImage(bgImage, bgX + GAME_WIDTH, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  ctx.fillStyle = "#d9c27c";
  ctx.fillRect(0, GAME_HEIGHT - GROUND_HEIGHT, GAME_WIDTH, GROUND_HEIGHT);
}
function drawBird() {
  const frame = birdFrames[birdFrameIndex];
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.velocity * 0.05);
  ctx.drawImage(frame, -24, -24, 48, 48);
  ctx.restore();
}

function drawPipes() {
  ctx.fillStyle = "#2f9e44";

  for (let pipe of pipes) {
    ctx.fillRect(pipe.x, 0, pipeConfig.width, pipe.topHeight);

    ctx.fillRect(
      pipe.x,
      pipe.bottomY,
      pipeConfig.width,
      GAME_HEIGHT - GROUND_HEIGHT - pipe.bottomY,
    );

    ctx.fillRect(pipe.x - 4, pipe.topHeight - 14, pipeConfig.width + 8, 14);
    ctx.fillRect(pipe.x - 4, pipe.bottomY, pipeConfig.width + 8, 14);
  }
}

function drawScore() {
  ctx.fillStyle = "white";
  ctx.font = "28px 'Press Start 2P'";
  ctx.textAlign = "center";
  ctx.fillText(score, GAME_WIDTH / 2, 60);
}

function draw() {
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  drawBackground();
  drawPipes();
  drawBird();
  drawScore();
}

function update() {
  if (!gameStarted || gameOver) return;

  updateBird();
  updatePipes();
  checkCollision();

  bgX -= bgSpeed;
  if (bgX <= -GAME_WIDTH) {
    bgX = 0;
  }
}

function gameLoop() {
  update();
  draw();

  animationId = requestAnimationFrame(gameLoop);
}

document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    jump();
  }
});

startBtn.onclick = () => {
  startScreen.classList.add("hidden");

  gameStarted = true;
};

restartBtn.onclick = () => {
  gameOverScreen.classList.add("hidden");

  resetGame();

  gameStarted = true;
};

window.triggerBirdJump = jump;

resetGame();
