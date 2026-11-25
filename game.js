const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const partsText = document.getElementById("parts");
const batteryText = document.getElementById("battery");
const zoneLabel = document.getElementById("zone-label");
const message = document.getElementById("message");

const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayText = document.getElementById("overlay-text");
const startBtn = document.getElementById("start");

const storyBox = document.getElementById("story");
const storyText = document.getElementById("story-text");
const storyNext = document.getElementById("story-next");

const stick = document.getElementById("stick");
const knob = document.getElementById("knob");
const flashBtn = document.getElementById("flash");

const W = 900;
const H = 600;

let running = false;
let ended = false;
let flashlight = true;
let battery = 100;
let totalParts = 0;
let zone = 0;
let keycard = false;
let lastTime = 0;
let dialogueQueue = [];
let dialogueCallback = null;

const player = {
  x: 110,
  y: 300,
  radius: 15,
  speed: 190,
  dx: 1,
  dy: 0
};

const monster = {
  x: 760,
  y: 300,
  speed: 48,
  active: false
};

let joystick = { x: 0, y: 0 };
let keys = {};
let items = [];
let walls = [];
let exit = { x: 820, y: 300 };
let collected = 0;

const zones = [
  {
    name: "ПОДВАЛ",
    intro: "Ты спускаешься в подвал. В воздухе пахнет сыростью. Рация оживает: «Найди два предохранителя. Не шуми».",
    walls: [
      [230, 80, 30, 190],
      [230, 370, 30, 150],
      [420, 0, 30, 210],
      [420, 340, 30, 260],
      [620, 120, 30, 190],
      [620, 420, 30, 180]
    ],
    items: [
      { x: 340, y: 140, type: "fuse" },
      { x: 540, y: 470, type: "fuse" },
      { x: 150, y: 500, type: "battery" },
      { x: 700, y: 100, type: "battery" }
    ]
  },
  {
    name: "ЛАБОРАТОРИЯ",
    intro: "Лаборатория выглядит так, будто её покинули несколько минут назад. На столах лежат документы. Кто-то наблюдает за тобой.",
    walls: [
      [190, 0, 30, 220],
      [190, 350, 30, 250],
      [390, 100, 30, 250],
      [390, 450, 30, 150],
      [590, 0, 30, 170],
      [590, 300, 30, 300],
      [740, 150, 30, 280]
    ],
    items: [
      { x: 300, y: 470, type: "fuse" },
      { x: 510, y: 200, type: "fuse" },
      { x: 290, y: 120, type: "battery" },
      { x: 700, y: 500, type: "battery" }
    ]
  },
  {
    name: "АРХИВ",
    intro: "В архиве ты находишь папку с надписью «АЛЕКС». Внутри — фотография человека, очень похожего на тебя. Рядом лежит ключ-карта.",
    walls: [
      [210, 100, 30, 400],
      [390, 0, 30, 200],
      [390, 330, 30, 270],
      [570, 100, 30, 400],
      [740, 0, 30, 210],
      [740, 390, 30, 210]
    ],
    items: [
      { x: 310, y: 260, type: "fuse" },
      { x: 670, y: 300, type: "fuse" },
      { x: 490, y: 480, type: "key" },
      { x: 120, y: 130, type: "battery" }
    ]
  }
];

function showStory(text, callback) {
  running = false;
  storyText.textContent = text;
  storyBox.classList.remove("hidden");
  dialogueCallback = callback || null;
}

function hideStory() {
  storyBox.classList.add("hidden");
  const callback = dialogueCallback;
  dialogueCallback = null;

  if (callback) callback();
  else if (!ended && overlay.style.display === "none") running = true;
}

storyNext.addEventListener("click", hideStory);

function loadZone(number) {
  zone = number;
  const data = zones[zone];

  walls = data.walls.map(w => [...w]);
  items = data.items.map(item => ({ ...item, taken: false }));
  collected = 0;

  player.x = 100;
  player.y = 300;

  monster.x = 770;
  monster.y = 300;
  monster.speed = 48 + zone * 22;
  monster.active = zone > 0;

  exit = { x: 830, y: 300 };

  zoneLabel.textContent = data.name;
  message.textContent = "Найди два предохранителя и доберись до выхода.";

  showStory(data.intro);
}

function startGame() {
  battery = 100;
  totalParts = 0;
  keycard = false;
  flashlight = true;
  ended = false;

  player.x = 100;
  player.y = 300;
  player.dx = 1;
  player.dy = 0;

  overlay.style.display = "none";
  loadZone(0);
}

startBtn.addEventListener("click", startGame);

function finishGame() {
  running = false;
  ended = true;
  overlay.style.display = "flex";
  overlayTitle.textContent = "СМЕНА ЗАВЕРШЕНА";
  overlayText.textContent =
    "Ты добрался до выхода. Но на последней странице архива была запись: «Объект АЛЕКС. Эксперимент продолжается». За дверью слышны шаги.";
  startBtn.textContent = "ИГРАТЬ СНОВА";
}

function nextZone() {
  if (zone === 0) {
    loadZone(1);
  } else if (zone === 1) {
    loadZone(2);
  } else {
    finishGame();
  }
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function collides(x, y, radius) {
  if (x < radius || y < radius || x > W - radius || y > H - radius) {
    return true;
  }

  return walls.some(w =>
    x + radius > w[0] &&
    x - radius < w[0] + w[2] &&
    y + radius > w[1] &&
    y - radius < w[1] + w[3]
  );
}

function movePlayer(dt) {
  let mx = joystick.x;
  let my = joystick.y;

  if (keys.ArrowLeft || keys.a) mx -= 1;
  if (keys.ArrowRight || keys.d) mx += 1;
  if (keys.ArrowUp || keys.w) my -= 1;
  if (keys.ArrowDown || keys.s) my += 1;

  const length = Math.hypot(mx, my);

  if (length > 1) {
    mx /= length;
    my /= length;
  }

  if (length > 0.05) {
    player.dx = mx;
    player.dy = my;

    const nx = player.x + mx * player.speed * dt;
    const ny = player.y + my * player.speed * dt;

    if (!collides(nx, player.y, player.radius)) player.x = nx;
    if (!collides(player.x, ny, player.radius)) player.y = ny;
  }
}

function updateItems() {
  for (const item of items) {
    if (item.taken) continue;

    if (distance(player, item) < 30) {
      item.taken = true;

      if (item.type === "fuse") {
        totalParts++;
        collected++;
        message.textContent = "Предохранитель найден!";
      }

      if (item.type === "battery") {
        battery = Math.min(100, battery + 35);
        message.textContent = "Батарея заряжена!";
      }

      if (item.type === "key") {
        keycard = true;
        message.textContent = "Найдена ключ-карта!";
      }
    }
  }

  partsText.textContent = totalParts + "/6";
  batteryText.textContent = Math.round(battery) + "%";
}

function updateMonster(dt) {
  if (!monster.active) return;

  const d = distance(player, monster);

  if (d < 400) {
    const dx = (player.x - monster.x) / (d || 1);
    const dy = (player.y - monster.y) / (d || 1);

    const speed = monster.speed * (d < 180 ? 1.2 : 1);

    const nx = monster.x + dx * speed * dt;
    const ny = monster.y + dy * speed * dt;

    if (!collides(nx, monster.y, 17)) monster.x = nx;
    if (!collides(monster.x, ny, 17)) monster.y = ny;
  }

  if (d < 28) {
    running = false;
    ended = true;
    overlay.style.display = "flex";
    overlayTitle.textContent = "ТЫ НЕ ОДИН";
    overlayText.textContent =
      "Что-то схватило тебя в темноте. Рация продолжает работать: «Следующий охранник прибудет через час...»";
    startBtn.textContent = "ПОПРОБОВАТЬ СНОВА";
  }
}

function update(dt) {
  movePlayer(dt);

  if (flashlight) {
    battery -= 0.65 * dt;
    if (battery <= 0) {
      battery = 0;
      flashlight = false;
      message.textContent = "Батарея разряжена!";
    }
  }

  updateItems();
  updateMonster(dt);

  const nearExit = distance(player, exit) < 42;

  if (nearExit) {
    if (collected < 2) {
      message.textContent = "Сначала найди оба предохранителя!";
    } else if (zone === 2 && !keycard) {
      message.textContent = "Дверь закрыта. Найди ключ-карту!";
    } else {
      message.textContent = "Нажми на выход, чтобы продолжить.";
    }
  }

  batteryText.textContent = Math.round(battery) + "%";
}

function drawFloor() {
  ctx.fillStyle = "#10191c";
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "#1b292d";
  ctx.lineWidth = 1;

  for (let x = 0; x < W; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }

  for (let y = 0; y < H; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
}

function drawWalls() {
  for (const w of walls) {
    ctx.fillStyle = "#354247";
    ctx.fillRect(w[0], w[1], w[2], w[3]);

    ctx.fillStyle = "#1b262b";
    ctx.fillRect(w[0] + 5, w[1] + 5, w[2] - 10, w[3] - 10);
  }
}

function drawItems() {
  for (const item of items) {
    if (item.taken) continue;

    ctx.save();
    ctx.shadowBlur = 18;

    if (item.type === "fuse") {
      ctx.fillStyle = "#ffd45a";
      ctx.shadowColor = "#ffbd38";
      ctx.fillRect(item.x - 8, item.y - 13, 16, 26);
      ctx.fillStyle = "#fff2bd";
      ctx.fillRect(item.x - 4, item.y - 8, 8, 16);
    }

    if (item.type === "battery") {
      ctx.fillStyle = "#54dfb1";
      ctx.shadowColor = "#54dfb1";
      ctx.fillRect(item.x - 9, item.y - 13, 18, 26);
      ctx.fillStyle = "#d9fff0";
      ctx.fillRect(item.x - 4, item.y - 7, 8, 14);
    }

    if (item.type === "key") {
      ctx.fillStyle = "#68cfff";
      ctx.shadowColor = "#68cfff";
      ctx.beginPath();
      ctx.arc(item.x, item.y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(item.x - 3, item.y, 6, 15);
    }

    ctx.restore();
  }
}

function drawExit() {
  ctx.fillStyle = "#3a5554";
  ctx.fillRect(exit.x - 22, exit.y - 38, 44, 76);

  ctx.strokeStyle = "#83b4a1";
  ctx.lineWidth = 3;
  ctx.strokeRect(exit.x - 22, exit.y - 38, 44, 76);

  ctx.fillStyle = "#c5e7c9";
  ctx.font = "bold 15px Arial";
  ctx.fillText("ВЫХОД", exit.x - 25, exit.y - 48);
}

function drawPlayer() {
  ctx.save();

  ctx.shadowColor = "#b8d9e8";
  ctx.shadowBlur = 12;

  ctx.fillStyle = "#d1dce0";
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#344b57";
  ctx.beginPath();
  ctx.arc(player.x, player.y, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawMonster() {
  if (!monster.active) return;

  ctx.save();
  ctx.shadowColor = "#b00000";
  ctx.shadowBlur = 25;

  ctx.fillStyle = "#351015";
  ctx.beginPath();
  ctx.arc(monster.x, monster.y, 19, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ff2929";
  ctx.fillRect(monster.x - 9, monster.y - 5, 5, 4);
  ctx.fillRect(monster.x + 4, monster.y - 5, 5, 4);

  ctx.restore();
}

function drawDarkness() {
  ctx.save();

  ctx.fillStyle = "rgba(0,0,0,0.94)";
  ctx.fillRect(0, 0, W, H);

  ctx.globalCompositeOperation = "destination-out";

  // Мягкое свечение вокруг игрока
  const glow = ctx.createRadialGradient(
    player.x, player.y, 5,
    player.x, player.y, flashlight ? 175 : 65
  );

  glow.addColorStop(0, "rgba(255,255,255,0.95)");
  glow.addColorStop(0.35, "rgba(255,255,255,0.65)");
  glow.addColorStop(0.75, "rgba(255,255,255,0.18)");
  glow.addColorStop(1, "rgba(255,255,255,0)");

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(
    player.x, player.y,
    flashlight ? 175 : 65,
    0, Math.PI * 2
  );
  ctx.fill();

  // Дальний широкий луч фонарика
  if (flashlight) {
    const angle = Math.atan2(player.dy, player.dx);
    const reach = 570;
    const spread = 0.72;

    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.arc(
      player.x,
      player.y,
      reach,
      angle - spread,
      angle + spread
    );
    ctx.closePath();

    const beam = ctx.createRadialGradient(
      player.x, player.y, 25,
      player.x, player.y, reach
    );

    beam.addColorStop(0, "rgba(255,255,255,0.95)");
    beam.addColorStop(0.45, "rgba(255,255,255,0.62)");
    beam.addColorStop(0.8, "rgba(255,255,255,0.24)");
    beam.addColorStop(1, "rgba(255,255,255,0)");

    ctx.fillStyle = beam;
    ctx.fill();
  }

  ctx.restore();
}

function draw() {
  drawFloor();
  drawExit();
  drawWalls();
  drawItems();
  drawMonster();
  drawPlayer();
  drawDarkness();

  if (zone === 2 && keycard) {
    ctx.fillStyle = "#9bdcff";
    ctx.font = "16px Arial";
    ctx.fillText("КЛЮЧ-КАРТА: ЕСТЬ", 20, 35);
  }
}

function loop(time) {
  const dt = Math.min((time - lastTime) / 1000 || 0, 0.04);
  lastTime = time;

  if (running) update(dt);

  draw();
  requestAnimationFrame(loop);
}

function setJoystick(event) {
  const rect = stick.getBoundingClientRect();

  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  let dx = event.clientX - cx;
  let dy = event.clientY - cy;

  const max = rect.width * 0.34;
  const length = Math.hypot(dx, dy);

  if (length > max) {
    dx = dx / length * max;
    dy = dy / length * max;
  }

  joystick.x = dx / max;
  joystick.y = dy / max;

  knob.style.transform = `translate(${dx}px, ${dy}px)`;
}

stick.addEventListener("pointerdown", event => {
  stick.setPointerCapture(event.pointerId);
  setJoystick(event);
});

stick.addEventListener("pointermove", event => {
  if (event.buttons) setJoystick(event);
});

function resetJoystick() {
  joystick.x = 0;
  joystick.y = 0;
  knob.style.transform = "translate(0, 0)";
}

stick.addEventListener("pointerup", resetJoystick);
stick.addEventListener("pointercancel", resetJoystick);

flashBtn.addEventListener("click", () => {
  if (!running || battery <= 0) return;

  flashlight = !flashlight;
  flashBtn.style.opacity = flashlight ? "1" : "0.45";
});

canvas.addEventListener("click", event => {
  if (!running) return;

  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * W / rect.width;
  const y = (event.clientY - rect.top) * H / rect.height;

  if (distance({ x, y }, exit) < 55 && collected >= 2) {
    if (zone === 2 && !keycard) {
      message.textContent = "Нужна ключ-карта!";
      return;
    }

    nextZone();
  }
});

window.addEventListener("keydown", event => {
  keys[event.key] = true;
});

window.addEventListener("keyup", event => {
  keys[event.key] = false;
});

window.addEventListener("blur", () => {
  keys = {};
  resetJoystick();
});

requestAnimationFrame(loop);