import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the finished _GPT game shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Cluck-and-Cover_GPT/);
  assert.match(html, /Farmer Skip/);
  assert.match(html, /Keeper of the old farm/i);
  assert.match(html, /THE MAN BEHIND THE SCOWL/i);
  assert.match(html, /Start the morning/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("ships every named level and both bosses", async () => {
  const data = await readFile(new URL("../app/game-data.ts", import.meta.url), "utf8");
  const game = await readFile(new URL("../app/Game.tsx", import.meta.url), "utf8");
  for (const name of [
    "Pebblepatch Welcome",
    "High Noon Hayways",
    "Lilywater Bend",
    "Ciderfall Orchard",
    "Crowncoil Corral",
    "Lanternless Lofts",
    "Sunspun Doublecross",
    "Slogbottom Acres",
    "Frostbite Furrows",
    "Redtail Reckoning",
  ]) assert.match(data, new RegExp(name));
  assert.match(data, /KING COIL/);
  assert.match(data, /REDD RANSOM/);
  assert.equal((data.match(/\n    story:/g) ?? []).length, 10);
  assert.equal((data.match(/\n    shedLine:/g) ?? []).length, 10);
  assert.match(data, /function eggLayWindow/);
  assert.match(data, /Math\.max\(2\.8,/);
  assert.match(data, /function farmEggCadence/);
  assert.match(data, /DIFFICULTY_CURVE/);
  assert.match(data, /WARM-UP/);
  assert.match(data, /FINAL RECKONING/);
  assert.match(data, /quota: 5/);
  assert.match(data, /quota: 15/);
  assert.match(game, /eggLayClock/);
  assert.match(game, /readyHens/);
  assert.match(game, /targetEggId/);
  assert.match(game, /g\.lastShot = -1/);
  assert.doesNotMatch(game, /Math\.random\(\) < 0\.7/);
  assert.match(game, /requestAnimationFrame/);
  assert.match(game, /activePower/);
  assert.match(data, /Corn Cannon/);
  assert.match(game, /restartLevel/);
});

test("uses stable snake intent, fresh shooting state, and a rising challenge curve", async () => {
  const data = await readFile(new URL("../app/game-data.ts", import.meta.url), "utf8");
  const game = await readFile(new URL("../app/Game.tsx", import.meta.url), "utf8");
  const rows = [...data.matchAll(
    /\{ threat: "([^"]+)", quota: (\d+), snakeLimit: (\d+), snakeSpeed: ([\d.]+), eggCadence: ([\d.]+)/g,
  )].map((match) => ({
    threat: match[1],
    quota: Number(match[2]),
    snakeLimit: Number(match[3]),
    snakeSpeed: Number(match[4]),
    eggCadence: Number(match[5]),
  }));

  assert.equal(rows.length, 10);
  assert.deepEqual(rows.filter((_, index) => ![4, 9].includes(index)).map((row) => row.quota), [5, 7, 9, 11, 12, 13, 14, 15]);
  assert.deepEqual(rows.filter((_, index) => ![4, 9].includes(index)).map((row) => row.snakeSpeed), [0.54, 0.58, 0.61, 0.64, 0.67, 0.68, 0.71, 0.74]);
  assert.ok(rows[0].eggCadence > rows[8].eggCadence);
  assert.match(game, /snake\.targetEggId = eggTarget\?\.id/);
  assert.match(game, /g\.lastShot = -1;\s+g\.keys\.clear\(\)/);
  assert.match(game, /difficulty\.roosterDelay/);
  assert.match(game, /difficulty\.weaselDelay/);
  assert.match(game, /ctx\.clearRect\(0, 0, ctx\.canvas\.width, ctx\.canvas\.height\)/);
});
