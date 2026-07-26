"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FARMER_SKIP,
  LEVELS,
  POWER_NAMES,
  eggLayWindow,
  farmEggCadence,
  upgradeCopy,
  type UpgradeKey,
} from "./game-data";

type Point = { x: number; y: number };
type Actor = Point & { vx: number; vy: number; r: number; angle: number };
type Chicken = Actor & { id: number; wander: number; lay: number; flap: number; carried: boolean };
type EggKind = "normal" | "golden" | "special";
type Egg = Point & { id: number; kind: EggKind; age: number; bob: number };
type Snake = Actor & { id: number; pulse: number; enraged: number };
type Projectile = Actor & { life: number; pierce: number };
type Enemy = Actor & { life: number };
type Weasel = Enemy & { target: number };
type PowerKind = keyof typeof POWER_NAMES;
type PowerUp = Point & { kind: PowerKind; age: number };
type Particle = Point & { vx: number; vy: number; life: number; max: number; color: string; size: number };
type Popup = Point & { text: string; life: number; color: string; big?: boolean };
type Obstacle = { x: number; y: number; w: number; h: number; kind: string };
type Apple = Point & { targetY: number; life: number; landed: boolean };
type Fox = Actor & {
  hp: number;
  mode: "steal" | "windup" | "charge";
  timer: number;
  targetX: number;
  targetY: number;
  carrying: number | null;
};

type Stage = "start" | "intro" | "playing" | "paused" | "shop" | "gameover" | "win";

type GameState = {
  stage: Stage;
  level: number;
  width: number;
  height: number;
  score: number;
  coins: number;
  lives: number;
  eggsCollected: number;
  snakeEggs: number;
  lostChickens: number;
  combo: number;
  comboTimer: number;
  bossHp: number;
  bossMaxHp: number;
  elapsed: number;
  shots: number;
  hits: number;
  totalEggs: number;
  bestCombo: number;
  levelStartScore: number;
  levelStartCoins: number;
  player: Actor & { invulnerable: number; stunned: number; anim: number };
  chickens: Chicken[];
  eggs: Egg[];
  snakes: Snake[];
  projectiles: Projectile[];
  rooster: Enemy | null;
  weasel: Weasel | null;
  dog: Actor | null;
  powerUp: PowerUp | null;
  activePower: { kind: PowerKind; time: number; max: number } | null;
  particles: Particle[];
  popups: Popup[];
  obstacles: Obstacle[];
  apples: Apple[];
  fox: Fox | null;
  nextRooster: number;
  nextWeasel: number;
  nextPower: number;
  eggLayClock: number;
  shake: number;
  upgrades: Record<UpgradeKey, number>;
  keys: Set<string>;
  pointer: Point;
  sound: boolean;
  lastShot: number;
  nextId: number;
};

type Hud = {
  level: number;
  name: string;
  score: number;
  coins: number;
  lives: number;
  eggs: number;
  quota: number;
  snakeEggs: number;
  snakeLimit: number;
  bossHp: number;
  bossMax: number;
  power: string;
  powerTime: number;
  totalEggs: number;
  bestCombo: number;
  accuracy: number;
};

const TAU = Math.PI * 2;
const PLAYER_SPEED = 215;

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const random = (min: number, max: number) => min + Math.random() * (max - min);
const quotaFor = (level: number) => Math.min(20, 5 + (level - 1) * 3);
const snakeLimitFor = (level: number) => Math.min(15, 5 + (level - 1) * 2);

function circleRect(a: Point & { r: number }, o: Obstacle) {
  const px = clamp(a.x, o.x, o.x + o.w);
  const py = clamp(a.y, o.y, o.y + o.h);
  return Math.hypot(a.x - px, a.y - py) < a.r;
}

function clearSpot(g: GameState, padding = 55): Point {
  for (let tries = 0; tries < 80; tries++) {
    const p = { x: random(padding, g.width - padding), y: random(padding, g.height - padding) };
    if (
      !g.obstacles.some((o) => circleRect({ ...p, r: 30 }, o)) &&
      distance(p, g.player) > 100
    ) return p;
  }
  return { x: g.width * 0.72, y: g.height * 0.5 };
}

function makeObstacles(level: number, width: number, height: number): Obstacle[] {
  const items: Obstacle[] = [];
  const add = (x: number, y: number, w: number, h: number, kind = LEVELS[level - 1].obstacle) =>
    items.push({ x, y, w, h, kind });

  if (level === 1) {
    add(width * 0.28, height * 0.24, 54, 42);
    add(width * 0.7, height * 0.62, 66, 48);
    add(width * 0.48, height * 0.7, 45, 38);
  } else if (level === 2) {
    add(width * 0.2, 90, 70, height * 0.42);
    add(width * 0.42, height * 0.38, 75, height * 0.46);
    add(width * 0.66, 85, 72, height * 0.4);
    add(width * 0.82, height * 0.56, 70, height * 0.3);
  } else if (level === 3) {
    add(width * 0.33, height * 0.22, width * 0.34, height * 0.5, "water");
    add(width * 0.12, height * 0.68, 54, 44, "rock");
  } else if (level === 4) {
    for (const [x, y] of [[0.2, 0.22], [0.44, 0.18], [0.7, 0.25], [0.27, 0.62], [0.57, 0.67], [0.82, 0.58]]) {
      add(width * x - 28, height * y - 28, 58, 58);
    }
  } else if (level === 5) {
    add(width * 0.18, height * 0.2, 62, 48);
    add(width * 0.78, height * 0.68, 68, 50);
    add(width * 0.48, height * 0.4, 52, 42);
  } else if (level === 6) {
    for (const [x, y] of [[0.18, 0.2], [0.5, 0.18], [0.82, 0.22], [0.28, 0.68], [0.68, 0.7]]) {
      add(width * x - 18, height * y - 18, 36, 36);
    }
  } else if (level === 7) {
    for (const [x, y] of [[0.18, 0.2], [0.35, 0.34], [0.56, 0.18], [0.78, 0.3], [0.22, 0.72], [0.48, 0.68], [0.76, 0.7]]) {
      add(width * x - 25, height * y - 25, 50, 50);
    }
  } else if (level === 8) {
    add(width * 0.18, height * 0.22, 150, 88);
    add(width * 0.56, height * 0.18, 180, 92);
    add(width * 0.36, height * 0.6, 210, 90);
    add(width * 0.77, height * 0.64, 120, 82);
  } else if (level === 9) {
    add(width * 0.22, height * 0.18, 150, 96);
    add(width * 0.6, height * 0.2, 190, 100);
    add(width * 0.38, height * 0.62, 230, 104);
  } else {
    add(width * 0.22, height * 0.24, 42, 42);
    add(width * 0.48, height * 0.68, 42, 42);
    add(width * 0.78, height * 0.28, 42, 42);
  }
  return items;
}

function createBaseGame(): GameState {
  const width = 960;
  const height = 590;
  return {
    stage: "start",
    level: 1,
    width,
    height,
    score: 0,
    coins: 0,
    lives: 3,
    eggsCollected: 0,
    snakeEggs: 0,
    lostChickens: 0,
    combo: 0,
    comboTimer: 0,
    bossHp: 0,
    bossMaxHp: 0,
    elapsed: 0,
    shots: 0,
    hits: 0,
    totalEggs: 0,
    bestCombo: 0,
    levelStartScore: 0,
    levelStartCoins: 0,
    player: { x: 150, y: height / 2, vx: 0, vy: 0, r: 19, angle: 0, invulnerable: 0, stunned: 0, anim: 0 },
    chickens: [],
    eggs: [],
    snakes: [],
    projectiles: [],
    rooster: null,
    weasel: null,
    dog: null,
    powerUp: null,
    activePower: null,
    particles: [],
    popups: [],
    obstacles: makeObstacles(1, width, height),
    apples: [],
    fox: null,
    nextRooster: 20,
    nextWeasel: 15,
    nextPower: 9,
    eggLayClock: 2.8,
    shake: 0,
    upgrades: { boots: 0, cannon: 0, basket: 0, dog: 0, overalls: 0 },
    keys: new Set(),
    pointer: { x: width / 2, y: height / 2 },
    sound: true,
    lastShot: 0,
    nextId: 1,
  };
}

function resetActorPositions(g: GameState) {
  g.player.x = 120;
  g.player.y = g.height / 2;
  g.player.vx = 0;
  g.player.vy = 0;
  for (let i = 0; i < g.snakes.length; i++) {
    g.snakes[i].x = g.width - 120 - i * 50;
    g.snakes[i].y = g.height * (0.35 + i * 0.28);
    g.snakes[i].vx = 0;
    g.snakes[i].vy = 0;
  }
}

function setupLevel(g: GameState, level: number) {
  g.level = level;
  g.width = 930 + level * 24;
  g.height = 570 + level * 9;
  g.eggsCollected = 0;
  g.snakeEggs = 0;
  g.lostChickens = 0;
  g.combo = 0;
  g.comboTimer = 0;
  g.elapsed = 0;
  g.levelStartScore = g.score;
  g.levelStartCoins = g.coins;
  g.player = { x: 120, y: g.height / 2, vx: 0, vy: 0, r: 19, angle: 0, invulnerable: 1.2, stunned: 0, anim: 0 };
  g.obstacles = makeObstacles(level, g.width, g.height);
  g.chickens = [];
  g.eggs = [];
  g.snakes = [];
  g.projectiles = [];
  g.rooster = null;
  g.weasel = null;
  g.powerUp = null;
  g.activePower = null;
  g.particles = [];
  g.popups = [];
  g.apples = [];
  g.fox = null;
  g.nextRooster = level === 1 ? 999 : random(16, 21);
  g.nextWeasel = level === 1 ? 999 : random(12, 17);
  g.nextPower = random(8, 11);
  g.eggLayClock = random(2.6, 3.5);
  g.shake = 0;

  const chickenCount = Math.min(8, level + 1);
  const layWindow = eggLayWindow(level);
  for (let i = 0; i < chickenCount; i++) {
    const p = clearSpot(g, 80);
    g.chickens.push({
      id: g.nextId++,
      x: p.x,
      y: p.y,
      vx: 0,
      vy: 0,
      r: 15,
      angle: random(0, TAU),
      wander: random(0.4, 1.8),
      lay: random(layWindow.min * 0.8, layWindow.max),
      flap: random(0, TAU),
      carried: false,
    });
  }

  if (level === 5) {
    g.bossHp = 10;
    g.bossMaxHp = 10;
    g.snakes.push({ id: g.nextId++, x: g.width - 150, y: g.height / 2, vx: 0, vy: 0, r: 34, angle: Math.PI, pulse: 0, enraged: 0 });
  } else if (level === 10) {
    g.bossHp = 15;
    g.bossMaxHp = 15;
    g.fox = { x: g.width - 140, y: g.height / 2, vx: 0, vy: 0, r: 29, angle: Math.PI, hp: 15, mode: "steal", timer: 5.5, targetX: 120, targetY: g.height / 2, carrying: null };
  } else {
    const count = level === 7 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      g.snakes.push({ id: g.nextId++, x: g.width - 120 - i * 45, y: g.height * (0.38 + i * 0.25), vx: 0, vy: 0, r: 18, angle: Math.PI, pulse: 0, enraged: 0 });
    }
  }
  g.dog = g.upgrades.dog ? { x: 170, y: g.height / 2 + 55, vx: 0, vy: 0, r: 17, angle: 0 } : null;
  g.stage = "intro";
}

function safeMove(g: GameState, actor: Actor, dx: number, dy: number, ignoreWater = false) {
  const ox = actor.x;
  const oy = actor.y;
  actor.x = clamp(actor.x + dx, actor.r + 8, g.width - actor.r - 8);
  if (g.obstacles.some((o) => (!ignoreWater || o.kind !== "water") && o.kind !== "mud" && o.kind !== "ice" && circleRect(actor, o))) actor.x = ox;
  actor.y = clamp(actor.y + dy, actor.r + 8, g.height - actor.r - 8);
  if (g.obstacles.some((o) => (!ignoreWater || o.kind !== "water") && o.kind !== "mud" && o.kind !== "ice" && circleRect(actor, o))) actor.y = oy;
}

function spawnBurst(g: GameState, p: Point, color: string, count = 10) {
  for (let i = 0; i < count; i++) {
    const angle = random(0, TAU);
    const speed = random(35, 150);
    g.particles.push({
      x: p.x,
      y: p.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: random(0.35, 0.7),
      max: 0.7,
      color,
      size: random(2, 6),
    });
  }
}

function spawnEgg(g: GameState, chicken: Chicken) {
  const roll = Math.random();
  const kind: EggKind = roll < 0.7 ? "normal" : roll < 0.9 ? "golden" : "special";
  g.eggs.push({ id: g.nextId++, x: chicken.x - Math.cos(chicken.angle) * 14, y: chicken.y - Math.sin(chicken.angle) * 14, kind, age: 0, bob: random(0, TAU) });
}

function getEggValue(g: GameState, kind: EggKind) {
  const base = kind === "normal" ? 1 : kind === "golden" ? 3 : 5;
  return base + (kind === "normal" ? 0 : g.upgrades.basket);
}

let audioContext: AudioContext | null = null;
function tone(g: GameState, freq: number, length = 0.07, type: OscillatorType = "square", volume = 0.035) {
  if (!g.sound || typeof window === "undefined") return;
  try {
    audioContext ??= new AudioContext();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioContext.currentTime);
    gain.gain.setValueAtTime(volume, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + length);
    osc.connect(gain).connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + length);
  } catch {
    // Audio is a progressive enhancement; gameplay never depends on it.
  }
}

function collectEgg(g: GameState, egg: Egg) {
  const value = getEggValue(g, egg.kind);
  g.combo = g.comboTimer > 0 ? g.combo + 1 : 1;
  g.comboTimer = 2;
  g.bestCombo = Math.max(g.bestCombo, g.combo);
  const bonus = Math.min(5, Math.max(0, g.combo - 1));
  g.score += value + bonus;
  g.coins += value + bonus;
  g.totalEggs += 1;
  if (g.level !== 5 && g.level !== 10) g.eggsCollected += 1;
  const color = egg.kind === "normal" ? "#fff3ce" : egg.kind === "golden" ? "#ffd64a" : "#77e1d2";
  const praise = g.combo >= 8 ? "HENHOUSE HAVOC!" : g.combo >= 5 ? "BASKET BLITZ!" : "COOP SCOOP!";
  g.popups.push({ x: egg.x, y: egg.y - 8, text: `+${value + bonus}  x${g.combo}`, life: 1.05, color, big: g.combo >= 5 });
  if ([3, 5, 8].includes(g.combo)) {
    g.popups.push({ x: g.width / 2, y: g.height * 0.22, text: praise, life: 1.25, color: "#fff1a8", big: true });
    if (g.combo === 8) g.shake = 0.35;
  }
  spawnBurst(g, egg, color, egg.kind === "special" ? 16 : 10);
  tone(g, 460 + g.combo * 28, 0.09, "triangle", 0.045);
}

function loseLife(g: GameState, message: string) {
  if (g.player.invulnerable > 0 || g.activePower?.kind === "shield") return;
  g.lives -= 1;
  g.combo = 0;
  g.comboTimer = 0;
  g.player.invulnerable = 2;
  g.shake = 0.55;
  g.popups.push({ x: g.player.x, y: g.player.y - 35, text: message, life: 1.4, color: "#ff8b6b", big: true });
  spawnBurst(g, g.player, "#ef704d", 18);
  tone(g, 110, 0.28, "sawtooth", 0.055);
  resetActorPositions(g);
  if (g.lives <= 0) g.stage = "gameover";
}

function shoot(g: GameState, target: Point) {
  if (g.stage !== "playing" || g.elapsed - g.lastShot < 0.18) return;
  const base = Math.atan2(target.y - g.player.y, target.x - g.player.x);
  const tier = g.upgrades.cannon;
  const spreads = tier === 0 ? [0] : tier === 1 ? [-0.07, 0.07] : [-0.12, 0, 0.12];
  for (const offset of spreads) {
    const angle = base + offset;
    g.projectiles.push({
      x: g.player.x + Math.cos(angle) * 24,
      y: g.player.y + Math.sin(angle) * 24,
      vx: Math.cos(angle) * 540,
      vy: Math.sin(angle) * 540,
      r: 5,
      angle,
      life: 1.4,
      pierce: tier >= 3 ? 1 : 0,
    });
    g.shots++;
  }
  g.lastShot = g.elapsed;
  tone(g, 260, 0.045, "square", 0.025);
}

function nearest<T extends Point>(from: Point, items: T[]): T | null {
  let found: T | null = null;
  let best = Infinity;
  for (const item of items) {
    const d = distance(from, item);
    if (d < best) {
      best = d;
      found = item;
    }
  }
  return found;
}

function enterFromEdge(g: GameState, r: number): Point {
  const side = Math.floor(random(0, 4));
  if (side === 0) return { x: r, y: random(r, g.height - r) };
  if (side === 1) return { x: g.width - r, y: random(r, g.height - r) };
  if (side === 2) return { x: random(r, g.width - r), y: r };
  return { x: random(r, g.width - r), y: g.height - r };
}

function moveToward(g: GameState, actor: Actor, target: Point, speed: number, dt: number, ignoreWater = false) {
  const angle = Math.atan2(target.y - actor.y, target.x - actor.x);
  actor.angle = angle;
  actor.vx = Math.cos(angle) * speed;
  actor.vy = Math.sin(angle) * speed;
  safeMove(g, actor, actor.vx * dt, actor.vy * dt, ignoreWater);
}

function projectileHit(g: GameState, projectile: Projectile, target: Point & { r: number }) {
  if (distance(projectile, target) >= projectile.r + target.r) return false;
  g.hits++;
  if (projectile.pierce > 0) {
    projectile.pierce--;
    projectile.x += projectile.vx * 0.035;
    projectile.y += projectile.vy * 0.035;
  } else projectile.life = 0;
  return true;
}

function finishLevel(g: GameState) {
  if (g.stage !== "playing") return;
  tone(g, 620, 0.18, "triangle", 0.05);
  setTimeout(() => tone(g, 820, 0.22, "triangle", 0.05), 100);
  if (g.level === 10) g.stage = "win";
  else if (g.level === 5) setupLevel(g, 6);
  else g.stage = "shop";
}

function updateGame(g: GameState, rawDt: number) {
  if (g.stage !== "playing") return;
  const dt = Math.min(0.034, rawDt);
  const level = g.level;
  const freezeFactor = g.activePower?.kind === "freeze" ? 0.3 : 1;
  g.elapsed += dt;
  g.player.invulnerable = Math.max(0, g.player.invulnerable - dt);
  g.player.stunned = Math.max(0, g.player.stunned - dt);
  g.comboTimer = Math.max(0, g.comboTimer - dt);
  if (g.comboTimer === 0) g.combo = 0;
  g.shake = Math.max(0, g.shake - dt);

  if (g.activePower) {
    g.activePower.time -= dt;
    if (g.activePower.time <= 0) g.activePower = null;
  }

  let ix = 0;
  let iy = 0;
  if (g.keys.has("arrowleft") || g.keys.has("a")) ix--;
  if (g.keys.has("arrowright") || g.keys.has("d")) ix++;
  if (g.keys.has("arrowup") || g.keys.has("w")) iy--;
  if (g.keys.has("arrowdown") || g.keys.has("s")) iy++;
  if (ix || iy) {
    const len = Math.hypot(ix, iy);
    ix /= len;
    iy /= len;
    g.player.angle = Math.atan2(iy, ix);
  }

  let speed = PLAYER_SPEED * (1 + g.upgrades.boots * 0.1);
  if (g.activePower?.kind === "speed") speed *= 1.5;
  if (g.player.stunned > 0) speed = 0;
  if (g.obstacles.some((o) => o.kind === "mud" && circleRect(g.player, o))) speed *= 0.6;

  if (level === 9) {
    const accel = 5.2;
    g.player.vx += (ix * speed - g.player.vx) * Math.min(1, accel * dt);
    g.player.vy += (iy * speed - g.player.vy) * Math.min(1, accel * dt);
    if (!ix) g.player.vx *= Math.pow(0.985, dt * 60);
    if (!iy) g.player.vy *= Math.pow(0.985, dt * 60);
  } else {
    g.player.vx = ix * speed;
    g.player.vy = iy * speed;
  }
  safeMove(g, g.player, g.player.vx * dt, g.player.vy * dt);
  g.player.anim += Math.hypot(g.player.vx, g.player.vy) * dt * 0.04;

  const layWindow = eggLayWindow(level);
  g.eggLayClock = Math.max(0, g.eggLayClock - dt);
  for (const chicken of g.chickens) {
    if (chicken.carried) continue;
    chicken.wander -= dt;
    chicken.flap += dt * (5 + Math.hypot(chicken.vx, chicken.vy) * 0.03);
    chicken.lay -= dt;
    if (chicken.wander <= 0) {
      chicken.angle += random(-1.8, 1.8);
      chicken.wander = random(0.5, 1.8);
    }
    chicken.vx = Math.cos(chicken.angle) * 38;
    chicken.vy = Math.sin(chicken.angle) * 38;
    safeMove(g, chicken, chicken.vx * dt, chicken.vy * dt);
  }
  const readyHens = g.chickens.filter((chicken) => !chicken.carried && chicken.lay <= 0);
  if (readyHens.length && g.eggLayClock <= 0) {
    const chicken = readyHens[Math.floor(random(0, readyHens.length))];
    spawnEgg(g, chicken);
    chicken.lay = random(layWindow.min, layWindow.max);
    chicken.flap += 1.2;
    for (const waitingHen of readyHens) {
      if (waitingHen.id !== chicken.id) waitingHen.lay = random(0.35, 1.15);
    }
    g.eggLayClock = farmEggCadence(level) * random(0.9, 1.12);
  }

  for (const egg of g.eggs) {
    egg.age += dt;
    egg.bob += dt * 2.8;
    const magnet = g.activePower?.kind === "magnet" && distance(egg, g.player) < 170;
    if (magnet) {
      const angle = Math.atan2(g.player.y - egg.y, g.player.x - egg.x);
      egg.x += Math.cos(angle) * 250 * dt;
      egg.y += Math.sin(angle) * 250 * dt;
    }
  }

  for (const snake of g.snakes) {
    snake.pulse += dt * 7;
    snake.enraged = Math.max(0, snake.enraged - dt);
    const target = g.eggs.length && (level === 5 || Math.random() < 0.7) ? nearest(snake, g.eggs)! : g.player;
    let snakeSpeed = PLAYER_SPEED * 0.66 * freezeFactor * (1 + Math.max(0, level - 1) * 0.018);
    if (level === 5) snakeSpeed *= snake.enraged > 0 ? 1.35 : 0.92;
    moveToward(g, snake, target, snakeSpeed, dt, level === 3);
    const eaten = g.eggs.find((egg) => distance(snake, egg) < snake.r + 9);
    if (eaten) {
      g.eggs = g.eggs.filter((egg) => egg.id !== eaten.id);
      if (level !== 5) g.snakeEggs++;
      spawnBurst(g, eaten, "#98bb64", 6);
      tone(g, 155, 0.08, "sawtooth", 0.02);
    }
    if (distance(snake, g.player) < snake.r + g.player.r) loseLife(g, level === 5 ? "KING-SIZED BITE!" : "SNAKEBITE!");
  }

  if (level !== 1 && level !== 5 && level !== 10) {
    g.nextRooster -= dt;
    if (!g.rooster && g.nextRooster <= 0) {
      const p = enterFromEdge(g, 20);
      g.rooster = { ...p, vx: 0, vy: 0, r: 20, angle: 0, life: 15 };
      g.nextRooster = random(18, 23);
      g.popups.push({ x: g.width / 2, y: 65, text: "ROOSTER RAMPAGE!", life: 1.2, color: "#f6c84c", big: true });
    }
    if (g.rooster) {
      g.rooster.life -= dt;
      moveToward(g, g.rooster, g.player, PLAYER_SPEED * 0.82 * freezeFactor, dt);
      if (distance(g.rooster, g.player) < g.rooster.r + g.player.r) loseLife(g, "PECKED!");
      if (g.rooster.life <= 0) g.rooster = null;
    }

    g.nextWeasel -= dt;
    if (!g.weasel && g.nextWeasel <= 0 && g.chickens.some((c) => !c.carried)) {
      const p = enterFromEdge(g, 18);
      const targets = g.chickens.filter((c) => !c.carried);
      const target = targets[Math.floor(random(0, targets.length))];
      g.weasel = { ...p, vx: 0, vy: 0, r: 18, angle: 0, life: 20, target: target.id };
      g.nextWeasel = random(13, 18);
      g.popups.push({ x: g.width / 2, y: 65, text: "WEASEL IN THE YARD!", life: 1.1, color: "#eaa96b", big: true });
    }
    if (g.weasel) {
      g.weasel.life -= dt;
      const target = g.chickens.find((c) => c.id === g.weasel!.target && !c.carried) ?? nearest(g.weasel, g.chickens.filter((c) => !c.carried));
      if (target) {
        g.weasel.target = target.id;
        moveToward(g, g.weasel, target, PLAYER_SPEED * 0.9 * freezeFactor, dt);
        if (distance(g.weasel, target) < g.weasel.r + target.r) {
          g.chickens = g.chickens.filter((c) => c.id !== target.id);
          g.lostChickens++;
          g.weasel = null;
          g.popups.push({ x: target.x, y: target.y, text: `${g.lostChickens}/3 HENS LOST`, life: 1.2, color: "#ff9b71", big: true });
          if (g.lostChickens >= 3) {
            g.lostChickens = 0;
            loseLife(g, "THREE HENS LOST!");
          }
        }
      }
      if (g.weasel && g.weasel.life <= 0) g.weasel = null;
    }
  }

  if (g.dog) {
    const target = g.weasel ?? g.player;
    moveToward(g, g.dog, target, (g.weasel ? 250 : 145) * freezeFactor, dt);
    if (g.weasel && distance(g.dog, g.weasel) < g.dog.r + g.weasel.r + 5) {
      g.popups.push({ x: g.weasel.x, y: g.weasel.y, text: "MABEL SAYS SCRAM!", life: 1, color: "#f4d58d", big: true });
      spawnBurst(g, g.weasel, "#f4d58d", 12);
      g.weasel = null;
      g.score += 6;
    }
  }

  g.nextPower -= dt;
  if (!g.powerUp && !g.activePower && g.nextPower <= 0) {
    const roll = Math.random();
    const kind: PowerKind = roll < 0.3 ? "speed" : roll < 0.55 ? "shield" : roll < 0.8 ? "magnet" : "freeze";
    g.powerUp = { ...clearSpot(g), kind, age: 0 };
    g.nextPower = random(9, 12);
  }
  if (g.powerUp) {
    g.powerUp.age += dt;
    if (distance(g.powerUp, g.player) < g.player.r + 18) {
      const durations: Record<PowerKind, number> = { speed: 5, shield: 7, magnet: 6, freeze: 4 };
      const time = durations[g.powerUp.kind];
      g.activePower = { kind: g.powerUp.kind, time, max: time };
      g.popups.push({ x: g.player.x, y: g.player.y - 36, text: POWER_NAMES[g.powerUp.kind].toUpperCase(), life: 1.2, color: "#86e6d1", big: true });
      spawnBurst(g, g.powerUp, "#86e6d1", 16);
      tone(g, 720, 0.15, "sine", 0.04);
      g.powerUp = null;
    } else if (g.powerUp.age > 11) g.powerUp = null;
  }

  if (level === 4 && Math.random() < dt * 0.7) {
    const tree = g.obstacles[Math.floor(random(0, g.obstacles.length))];
    g.apples.push({ x: tree.x + tree.w / 2 + random(-35, 35), y: tree.y - 100, targetY: tree.y + tree.h + random(12, 80), life: 1.3, landed: false });
  }
  for (const apple of g.apples) {
    apple.life -= dt;
    if (!apple.landed) {
      apple.y += 125 * dt;
      if (apple.y >= apple.targetY) apple.landed = true;
    }
    if (distance(apple, g.player) < g.player.r + 10) {
      g.player.stunned = 1;
      apple.life = 0;
      g.popups.push({ x: g.player.x, y: g.player.y - 32, text: "APPLE-STRUCK!", life: 0.9, color: "#ffb085", big: true });
      tone(g, 170, 0.12, "square", 0.035);
    }
  }
  g.apples = g.apples.filter((a) => a.life > -1.2);

  if (g.fox) {
    const fox = g.fox;
    fox.timer -= dt;
    if (fox.carrying != null) {
      const chicken = g.chickens.find((c) => c.id === fox.carrying);
      if (chicken) {
        chicken.x = fox.x - Math.cos(fox.angle) * 30;
        chicken.y = fox.y - Math.sin(fox.angle) * 30;
      }
      const edge = fox.x < 55 || fox.x > g.width - 55 || fox.y < 55 || fox.y > g.height - 55;
      if (edge && chicken) {
        g.chickens = g.chickens.filter((c) => c.id !== chicken.id);
        fox.carrying = null;
        g.lostChickens++;
        g.popups.push({ x: fox.x, y: fox.y, text: "HEN STOLEN!", life: 1.1, color: "#ff9d72", big: true });
        if (g.lostChickens >= 3) {
          g.lostChickens = 0;
          loseLife(g, "THREE HENS STOLEN!");
        }
        fox.mode = "windup";
        fox.timer = 1;
      }
    }
    if (fox.mode === "steal") {
      const target = nearest(fox, g.chickens.filter((c) => !c.carried));
      if (target) {
        moveToward(g, fox, target, PLAYER_SPEED * freezeFactor, dt);
        if (distance(fox, target) < fox.r + target.r) {
          fox.carrying = target.id;
          target.carried = true;
          const distances = [
            { x: 18, y: fox.y, d: fox.x },
            { x: g.width - 18, y: fox.y, d: g.width - fox.x },
            { x: fox.x, y: 18, d: fox.y },
            { x: fox.x, y: g.height - 18, d: g.height - fox.y },
          ].sort((a, b) => a.d - b.d);
          fox.targetX = distances[0].x;
          fox.targetY = distances[0].y;
        }
      }
      if (fox.carrying != null) moveToward(g, fox, { x: fox.targetX, y: fox.targetY }, PLAYER_SPEED * 1.04 * freezeFactor, dt);
      if (fox.timer <= 0 && fox.carrying == null) {
        fox.mode = "windup";
        fox.timer = 1;
      }
    } else if (fox.mode === "windup") {
      fox.angle = Math.atan2(g.player.y - fox.y, g.player.x - fox.x);
      fox.vx = 0;
      fox.vy = 0;
      if (fox.timer <= 0) {
        fox.mode = "charge";
        fox.timer = 1.15;
        fox.targetX = Math.cos(fox.angle) * PLAYER_SPEED * 2.15;
        fox.targetY = Math.sin(fox.angle) * PLAYER_SPEED * 2.15;
        tone(g, 95, 0.25, "sawtooth", 0.045);
      }
    } else {
      safeMove(g, fox, fox.targetX * dt * freezeFactor, fox.targetY * dt * freezeFactor);
      if (fox.timer <= 0) {
        fox.mode = "steal";
        fox.timer = random(4.5, 6);
      }
    }
    if (distance(fox, g.player) < fox.r + g.player.r) loseLife(g, fox.mode === "charge" ? "FOX CHARGE!" : "OUTFOXED!");
  }

  for (const projectile of g.projectiles) {
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    projectile.life -= dt;
    for (const snake of g.snakes) {
      if (projectile.life > 0 && projectileHit(g, projectile, snake)) {
        if (level === 5) {
          g.bossHp--;
          snake.enraged = 1.2;
          g.score += 5;
          g.coins += 5;
          g.shake = 0.24;
          g.popups.push({ x: snake.x, y: snake.y - 38, text: `KING COIL  ${g.bossHp}/10`, life: 0.85, color: "#ffd36b", big: true });
          if (g.bossHp <= 0) finishLevel(g);
        } else {
          g.score += 5;
          g.coins += 5;
          const p = clearSpot(g);
          snake.x = p.x;
          snake.y = p.y;
          g.popups.push({ x: snake.x, y: snake.y - 26, text: "+5 SNAKE SHOO!", life: 0.8, color: "#d7ed94" });
        }
        spawnBurst(g, snake, "#d7ed94", 12);
        tone(g, 310, 0.08, "square", 0.035);
      }
    }
    if (g.rooster && projectile.life > 0 && projectileHit(g, projectile, g.rooster)) {
      g.score += 8;
      g.coins += 8;
      g.popups.push({ x: g.rooster.x, y: g.rooster.y, text: "+8 ROOSTER ROUT!", life: 0.9, color: "#ffd96a" });
      spawnBurst(g, g.rooster, "#e9483f", 14);
      g.rooster = null;
    }
    if (g.weasel && projectile.life > 0 && projectileHit(g, projectile, g.weasel)) {
      g.score += 10;
      g.coins += 10;
      g.popups.push({ x: g.weasel.x, y: g.weasel.y, text: "+10 WEASEL WHOMP!", life: 0.9, color: "#efb57b" });
      spawnBurst(g, g.weasel, "#b16a45", 14);
      g.weasel = null;
    }
    if (g.fox && projectile.life > 0 && projectileHit(g, projectile, g.fox)) {
      g.fox.hp--;
      g.bossHp = g.fox.hp;
      g.score += 7;
      g.coins += 7;
      g.shake = 0.24;
      if (g.fox.carrying != null) {
        const chicken = g.chickens.find((c) => c.id === g.fox!.carrying);
        if (chicken) {
          chicken.carried = false;
          chicken.angle = random(0, TAU);
        }
        g.fox.carrying = null;
        g.popups.push({ x: g.fox.x, y: g.fox.y - 45, text: "HEN RESCUED!", life: 1, color: "#fff0a5", big: true });
      } else {
        g.popups.push({ x: g.fox.x, y: g.fox.y - 45, text: `REDD RANSOM  ${g.fox.hp}/15`, life: 0.85, color: "#ffb17e", big: true });
      }
      g.fox.mode = "windup";
      g.fox.timer = 1;
      spawnBurst(g, g.fox, "#ef704d", 16);
      tone(g, 220, 0.1, "square", 0.045);
      if (g.fox.hp <= 0) finishLevel(g);
    }
  }
  g.projectiles = g.projectiles.filter((p) => p.life > 0 && p.x > -10 && p.x < g.width + 10 && p.y > -10 && p.y < g.height + 10);

  const collectedIds = new Set<number>();
  for (const egg of g.eggs) {
    if (distance(egg, g.player) < g.player.r + 12) {
      collectEgg(g, egg);
      collectedIds.add(egg.id);
    } else if (level === 9 && egg.age > 12) {
      collectedIds.add(egg.id);
      spawnBurst(g, egg, "#c6f2ff", 12);
      g.popups.push({ x: egg.x, y: egg.y, text: "SHATTERED", life: 0.75, color: "#dff8ff" });
      tone(g, 740, 0.06, "sine", 0.025);
    }
  }
  if (collectedIds.size) g.eggs = g.eggs.filter((egg) => !collectedIds.has(egg.id));

  for (const particle of g.particles) {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 60 * dt;
    particle.vx *= 0.98;
  }
  g.particles = g.particles.filter((p) => p.life > 0);
  for (const popup of g.popups) {
    popup.life -= dt;
    popup.y -= 26 * dt;
  }
  g.popups = g.popups.filter((p) => p.life > 0);

  if (level !== 5 && level !== 10 && g.eggsCollected >= quotaFor(level)) finishLevel(g);
  if (g.snakeEggs >= snakeLimitFor(level)) {
    g.popups.push({ x: g.width / 2, y: g.height / 2, text: "THE SNAKES WON THE BASKET!", life: 2, color: "#ff8c6b", big: true });
    g.stage = "gameover";
    tone(g, 90, 0.4, "sawtooth", 0.06);
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawGround(ctx: CanvasRenderingContext2D, g: GameState) {
  const theme = LEVELS[g.level - 1].theme;
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 0, g.width, g.height);
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = theme.groundAlt;
  ctx.lineWidth = 2;
  for (let y = 18; y < g.height; y += 28) {
    ctx.beginPath();
    for (let x = 0; x < g.width + 40; x += 40) {
      const yy = y + Math.sin(x * 0.025 + y) * 3;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = theme.ink;
  for (let x = 20; x < g.width; x += 54) for (let y = 20; y < g.height; y += 50) {
    if ((x + y) % 4 === 0) ctx.fillRect(x, y, 2, 2);
  }
  ctx.restore();
}

function drawObstacle(ctx: CanvasRenderingContext2D, o: Obstacle, time: number) {
  ctx.save();
  const cx = o.x + o.w / 2;
  const cy = o.y + o.h / 2;
  ctx.translate(cx, cy);
  if (o.kind === "rock") {
    ctx.fillStyle = "#5e6258";
    ctx.strokeStyle = "#242923";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-o.w * 0.45, o.h * 0.3);
    ctx.lineTo(-o.w * 0.26, -o.h * 0.38);
    ctx.lineTo(o.w * 0.22, -o.h * 0.45);
    ctx.lineTo(o.w * 0.48, o.h * 0.12);
    ctx.lineTo(o.w * 0.28, o.h * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#8c9184";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-o.w * 0.2, -o.h * 0.24);
    ctx.lineTo(o.w * 0.17, -o.h * 0.31);
    ctx.stroke();
  } else if (o.kind === "hay") {
    ctx.fillStyle = "#d5a629";
    ctx.strokeStyle = "#5c421a";
    ctx.lineWidth = 4;
    roundRect(ctx, -o.w / 2, -o.h / 2, o.w, o.h, 9);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#f3d15a";
    ctx.lineWidth = 2;
    for (let y = -o.h / 2 + 10; y < o.h / 2; y += 18) {
      ctx.beginPath();
      ctx.moveTo(-o.w / 2 + 5, y);
      ctx.lineTo(o.w / 2 - 5, y + 6);
      ctx.stroke();
    }
    ctx.strokeStyle = "#8d6321";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, -o.h / 2);
    ctx.lineTo(0, o.h / 2);
    ctx.stroke();
  } else if (o.kind === "water") {
    ctx.fillStyle = "#3b9cac";
    ctx.strokeStyle = "#225968";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(0, 0, o.w / 2, o.h / 2, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#82d3d6";
    ctx.lineWidth = 3;
    for (let y = -o.h * 0.3; y <= o.h * 0.3; y += 30) {
      ctx.beginPath();
      ctx.moveTo(-o.w * 0.34, y);
      ctx.quadraticCurveTo(-o.w * 0.1, y + 8, o.w * 0.08, y);
      ctx.quadraticCurveTo(o.w * 0.28, y - 8, o.w * 0.38, y);
      ctx.stroke();
    }
  } else if (o.kind === "tree") {
    ctx.fillStyle = "#6b4325";
    ctx.strokeStyle = "#342318";
    ctx.lineWidth = 4;
    ctx.fillRect(-9, 2, 18, o.h * 0.52);
    ctx.strokeRect(-9, 2, 18, o.h * 0.52);
    ctx.fillStyle = "#486f35";
    ctx.beginPath();
    ctx.arc(-13, -7, o.w * 0.35, 0, TAU);
    ctx.arc(13, -8, o.w * 0.36, 0, TAU);
    ctx.arc(0, -22, o.w * 0.37, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#cf4b38";
    for (const [x, y] of [[-17, -17], [15, -23], [3, 0]]) {
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, TAU);
      ctx.fill();
    }
  } else if (o.kind === "sunflower") {
    ctx.strokeStyle = "#31502b";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, o.h / 2);
    ctx.quadraticCurveTo(Math.sin(time + cx) * 6, 0, 0, -o.h * 0.2);
    ctx.stroke();
    ctx.fillStyle = "#f4ca31";
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * TAU;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * 14, -o.h * 0.24 + Math.sin(a) * 14, 11, 5, a, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = "#513820";
    ctx.beginPath();
    ctx.arc(0, -o.h * 0.24, 11, 0, TAU);
    ctx.fill();
  } else if (o.kind === "mud" || o.kind === "ice") {
    ctx.fillStyle = o.kind === "mud" ? "#574735" : "#9ed7df";
    ctx.strokeStyle = o.kind === "mud" ? "#3a3028" : "#e3fbff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, o.w / 2, o.h / 2, 0.05, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = o.kind === "mud" ? "#9a7d57" : "#ffffff";
    ctx.beginPath();
    ctx.moveTo(-o.w * 0.25, -5);
    ctx.quadraticCurveTo(0, -18, o.w * 0.28, -2);
    ctx.stroke();
  } else {
    ctx.fillStyle = "#674331";
    ctx.strokeStyle = "#2e201a";
    ctx.lineWidth = 4;
    roundRect(ctx, -o.w / 2, -o.h / 2, o.w, o.h, 6);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#a86d43";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-o.w / 2 + 6, 0);
    ctx.lineTo(o.w / 2 - 6, 0);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFarmer(ctx: CanvasRenderingContext2D, p: GameState["player"], active: GameState["activePower"], time: number) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  const run = Math.sin(p.anim * 2.2) * 4;
  if (active) {
    ctx.globalAlpha = 0.65 + Math.sin(time * 8) * 0.18;
    ctx.strokeStyle = active.kind === "shield" ? "#8ee8e0" : active.kind === "speed" ? "#f7d65f" : active.kind === "magnet" ? "#ef7a66" : "#a9e7ff";
    ctx.lineWidth = active.kind === "shield" ? 7 : 4;
    ctx.beginPath();
    ctx.arc(0, 0, 28 + Math.sin(time * 7) * 2, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = "rgba(41,27,20,.24)";
  ctx.beginPath();
  ctx.ellipse(-3, 18, 22, 8, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#2a201a";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-5, 10);
  ctx.lineTo(-8 + run, 21);
  ctx.moveTo(5, 10);
  ctx.lineTo(8 - run, 21);
  ctx.stroke();
  ctx.fillStyle = "#2b6f73";
  ctx.strokeStyle = "#251b16";
  ctx.lineWidth = 4;
  roundRect(ctx, -13, -12, 26, 29, 7);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#e5c39a";
  ctx.beginPath();
  ctx.arc(0, -18, 12, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#d6d0bc";
  ctx.beginPath();
  ctx.arc(-2, -14, 10, 0.1, Math.PI - 0.2);
  ctx.lineTo(8, -9);
  ctx.quadraticCurveTo(0, -5, -9, -10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#2a201a";
  ctx.beginPath();
  ctx.moveTo(4, -18);
  ctx.lineTo(9, -20);
  ctx.lineTo(5, -22);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(6, -18, 1.6, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#b94432";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-9, -7);
  ctx.lineTo(8, -5);
  ctx.stroke();
  ctx.fillStyle = "#d9ad54";
  ctx.strokeStyle = "#46301b";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(-2, -29, 20, 5, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(-2, -33, 11, 8, 0, Math.PI, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#f0cfaa";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(10, -7);
  ctx.lineTo(20, run * 0.5);
  ctx.stroke();
  ctx.restore();
}

function drawChicken(ctx: CanvasRenderingContext2D, c: Chicken, time: number) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(c.angle);
  const flap = Math.sin(c.flap) * 0.35;
  ctx.fillStyle = "rgba(30,20,15,.2)";
  ctx.beginPath();
  ctx.ellipse(-2, 12, 16, 6, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#f7edcf";
  ctx.strokeStyle = "#2c241d";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, 15, 12, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.rotate(flap);
  ctx.fillStyle = "#ded3b9";
  ctx.beginPath();
  ctx.ellipse(-4, 2, 11, 6, -0.4, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(12, -7, 8, 0, TAU);
  ctx.fillStyle = "#fff7dc";
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#d94534";
  ctx.beginPath();
  ctx.arc(10, -16, 3, 0, TAU);
  ctx.arc(15, -15, 3, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#f0b431";
  ctx.beginPath();
  ctx.moveTo(19, -7);
  ctx.lineTo(27, -4);
  ctx.lineTo(19, -1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#222";
  ctx.beginPath();
  ctx.arc(15, -8, 1.5, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#8a5a28";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-3, 11);
  ctx.lineTo(-5, 17 + Math.sin(time * 9 + c.id) * 2);
  ctx.moveTo(5, 11);
  ctx.lineTo(7, 17 - Math.sin(time * 9 + c.id) * 2);
  ctx.stroke();
  ctx.restore();
}

function drawEgg(ctx: CanvasRenderingContext2D, egg: Egg, level: number) {
  const frozen = level === 9 ? clamp((egg.age - 7) / 5, 0, 1) : 0;
  ctx.save();
  ctx.translate(egg.x, egg.y + Math.sin(egg.bob) * 2);
  ctx.fillStyle = "rgba(25,20,15,.2)";
  ctx.beginPath();
  ctx.ellipse(0, 9, 10, 4, 0, 0, TAU);
  ctx.fill();
  const gradient = ctx.createLinearGradient(-7, -10, 8, 10);
  if (egg.kind === "normal") {
    gradient.addColorStop(0, frozen ? "#d8f4f4" : "#fff8df");
    gradient.addColorStop(1, frozen ? "#88cddd" : "#e7d4a6");
  } else if (egg.kind === "golden") {
    gradient.addColorStop(0, frozen ? "#d8f4f4" : "#fff18a");
    gradient.addColorStop(1, frozen ? "#88cddd" : "#e3a722");
  } else {
    gradient.addColorStop(0, frozen ? "#d8f4f4" : "#8af3dc");
    gradient.addColorStop(1, frozen ? "#88cddd" : "#3bb4a9");
  }
  ctx.fillStyle = gradient;
  ctx.strokeStyle = "#2c241d";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.bezierCurveTo(9, -10, 11, 3, 7, 9);
  ctx.bezierCurveTo(2, 14, -7, 12, -9, 4);
  ctx.bezierCurveTo(-10, -4, -6, -10, 0, -12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (egg.kind === "special") {
    ctx.fillStyle = "#fff6bc";
    ctx.beginPath();
    ctx.arc(-2, -2, 2.4, 0, TAU);
    ctx.arc(4, 3, 1.8, 0, TAU);
    ctx.fill();
  }
  if (frozen > 0) {
    ctx.globalAlpha = frozen;
    ctx.strokeStyle = "#efffff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-4, -7);
    ctx.lineTo(2, -1);
    ctx.lineTo(-1, 7);
    ctx.moveTo(2, -1);
    ctx.lineTo(7, -4);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSnake(ctx: CanvasRenderingContext2D, snake: Snake, boss: boolean, time: number) {
  ctx.save();
  ctx.translate(snake.x, snake.y);
  ctx.rotate(snake.angle);
  const scale = boss ? 1.35 : 1;
  ctx.scale(scale, scale);
  ctx.lineCap = "round";
  ctx.strokeStyle = "#25301d";
  ctx.lineWidth = boss ? 25 : 18;
  ctx.beginPath();
  ctx.moveTo(-48, Math.sin(time * 8 + snake.id) * 8);
  ctx.bezierCurveTo(-32, -18, -16, 18, 0, 0);
  ctx.stroke();
  ctx.strokeStyle = boss ? "#6f8731" : "#5f8a39";
  ctx.lineWidth = boss ? 19 : 13;
  ctx.stroke();
  ctx.fillStyle = boss ? "#768e33" : "#6d9f43";
  ctx.strokeStyle = "#25301d";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(9, 0, 18, 14, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#f2e7bb";
  for (const y of [-5, 5]) {
    ctx.beginPath();
    ctx.arc(17, y, 3.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#1c211a";
    ctx.beginPath();
    ctx.arc(18, y, 1.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#f2e7bb";
  }
  ctx.strokeStyle = "#d94c40";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(27, 0);
  ctx.lineTo(37, 0);
  ctx.moveTo(37, 0);
  ctx.lineTo(42, -4);
  ctx.moveTo(37, 0);
  ctx.lineTo(42, 4);
  ctx.stroke();
  if (boss) {
    ctx.fillStyle = "#f1bd38";
    ctx.strokeStyle = "#533819";
    ctx.beginPath();
    ctx.moveTo(-5, -14);
    ctx.lineTo(-9, -30);
    ctx.lineTo(0, -23);
    ctx.lineTo(7, -34);
    ctx.lineTo(13, -21);
    ctx.lineTo(21, -29);
    ctx.lineTo(20, -12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawRooster(ctx: CanvasRenderingContext2D, r: Enemy, time: number) {
  ctx.save();
  ctx.translate(r.x, r.y);
  ctx.rotate(r.angle);
  ctx.fillStyle = "#dd4a36";
  ctx.strokeStyle = "#291e18";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, 18, 14, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#172f39";
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.rotate(-0.8 + i * 0.35 + Math.sin(time * 7) * 0.08);
    ctx.beginPath();
    ctx.ellipse(-18, 0, 16, 5, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = "#f1c74a";
  ctx.beginPath();
  ctx.moveTo(16, -5);
  ctx.lineTo(29, 0);
  ctx.lineTo(16, 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawWeasel(ctx: CanvasRenderingContext2D, w: Weasel) {
  ctx.save();
  ctx.translate(w.x, w.y);
  ctx.rotate(w.angle);
  ctx.fillStyle = "#a9663e";
  ctx.strokeStyle = "#2b2019";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(-4, 0, 22, 9, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(16, -1, 9, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ead0a0";
  ctx.beginPath();
  ctx.ellipse(18, 2, 6, 3, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#222";
  ctx.beginPath();
  ctx.arc(20, -3, 1.5, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#6a3e2b";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-23, 0);
  ctx.quadraticCurveTo(-35, -12, -40, 0);
  ctx.stroke();
  ctx.restore();
}

function drawDog(ctx: CanvasRenderingContext2D, d: Actor, time: number) {
  ctx.save();
  ctx.translate(d.x, d.y);
  ctx.rotate(d.angle);
  ctx.fillStyle = "#c58d53";
  ctx.strokeStyle = "#2c211a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, 17, 11, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(15, -3, 9, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#503426";
  ctx.beginPath();
  ctx.ellipse(11, -12, 5, 9, -0.5, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#c58d53";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-15, -2);
  ctx.quadraticCurveTo(-26, -12 + Math.sin(time * 10) * 5, -29, -4);
  ctx.stroke();
  ctx.restore();
}

function drawFox(ctx: CanvasRenderingContext2D, fox: Fox, time: number) {
  ctx.save();
  ctx.translate(fox.x, fox.y);
  ctx.rotate(fox.angle);
  if (fox.mode === "windup") {
    ctx.strokeStyle = "rgba(255,210,103,.75)";
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(25, 0);
    ctx.lineTo(170, 0);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.fillStyle = "#cb5638";
  ctx.strokeStyle = "#271c18";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(-3, 0, 27, 18, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(14, -12);
  ctx.lineTo(27, -27);
  ctx.lineTo(32, -7);
  ctx.lineTo(36, 8);
  ctx.quadraticCurveTo(24, 18, 13, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#f2d0a1";
  ctx.beginPath();
  ctx.moveTo(19, 0);
  ctx.lineTo(39, 6);
  ctx.lineTo(24, 13);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#211916";
  ctx.beginPath();
  ctx.arc(38, 6, 3, 0, TAU);
  ctx.arc(24, -4, 2.2, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#cb5638";
  ctx.lineWidth = 13;
  ctx.beginPath();
  ctx.moveTo(-26, 0);
  ctx.quadraticCurveTo(-48, -24 - Math.sin(time * 7) * 5, -54, 4);
  ctx.stroke();
  ctx.strokeStyle = "#f2d0a1";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-49, -2);
  ctx.lineTo(-55, 4);
  ctx.stroke();
  ctx.fillStyle = "#2b2420";
  ctx.strokeStyle = "#171310";
  ctx.lineWidth = 2;
  roundRect(ctx, 9, -12, 25, 7, 3);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawPower(ctx: CanvasRenderingContext2D, p: PowerUp, time: number) {
  ctx.save();
  ctx.translate(p.x, p.y + Math.sin(time * 4) * 4);
  ctx.rotate(Math.sin(time * 2) * 0.08);
  ctx.fillStyle = "#183a3c";
  ctx.strokeStyle = "#9be9dc";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 17, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#f8e7a0";
  ctx.fillStyle = "#f8e7a0";
  ctx.lineWidth = 3;
  if (p.kind === "speed") {
    ctx.beginPath();
    ctx.moveTo(-9, 4);
    ctx.lineTo(1, -9);
    ctx.lineTo(0, -1);
    ctx.lineTo(9, -5);
    ctx.lineTo(-2, 10);
    ctx.lineTo(0, 2);
    ctx.closePath();
    ctx.fill();
  } else if (p.kind === "shield") {
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(10, -6);
    ctx.lineTo(8, 5);
    ctx.quadraticCurveTo(0, 12, -8, 5);
    ctx.lineTo(-10, -6);
    ctx.closePath();
    ctx.stroke();
  } else if (p.kind === "magnet") {
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0.2, Math.PI - 0.2, true);
    ctx.stroke();
    ctx.fillRect(-10, 3, 5, 7);
    ctx.fillRect(5, 3, 5, 7);
  } else {
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(10, 0);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawCanvas(ctx: CanvasRenderingContext2D, g: GameState) {
  ctx.save();
  const sx = g.shake > 0 ? random(-7, 7) * Math.min(1, g.shake * 4) : 0;
  const sy = g.shake > 0 ? random(-6, 6) * Math.min(1, g.shake * 4) : 0;
  ctx.translate(sx, sy);
  drawGround(ctx, g);
  const theme = LEVELS[g.level - 1].theme;

  ctx.strokeStyle = theme.border;
  ctx.lineWidth = 16;
  ctx.strokeRect(5, 5, g.width - 10, g.height - 10);
  ctx.strokeStyle = "#f3d58b";
  ctx.lineWidth = 3;
  ctx.setLineDash([18, 14]);
  ctx.strokeRect(14, 14, g.width - 28, g.height - 28);
  ctx.setLineDash([]);

  for (const o of g.obstacles) drawObstacle(ctx, o, g.elapsed);
  for (const apple of g.apples) {
    ctx.globalAlpha = clamp(apple.life + 1.2, 0, 1);
    ctx.fillStyle = "#c74734";
    ctx.strokeStyle = "#3b261d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(apple.x, apple.y, 9, 0, TAU);
    ctx.fill();
    ctx.stroke();
    if (!apple.landed) {
      ctx.strokeStyle = "rgba(60,35,22,.25)";
      ctx.beginPath();
      ctx.arc(apple.x, apple.targetY, 12, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  for (const egg of g.eggs) drawEgg(ctx, egg, g.level);
  if (g.powerUp) drawPower(ctx, g.powerUp, g.elapsed);
  for (const chicken of g.chickens) drawChicken(ctx, chicken, g.elapsed);
  for (const snake of g.snakes) drawSnake(ctx, snake, g.level === 5, g.elapsed);
  if (g.rooster) drawRooster(ctx, g.rooster, g.elapsed);
  if (g.weasel) drawWeasel(ctx, g.weasel);
  if (g.dog) drawDog(ctx, g.dog, g.elapsed);
  if (g.fox) drawFox(ctx, g.fox, g.elapsed);

  for (const p of g.projectiles) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = "#f0b92e";
    ctx.strokeStyle = "#5d3f16";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 7, 3.5, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,232,129,.5)";
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    ctx.lineTo(-8, 0);
    ctx.stroke();
    ctx.restore();
  }

  if (g.player.invulnerable <= 0 || Math.floor(g.player.invulnerable * 10) % 2 === 0) {
    drawFarmer(ctx, g.player, g.activePower, g.elapsed);
  }

  for (const p of g.particles) {
    ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "center";
  for (const popup of g.popups) {
    ctx.globalAlpha = clamp(popup.life * 1.6, 0, 1);
    ctx.font = `${popup.big ? 900 : 800} ${popup.big ? 25 : 17}px Georgia, serif`;
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#231a16";
    ctx.strokeText(popup.text, popup.x, popup.y);
    ctx.fillStyle = popup.color;
    ctx.fillText(popup.text, popup.x, popup.y);
  }
  ctx.globalAlpha = 1;

  if (g.level === 6) {
    ctx.save();
    ctx.fillStyle = "rgba(4,9,13,.86)";
    ctx.fillRect(0, 0, g.width, g.height);
    ctx.globalCompositeOperation = "destination-out";
    const glow = ctx.createRadialGradient(g.player.x, g.player.y, 40, g.player.x, g.player.y, 180);
    glow.addColorStop(0, "rgba(0,0,0,1)");
    glow.addColorStop(0.55, "rgba(0,0,0,.85)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(g.player.x, g.player.y, 185, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function initialHud(g: GameState): Hud {
  return {
    level: g.level,
    name: LEVELS[g.level - 1].name,
    score: g.score,
    coins: g.coins,
    lives: g.lives,
    eggs: g.eggsCollected,
    quota: quotaFor(g.level),
    snakeEggs: g.snakeEggs,
    snakeLimit: snakeLimitFor(g.level),
    bossHp: g.bossHp,
    bossMax: g.bossMaxHp,
    power: g.activePower ? POWER_NAMES[g.activePower.kind] : "",
    powerTime: g.activePower?.time ?? 0,
    totalEggs: g.totalEggs,
    bestCombo: g.bestCombo,
    accuracy: g.shots ? Math.round(g.hits / g.shots * 100) : 0,
  };
}

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameState>(createBaseGame());
  const frameRef = useRef(0);
  const hudClock = useRef(0);
  const [stage, setStage] = useState<Stage>("start");
  const [hud, setHud] = useState<Hud>(() => initialHud(createBaseGame()));
  const [upgrades, setUpgrades] = useState<Record<UpgradeKey, number>>({ boots: 0, cannon: 0, basket: 0, dog: 0, overalls: 0 });
  const [sound, setSound] = useState(true);

  const syncStage = useCallback(() => {
    const g = gameRef.current;
    setStage(g.stage);
    setHud(initialHud(g));
    setUpgrades({ ...g.upgrades });
  }, []);

  const fitCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const g = gameRef.current;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(g.width * dpr);
    canvas.height = Math.floor(g.height * dpr);
    canvas.style.aspectRatio = `${g.width} / ${g.height}`;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawCanvas(ctx, g);
    }
  }, []);

  useEffect(() => {
    fitCanvas();
    const onResize = () => fitCanvas();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [fitCanvas]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " ", "p", "escape"].includes(key)) event.preventDefault();
      if ((key === "p" || key === "escape") && (gameRef.current.stage === "playing" || gameRef.current.stage === "paused")) {
        gameRef.current.stage = gameRef.current.stage === "playing" ? "paused" : "playing";
        syncStage();
        return;
      }
      if (key === " " && gameRef.current.stage === "playing") shoot(gameRef.current, gameRef.current.pointer);
      gameRef.current.keys.add(key);
    };
    const up = (event: KeyboardEvent) => gameRef.current.keys.delete(event.key.toLowerCase());
    const blur = () => {
      gameRef.current.keys.clear();
      if (gameRef.current.stage === "playing") {
        gameRef.current.stage = "paused";
        syncStage();
      }
    };
    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [syncStage]);

  useEffect(() => {
    let last = performance.now();
    const loop = (now: number) => {
      const g = gameRef.current;
      const dt = (now - last) / 1000;
      last = now;
      updateGame(g, dt);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawCanvas(ctx, g);
      }
      hudClock.current += dt;
      if (hudClock.current > 0.12) {
        hudClock.current = 0;
        setHud(initialHud(g));
        if (stage !== g.stage) setStage(g.stage);
      }
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [stage]);

  const startRun = () => {
    const fresh = createBaseGame();
    fresh.sound = sound;
    setupLevel(fresh, 1);
    gameRef.current = fresh;
    fitCanvas();
    syncStage();
    tone(fresh, 360, 0.1, "triangle", 0.04);
  };

  const restartLevel = () => {
    const g = gameRef.current;
    g.score = g.levelStartScore;
    g.coins = g.levelStartCoins;
    setupLevel(g, g.level);
    fitCanvas();
    syncStage();
  };

  const enterLevel = () => {
    const g = gameRef.current;
    g.stage = "playing";
    g.player.invulnerable = 1;
    syncStage();
  };

  const nextLevel = () => {
    const g = gameRef.current;
    setupLevel(g, g.level + 1);
    fitCanvas();
    syncStage();
  };

  const pauseToggle = () => {
    const g = gameRef.current;
    if (g.stage === "playing") g.stage = "paused";
    else if (g.stage === "paused") g.stage = "playing";
    syncStage();
  };

  const setDirection = (key: string, pressed: boolean) => {
    if (pressed) gameRef.current.keys.add(key);
    else gameRef.current.keys.delete(key);
  };

  const autoFire = () => {
    const g = gameRef.current;
    const targets: Point[] = [...g.snakes];
    if (g.rooster) targets.push(g.rooster);
    if (g.weasel) targets.push(g.weasel);
    if (g.fox) targets.push(g.fox);
    shoot(g, nearest(g.player, targets) ?? { x: g.player.x + Math.cos(g.player.angle) * 100, y: g.player.y + Math.sin(g.player.angle) * 100 });
  };

  const canvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * gameRef.current.width / rect.width,
      y: (event.clientY - rect.top) * gameRef.current.height / rect.height,
    };
  };

  const buy = (key: UpgradeKey) => {
    const g = gameRef.current;
    const current = g.upgrades[key];
    const item = upgradeCopy[key];
    if (current >= item.max) return;
    const price = item.prices[Math.min(current, item.prices.length - 1)];
    if (g.coins < price) {
      tone(g, 95, 0.12, "square", 0.03);
      return;
    }
    g.coins -= price;
    g.upgrades[key]++;
    if (key === "overalls") g.lives = Math.min(5, g.lives + 1);
    setHud(initialHud(g));
    setUpgrades({ ...g.upgrades });
    tone(g, 620, 0.12, "triangle", 0.04);
  };

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    gameRef.current.sound = next;
    if (next) tone(gameRef.current, 480, 0.08, "sine", 0.03);
  };

  const levelDef = LEVELS[hud.level - 1];
  const bossLevel = hud.level === 5 || hud.level === 10;

  return (
    <main className={`game-shell theme-${hud.level}`} data-stage={stage}>
      <div className="paper-grain" aria-hidden="true" />
      <header className="topbar">
        <a className="brand-lockup" href="#" aria-label="Cluck-and-Cover_GPT home">
          <span className="brand-mark"><i /><i /><i /></span>
          <span><b>Cluck-and-Cover_GPT</b><small>A FARMYARD ARCADE RUN</small></span>
        </a>
        <div className="top-actions">
          <button className="text-button" type="button" onClick={toggleSound} aria-label={sound ? "Mute sound" : "Enable sound"}>
            Sound {sound ? "on" : "off"}
          </button>
          {(stage === "playing" || stage === "paused") && (
            <button className="text-button" type="button" onClick={pauseToggle}>{stage === "paused" ? "Resume" : "Pause"}</button>
          )}
        </div>
      </header>

      <section className="game-layout" aria-label="Game">
        <div className="left-rail">
          <div className="rail-label">CURRENT CHORE</div>
          <h2>{levelDef.name}</h2>
          <p className="level-kicker">{levelDef.kicker}</p>
          <div className="quota-card">
            <span>{bossLevel ? "BOSS GRIT" : "BASKET"}</span>
            <strong>{bossLevel ? `${hud.bossHp} / ${hud.bossMax}` : `${hud.eggs} / ${hud.quota}`}</strong>
            <div className="meter"><i style={{ width: `${bossLevel ? (hud.bossHp / Math.max(1, hud.bossMax)) * 100 : (hud.eggs / hud.quota) * 100}%` }} /></div>
          </div>
          <div className="stat-grid">
            <div><span>Score</span><strong>{hud.score}</strong></div>
            <div><span>Coins</span><strong>{hud.coins}</strong></div>
            <div><span>Lives</span><strong>{hud.lives}</strong></div>
            <div><span>Snake haul</span><strong>{hud.snakeEggs}/{hud.snakeLimit}</strong></div>
          </div>
          <div className={`power-readout ${hud.power ? "active" : ""}`}>
            <span>{hud.power ? "ACTIVE TRICK" : "POWER-UP"}</span>
            <strong>{hud.power || "None in the basket"}</strong>
            {hud.power && <small>{hud.powerTime.toFixed(1)} seconds</small>}
          </div>
        </div>

        <div className="canvas-column">
          <div className="canvas-frame">
            <canvas
              ref={canvasRef}
              aria-label={`Cluck-and-Cover_GPT playfield, level ${hud.level}: ${levelDef.name}`}
              onPointerMove={(event) => { gameRef.current.pointer = canvasPoint(event); }}
              onPointerDown={(event) => {
                if (event.button === 0) {
                  const point = canvasPoint(event);
                  gameRef.current.pointer = point;
                  shoot(gameRef.current, point);
                }
              }}
            />

            {stage === "start" && (
              <div className="screen start-screen">
                <div className="sun-disc" aria-hidden="true" />
                <div className="skip-portrait" aria-hidden="true">
                  <span className="hat" /><span className="head"><i className="brow one" /><i className="brow two" /><i className="nose" /><i className="beard" /></span>
                  <span className="body" />
                </div>
                <div className="start-copy">
                  <p className="eyebrow">FARMER SKIP HAS HAD ENOUGH</p>
                  <h1>Cluck-and-<br />Cover<span>_GPT</span></h1>
                  <p className="lead"><strong>Meet Farmer Skip.</strong> He has spent a lifetime learning every fence post, muddy rut, and stubborn hen on this land. Farming is the only life he ever wanted—and today, a yard full of thieves is making it personal.</p>
                  <p className="skip-credo">{FARMER_SKIP.credo}</p>
                  <div className="control-strip">
                    <div><span className="key-pair">WASD</span><small>Move Farmer Skip</small></div>
                    <div><span className="mouse-icon"><i /></span><small>Click to throw corn</small></div>
                    <div><span className="key-pair">P</span><small>Pause the ruckus</small></div>
                  </div>
                  <button className="primary-button" type="button" onClick={startRun}>Start the morning <i aria-hidden="true" /></button>
                </div>
                <div className="skip-quote">“My farm. My hens. My rules.”<span>— Farmer Skip</span></div>
              </div>
            )}

            {stage === "intro" && (
              <div className="screen intro-screen">
                <div className="intro-card">
                  <span className="chapter">LEVEL {hud.level} OF 10</span>
                  <span className="chapter-rule" />
                  <p>{levelDef.kicker}</p>
                  <h2>{levelDef.name}</h2>
                  <div className="intro-details">
                    <div className="twist"><span>YARD RULE</span>{levelDef.twist}</div>
                    <div className="skip-story"><span>WHY THIS YARD MATTERS TO SKIP</span><p>{levelDef.story}</p></div>
                  </div>
                  <blockquote>“{levelDef.skipLine}”<cite>Farmer Skip</cite></blockquote>
                  <button className="primary-button" type="button" onClick={enterLevel}>{bossLevel ? "Settle this" : "Enter the yard"} <i aria-hidden="true" /></button>
                </div>
              </div>
            )}

            {stage === "paused" && (
              <div className="screen pause-screen">
                <div className="pause-card">
                  <span className="pause-lines" aria-hidden="true"><i /><i /></span>
                  <p>FARMER SKIP IS THINKING</p>
                  <h2>Ruckus paused</h2>
                  <blockquote>“Don&apos;t let anybody touch anything.”</blockquote>
                  <button className="primary-button" type="button" onClick={pauseToggle}>Back to work <i aria-hidden="true" /></button>
                  <button className="secondary-button" type="button" onClick={restartLevel}>Restart this level</button>
                </div>
              </div>
            )}

            {stage === "shop" && (
              <div className="screen shop-screen">
                <div className="shop-header">
                  <div><span>LEVEL {hud.level} CLEARED</span><h2>Skip’s Supply Shed</h2><p>Score stays put. Coins do the spending.</p></div>
                  <div className="coin-purse"><span>COINS</span><strong>{hud.coins}</strong></div>
                </div>
                <div className="shed-note"><span>FROM SKIP’S LEDGER</span><p>“{levelDef.shedLine}”</p></div>
                <div className="shop-grid">
                  {(Object.keys(upgradeCopy) as UpgradeKey[]).map((key) => {
                    const item = upgradeCopy[key];
                    const tier = upgrades[key];
                    const sold = tier >= item.max;
                    const price = item.prices[Math.min(tier, item.prices.length - 1)];
                    return (
                      <button className="shop-item" key={key} type="button" onClick={() => buy(key)} disabled={sold || hud.coins < price}>
                        <span className={`shop-icon ${key}`} aria-hidden="true"><i /><b /></span>
                        <span className="shop-info"><strong>{item.name}</strong><small>{item.description}</small><em>{sold ? "FULLY OUTFITTED" : `${price} COINS`}</em></span>
                        <span className="tier-dots" aria-label={`${tier} of ${item.max} tiers`}>
                          {Array.from({ length: item.max }, (_, i) => <i className={i < tier ? "filled" : ""} key={i} />)}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button className="primary-button shop-next" type="button" onClick={nextLevel}>Next: {LEVELS[hud.level].name} <i aria-hidden="true" /></button>
              </div>
            )}

            {stage === "gameover" && (
              <div className="screen result-screen">
                <div className="result-card">
                  <p>THE FARM FOUGHT BACK</p>
                  <h2>Skip got outfoxed.</h2>
                  <blockquote>“Fine. Again. And this time, nobody breathe near my eggs.”</blockquote>
                  <div className="result-stats"><div><span>Final score</span><strong>{hud.score}</strong></div><div><span>Level reached</span><strong>{hud.level}</strong></div></div>
                  <button className="primary-button" type="button" onClick={startRun}>Try the whole run again <i aria-hidden="true" /></button>
                  <button className="secondary-button" type="button" onClick={restartLevel}>Restart level {hud.level}</button>
                </div>
              </div>
            )}

            {stage === "win" && (
              <div className="screen result-screen victory">
                <div className="confetti" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ "--n": i } as React.CSSProperties} />)}</div>
                <div className="result-card">
                  <p>THE HENS ARE HOME</p>
                  <h2>Farm saved. Probably.</h2>
                  <blockquote>“Good. Now everybody off my lawn.”<cite>Farmer Skip, smiling where nobody can see</cite></blockquote>
                  <div className="result-stats">
                    <div><span>Final score</span><strong>{hud.score}</strong></div>
                    <div><span>Eggs rescued</span><strong>{hud.totalEggs}</strong></div>
                    <div><span>Best combo</span><strong>x{hud.bestCombo}</strong></div>
                    <div><span>Corn accuracy</span><strong>{hud.accuracy}%</strong></div>
                  </div>
                  <button className="primary-button" type="button" onClick={startRun}>Run the farm again <i aria-hidden="true" /></button>
                </div>
              </div>
            )}
          </div>

          <div className="mobile-controls" aria-label="Touch controls">
            <div className="dpad">
              <button type="button" aria-label="Move up" onPointerDown={() => setDirection("w", true)} onPointerUp={() => setDirection("w", false)} onPointerLeave={() => setDirection("w", false)}>UP</button>
              <button type="button" aria-label="Move left" onPointerDown={() => setDirection("a", true)} onPointerUp={() => setDirection("a", false)} onPointerLeave={() => setDirection("a", false)}>LEFT</button>
              <button type="button" aria-label="Move down" onPointerDown={() => setDirection("s", true)} onPointerUp={() => setDirection("s", false)} onPointerLeave={() => setDirection("s", false)}>DOWN</button>
              <button type="button" aria-label="Move right" onPointerDown={() => setDirection("d", true)} onPointerUp={() => setDirection("d", false)} onPointerLeave={() => setDirection("d", false)}>RIGHT</button>
            </div>
            <button className="fire-button" type="button" onPointerDown={autoFire}>THROW</button>
          </div>
        </div>

        <aside className="right-rail">
          <span className="rail-label">THE MAN BEHIND THE SCOWL</span>
          <div className="skip-profile-card">
            <div className="profile-heading">
              <span className="mini-skip" aria-hidden="true"><i /><b /></span>
              <div><small>FARMER SKIP</small><h3>{FARMER_SKIP.title}</h3></div>
            </div>
            <p>{FARMER_SKIP.bio}</p>
            <dl>
              <div><dt>CREED</dt><dd>{FARMER_SKIP.credo}</dd></div>
              <div><dt>SOFT SPOT</dt><dd>{FARMER_SKIP.softSpot}</dd></div>
            </dl>
          </div>
          <div className="yard-memory">
            <span>THIS PATCH OF LAND</span>
            <p>{levelDef.story}</p>
          </div>
          <blockquote className="rail-quote">“{levelDef.skipLine}”</blockquote>
          <div className="egg-key">
            <span className="rail-label">EGG VALUE</span>
            <div><i className="egg normal" /><span>Farm fresh<b>1</b></span></div>
            <div><i className="egg golden" /><span>Golden<b>3</b></span></div>
            <div><i className="egg special" /><span>Speckled teal<b>5</b></span></div>
          </div>
        </aside>
      </section>

      <footer>
        <span>ORIGINAL GAME &amp; CODE-DRAWN ART</span>
        <span>FARMER SKIP’S EST. 1983</span>
        <button type="button" onClick={startRun}>Restart full run</button>
      </footer>
    </main>
  );
}
