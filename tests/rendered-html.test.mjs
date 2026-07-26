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
  assert.match(data, /Math\.max\(2\.4,/);
  assert.match(data, /function farmEggCadence/);
  assert.match(data, /Math\.max\(1\.75, 3\.4/);
  assert.match(game, /eggLayClock/);
  assert.match(game, /readyHens/);
  assert.match(game, /requestAnimationFrame/);
  assert.match(game, /activePower/);
  assert.match(data, /Corn Cannon/);
  assert.match(game, /restartLevel/);
});
