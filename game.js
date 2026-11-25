const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const W = 900;
const H = 600;

const $ = id => document.getElementById(id);

const partsText = $("parts");
const batteryText = $("battery");
const zoneLabel = $("zone-label");
const message = $("message");
const overlay = $("overlay");
const overlayTitle = $("overlay-title");
const overlayText = $("overlay-text");
const startBtn = $("start");
const storyBox = $("story");
const storyText = $("story-text");
const storyNext = $("story-next");
const stick = $("stick");
const knob = $("knob");
const flashBtn = $("flash");

let running = false;
let ended = false;
let flashlight = true;
let battery = 100;
let totalParts = 0;
let zone = 0;
let keycard = false;
let collected = 0;
let lastTime = 0;
let joystick = { x: 0, y: 0 };
let keys = {};
let walls = [];
let items = [];
let exit = { x: 840, y: 300 };
let flicker = 0;

const player = {
  x: 110,
  y: 300,
  radius: 13,
  speed: 185,
  dx: 1,
  dy: 0
};

const monster = {
  x: 640,
  y: 300,
  speed: 40,
  active: false,
  anim: 0
};

const zones = [
  {
    name: "ПОДВАЛ",
    intro: "23:47. Ты спускаешься в подвал комплекса. Рация трещит: «Алекс, найди два предохранителя. И ещё... если увидишь человека в коридоре — не подходи».",
    walls: [
      [220, 60, 32, 205],
      [220, 365, 32, 175],
      [410, 0, 32, 205],
      [410, 330, 32, 270],
      [620, 95, 32, 180],
      [620, 370, 32, 230]
    ],
    items: [
      { x: 340, y: 145, type: "fuse" },
      { x: 520, y: 465, type: "fuse" },
      { x: 130, y: 500, type: "battery" },
      { x: 700, y: 80, type: "battery" }
    ]
  },
  {
    name: "ЛАБОРАТОРИЯ",
    intro: "Ты входишь в лабораторию. На стенах висят фотографии сотрудников. На одной фотографии ты узнаёшь себя, хотя никогда здесь не работал.",
    walls: [
      [185, 0, 32, 205],
      [185, 360, 32, 240],
      [390, 95, 32, 245],
      [390, 435, 32, 165],
      [590, 0, 32, 165],
      [590, 300, 32, 300],
      [750, 130, 32, 260]
    ],
    items: [
      { x: 300, y: 475, type: "fuse" },
      { x: 500, y: 190, type: "fuse" },
      { x: 290, y: 110, type: "battery" },
      { x: 690, y: 500, type: "battery" }
    ]
  },
  {
    name: "АРХИВ",
    intro: "В архиве ты находишь папку с надписью «АЛЕКС». Внутри — твоя фотография и запись: «Эксперимент по стиранию памяти. Объект всё ещё жив».",
    walls: [
      [200, 85, 32, 400],
      [390, 0, 32, 190],
      [390, 335, 32, 265],
      [575, 85, 32, 400],
      [755, 0, 32, 205],
      [755, 390, 32, 210]
    ],
    items: [
      { x: 305, y: 265, type: "fuse" },
      { x: 680, y: 300, type: "fuse" },
      { x: 490, y: 480, type: "key" },
      { x: 120, y: 130, type: "battery" }
    ]
  }
];

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function showStory(text, callback) {
  running = false;
  storyText.textContent = text;
  storyBox.classList.remove("hidden");
  dialogueCallback = callback || null;
}

let dialogueCallback = null;

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

  player.x = 105;
  player.y = 300;
  player.dx = 1;
  player.dy = 0;

  monster.x = 650;
  monster.y = 300;
  monster.speed = 42 + zone * 23;
  monster.active = true;

  exit = { x: 840, y: 300 };
  zoneLabel.textContent = data.name;

  message.textContent = "Собери два предохранителя и найди выход.";
  showStory(data.intro);
}

function startGame() {
  battery = 100;
  totalParts = 0;
  keycard = false;
  flashlight = true;
  ended = false;

  partsText.textContent = "0/6";
  batteryText.textContent = "100%";
  flashBtn.classList.remove("off");

  overlay.style.display = "none";
  loadZone(0);
}

startBtn.addEventListener("click", startGame);

function gameOver() {
  running = false;
  ended = true;
  overlay.style.display = "flex";
  overlayTitle.textContent = "ТЫ НЕ ОДИН";
  overlayText.textContent =
    "Красные глаза приближаются из темноты. Последнее, что ты слышишь по рации: «Объект обнаружен. Начать новый эксперимент».";
  startBtn.textContent = "ПОПРОБОВАТЬ СНОВА";
}

function finishGame() {
  running = false;
  ended = true;
  overlay.style.display = "flex";
  overlayTitle.textContent = "КОНЕЦ ПЕРВОЙ СМЕНЫ";
  overlayText.textContent =
    "Ты добрался до выхода. Но за дверью стоит человек с твоим лицом. На его груди табличка: «АЛЕКС — ОБЪЕКТ № 2».";
  startBtn.textContent = "ИГРАТЬ СНОВА";
}

function nextZone() {
  if (zone < 2) {
    loadZone(zone + 1);
  } else {
    finishGame();
  }
}

function collides(x, y, radius) {
  if (
    x < radius || y < radius ||
    x > W - radius || y > H - radius
  ) return true;

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

    if (distance(player, item) < 29) {
      item.taken = true;

      if (item.type === "fuse") {
        totalParts++;
        collected++;
        message.textContent = "Предохранитель найден!";
      } else if (item.type === "battery") {
        battery = Math.min(100, battery + 35);
        message.textContent = "Батарея заряжена на 35%!";
      } else if (item.type === "key") {
        keycard = true;
        message.textContent = "Ключ-карта найдена!";
      }
    }
  }

  partsText.textContent = totalParts + "/6";
}

function updateMonster(dt) {
  if (!monster.active) return;

  monster.anim += dt;
  const d = distance(player, monster);

  if (d < 490) {
    const dx = (player.x - monster.x) / (d || 1);
    const dy = (player.y - monster.y) / (d || 1);

    const speed = monster.speed * (d < 170 ? 1.18 : 1);
    const nx = monster.x + dx * speed * dt;
    const ny = monster.y + dy * speed * dt;

    if (!collides(nx, monster.y, 14)) monster.x = nx;
    if (!collides(monster.x, ny, 14)) monster.y = ny;
  }

  if (d < 25) gameOver();
}

function update(dt) {
  movePlayer(dt);

  if (flashlight) {
    battery -= 0.55 * dt;

    if (battery <= 0) {
      battery = 0;
      flashlight = false;
      flashBtn.classList.add("off");
      message.textContent = "Фонарик разрядился! Найди батарейку!";
    }
  }

  if (battery < 20 && flashlight) {
    flicker = Math.random() < 0.08 ? 0.35 : 1;
  } else {
    flicker = 1;
  }

  updateItems();
  updateMonster(dt);

  const nearExit = distance(player, exit) < 48;

  if (nearExit) {
    if (collected < 2) {
      message.textContent = "Нужно найти оба предохранителя!";
    } else if (zone === 2 && !keycard) {
      message.textContent = "Дверь закрыта. Найди ключ-карту!";
    } else {
      message.textContent = "Коснись двери, чтобы войти!";
    }
  }

  batteryText.textContent = Math.round(battery) + "%";
}

function rect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

function drawFloor() {
  rect(0, 0, W, H, "#171b20");

  for (let y = 0; y < H; y += 32) {
    for (let x = 0; x < W; x += 32) {
      const odd = ((x / 32 + y / 32) % 2) === 0;
      rect(x, y, 31, 31, odd ? "#1b2026" : "#181d23");
      rect(x + 3, y + 3, 25, 25, "#20252a");
    }
  }

  // Трещины и следы на полу
  for (let i = 0; i < 18; i++) {
    const x = (i * 137 + zone * 51) % W;
    const y = (i * 83 + 40) % H;
    rect(x, y, 12, 2, "#11151a");
    rect(x + 8, y + 2, 2, 7, "#11151a");
  }

  // Красные аварийные полосы
  rect(0, 0, W, 5, "#4b2028");
  rect(0, H - 5, W, 5, "#4b2028");
}

function drawWall(x, y, w, h) {
  rect(x - 4, y - 4, w + 8, h + 8, "#090c10");
  rect(x, y, w, h, "#414952");
  rect(x + 4, y + 4, w - 8, h - 8, "#303840");

  for (let py = y + 8; py < y + h - 4; py += 18) {
    rect(x + 5, py, w - 10, 3, "#59616a");
    rect(x + 5, py + 5, 3, 7, "#20272e");
  }

  rect(x + 3, y + 2, w - 6, 3, "#77818a");
}

function drawDecorations() {
  // Потолочные лампы
  for (let x = 90; x < 880; x += 190) {
    rect(x, 20, 48, 8, "#55565a");
    rect(x + 5, 22, 38, 3, "#c0b98b");
    rect(x + 9, 28, 30, 2, "#3c4249");
  }

  if (zone === 0) {
    // Подвал: трубы и ящики
    for (let x = 60; x < 850; x += 250) {
      rect(x, 75, 85, 10, "#555e66");
      rect(x + 8, 85, 8, 15, "#353e47");
    }

    drawCrate(110, 115);
    drawCrate(500, 90);
    drawCrate(700, 440);
    drawPipe(60, 540, 780);
  }

  if (zone === 1) {
    // Лаборатория: столы и оборудование
    drawTable(270, 100);
    drawTable(470, 410);
    drawMachine(680, 110);
    drawMachine(280, 430);
    rect(100, 55, 65, 8, "#3c5059");
  }

  if (zone === 2) {
    // Архив: высокие шкафы
    for (let x = 80; x < 850; x += 190) {
      drawCabinet(x, 85);
      drawCabinet(x, 440);
    }
    rect(440, 80, 90, 8, "#6c5741");
    rect(450, 88, 70, 4, "#a58a60");
  }
}

function drawCrate(x, y) {
  rect(x, y, 65, 55, "#493c31");
  rect(x + 5, y + 5, 55, 45, "#70583d");
  rect(x + 8, y + 8, 49, 5, "#8c704a");
  rect(x + 29, y + 5, 6, 45, "#40372e");
  rect(x + 4, y + 24, 57, 5, "#40372e");
  rect(x + 3, y + 3, 6, 6, "#b09566");
  rect(x + 56, y + 3, 6, 6, "#b09566");
}

function drawPipe(x, y, length) {
  rect(x, y, length, 9, "#59646b");
  rect(x, y + 9, length, 4, "#2d363e");

  for (let px = x + 80; px < x + length; px += 180) {
    rect(px, y - 5, 8, 20, "#737d83");
  }
}

function drawTable(x, y) {
  rect(x, y, 105, 10, "#6a7275");
  rect(x + 5, y + 10, 8, 45, "#3c444b");
  rect(x + 92, y + 10, 8, 45, "#3c444b");
  rect(x + 24, y - 10, 24, 10, "#a0a8a5");
  rect(x + 60, y - 7, 25, 7, "#55717b");
}

function drawMachine(x, y) {
  rect(x, y, 65, 80, "#38444b");
  rect(x + 6, y + 6, 53, 68, "#202a32");
  rect(x + 12, y + 12, 40, 22, "#263d45");
  rect(x + 17, y + 17, 8, 6, "#a93b43");
  rect(x + 31, y + 17, 8, 6, "#72a58a");
  rect(x + 12, y + 43, 40, 4, "#68757b");
  rect(x + 12, y + 54, 40, 4, "#68757b");
}

function drawCabinet(x, y) {
  rect(x, y, 72, 95, "#343a45");
  rect(x + 5, y + 5, 62, 85, "#55515a");
  rect(x + 10, y + 10, 52, 34, "#393e48");
  rect(x + 10, y + 49, 52, 35, "#393e48");
  rect(x + 52, y + 24, 5, 5, "#c3a76d");
  rect(x + 52, y + 64, 5, 5, "#c3a76d");
  rect(x + 3, y + 2, 66, 4, "#82818a");
}

function drawWalls() {
  for (const w of walls) drawWall(...w);
}

function drawExit() {
  rect(exit.x - 24, exit.y - 42, 48, 84, "#111820");
  rect(exit.x - 19, exit.y - 37, 38, 74, "#53616a");
  rect(exit.x - 14, exit.y - 32, 28, 64, "#252e38");
  rect(exit.x + 6, exit.y - 2, 5, 5, "#d9b66e");
  rect(exit.x - 12, exit.y - 29, 24, 3, "#9ba8a8");
  rect(exit.x - 12, exit.y + 26, 24, 3, "#9ba8a8");
  rect(exit.x - 16, exit.y - 50, 32, 5, "#b4474e");
}

function drawItems() {
  for (const item of items) {
    if (item.taken) continue;

    if (item.type === "fuse") {
      rect(item.x - 9, item.y - 14, 18, 28, "#e5b94d");
      rect(item.x - 5, item.y - 18, 10, 4, "#b8b8a8");
      rect(item.x - 5, item.y - 8, 10, 16, "#fff0a1");
      rect(item.x - 5, item.y + 14, 10, 4, "#b8b8a8");
    }

    if (item.type === "battery") {
      rect(item.x - 10, item.y - 13, 20, 26, "#46a77c");
      rect(item.x - 5, item.y - 17, 10, 4, "#a9c6b4");
      rect(item.x - 5, item.y - 7, 10, 14, "#b8f5c7");
      rect(item.x - 2, item.y - 5, 4, 10, "#368d6b");
    }

    if (item.type === "key") {
      rect(item.x - 8, item.y - 10, 16, 20, "#4ca6d4");
      rect(item.x - 4, item.y - 6, 8, 12, "#c0ecff");
      rect(item.x - 2, item.y - 2, 4, 4, "#397aa2");
    }
  }
}

function drawPlayer() {
  const x = Math.round(player.x);
  const y = Math.round(player.y);

  // Тень
  rect(x - 12, y + 10, 24, 5, "#08090b");

  // Ноги
  rect(x - 9, y + 3, 7, 10, "#252d39");
  rect(x + 2, y + 3, 7, 10, "#252d39");

  // Тело
  rect(x - 12, y - 10, 24, 18, "#60717c");
  rect(x - 9, y - 8, 18, 13, "#8999a1");
  rect(x - 14, y - 7, 5, 14, "#3d4b55");
  rect(x + 9, y - 7, 5, 14, "#3d4b55");

  // Голова
  rect(x - 8, y - 22, 16, 13, "#c2a995");
  rect(x - 7, y - 25, 14, 5, "#30333a");
  rect(x - 6, y - 18, 3, 3, "#17191e");
  rect(x + 3, y - 18, 3, 3, "#17191e");
}

function drawMonster() {
  if (!monster.active) return;

  const x = Math.round(monster.x);
  const y = Math.round(monster.y);
  const step = Math.sin(monster.anim * 8) * 3;

  // Длинная тень под существом
  rect(x - 22, y + 22, 44, 8, "#08070a");

  // Длинные руки
  rect(x - 19, y - 2 + step, 7, 34, "#09090d");
  rect(x - 24, y + 25 + step, 7, 15, "#09090d");
  rect(x + 12, y - 2 - step, 7, 34, "#09090d");
  rect(x + 17, y + 25 - step, 7, 15, "#09090d");

  // Ноги
  rect(x - 12, y + 22, 9, 23, "#09090d");
  rect(x + 3, y + 22, 9, 23, "#09090d");
  rect(x - 15, y + 40, 13, 5, "#050609");
  rect(x + 2, y + 40, 13, 5, "#050609");

  // Туловище
  rect(x - 16, y - 15, 32, 42, "#0b0b10");
  rect(x - 12, y - 12, 24, 34, "#15141b");
  rect(x - 18, y - 8, 6, 22, "#08080c");
  rect(x + 12, y - 8, 6, 22, "#08080c");

  // Голова
  rect(x - 13, y - 36, 26, 23, "#08080d");
  rect(x - 9, y - 42, 18, 9, "#0b0a10");
  rect(x - 11, y - 30, 22, 12, "#15121a");

  // Рваные края силуэта
  rect(x - 19, y - 7, 4, 13, "#09090d");
  rect(x + 15, y - 4, 4, 13, "#09090d");
}

function drawDarkness() {
  ctx.save();

  ctx.fillStyle = "rgba(0,0,0,0.95)";
  ctx.fillRect(0, 0, W, H);

  ctx.globalCompositeOperation = "destination-out";

  // Свет вокруг игрока
  const radius = flashlight ? 155 : 48;
  const glow = ctx.createRadialGradient(
    player.x, player.y, 4,
    player.x, player.y, radius
  );

  glow.addColorStop(0, "rgba(255,255,255,0.95)");
  glow.addColorStop(0.45, "rgba(255,255,255,0.65)");
  glow.addColorStop(0.8, "rgba(255,255,255,0.18)");
  glow.addColorStop(1, "rgba(255,255,255,0)");

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Широкий луч фонарика
  if (flashlight && flicker > 0) {
    const angle = Math.atan2(player.dy, player.dx);
    const reach = 650;
    const spread = 0.62;

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
      player.x, player.y, 20,
      player.x, player.y, reach
    );

    beam.addColorStop(0, "rgba(255,255,255,0.98)");
    beam.addColorStop(0.4, "rgba(255,255,255,0.78)");
    beam.addColorStop(0.75, "rgba(255,255,255,0.35)");
    beam.addColorStop(1, "rgba(255,255,255,0)");

    ctx.globalAlpha = flicker;
    ctx.fillStyle = beam;
    ctx.fill();
  }

  ctx.restore();

  // Красные глаза видны даже в слабом освещении,
  // если монстр находится рядом с направлением фонаря.
  if (monster.active && flashlight) {
    const dx = monster.x - player.x;
    const dy = monster.y - player.y;
    const d = Math.hypot(dx, dy);
    const angleToMonster = Math.atan2(dy, dx);
    const playerAngle = Math.atan2(player.dy, player.dx);

    let diff = Math.atan2(
      Math.sin(angleToMonster - playerAngle),
      Math.cos(angleToMonster - playerAngle)
    );

    if (d < 600 && Math.abs(diff) < 0.68) {
      const x = monster.x;
      const y = monster.y - 27;

      ctx.save();
      ctx.shadowColor = "#ff1010";
      ctx.shadowBlur = 18;
      rect(x - 8, y, 5, 4, "#ff2525");
      rect(x + 3, y, 5, 4, "#ff2525");
      ctx.restore();
    }
  }
}

function draw() {
  drawFloor();
  drawDecorations();
  drawExit();
  drawWalls();
  drawItems();
  drawMonster();
  drawPlayer();
  drawDarkness();
}

function loop(time) {
  const dt = Math.min((time - lastTime) / 1000 || 0, 0.04);
  lastTime = time;

  if (running) update(dt);

  draw();
  requestAnimationFrame(loop);
}

function setJoystick(event) {
  const r = stick.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;

  let dx = event.clientX - cx;
  let dy = event.clientY - cy;

  const max = r.width * 0.34;
  const len = Math.hypot(dx, dy);

  if (len > max) {
    dx = dx / len * max;
    dy = dy / len * max;
  }

  joystick.x = dx / max;
  joystick.y = dy / max;
  knob.style.transform = `translate(${dx}px, ${dy}px)`;
}

function resetJoystick() {
  joystick.x = 0;
  joystick.y = 0;
  knob.style.transform = "translate(0, 0)";
}

stick.addEventListener("pointerdown", event => {
  stick.setPointerCapture(event.pointerId);
  setJoystick(event);
});

stick.addEventListener("pointermove", event => {
  if (event.buttons) setJoystick(event);
});

stick.addEventListener("pointerup", resetJoystick);
stick.addEventListener("pointercancel", resetJoystick);

flashBtn.addEventListener("click", () => {
  if (!running || battery <= 0) return;

  flashlight = !flashlight;
  flashBtn.classList.toggle("off", !flashlight);
});

canvas.addEventListener("pointerdown", event => {
  if (!running) return;

  const r = canvas.getBoundingClientRect();
  const x = (event.clientX - r.left) * W / r.width;
  const y = (event.clientY - r.top) * H / r.height;

  if (distance({ x, y }, exit) < 55) {
    if (collected < 2) {
      message.textContent = "Сначала найди два предохранителя!";
      return;
    }

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