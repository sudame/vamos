// ビルドした dist/ が、オフラインで全部動くだけのファイルを Service Worker に持たせているか
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

const dist = new URL("../dist/", import.meta.url);
const read = (p) => readFileSync(new URL(p, dist), "utf8");

test("dist/ がある（mise run test は build のあとに走る）", () => {
  assert.ok(existsSync(new URL("index.html", dist)));
  assert.ok(existsSync(new URL("sw.js", dist)));
});

test("Service Worker が画面・スクリプト・スタイル・アイコンを全部先に保存する", () => {
  const sw = read("sw.js");
  const assets = readdirSync(new URL("assets/", dist));
  for (const f of assets) assert.ok(sw.includes(`assets/${f}`), `precache に無い: assets/${f}`);
  for (const f of ["index.html", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png"]) {
    assert.ok(sw.includes(`"${f}"`), `precache に無い: ${f}`);
  }
});

test("index.html は /vamos/ 配下のパスを参照し、外部のサーバーを参照しない", () => {
  const html = read("index.html");
  assert.match(html, /src="\/vamos\/assets\//);
  assert.doesNotMatch(html, /https?:\/\//);
});

test("manifest はホーム画面に追加できる形になっている", () => {
  const m = JSON.parse(read("manifest.webmanifest"));
  assert.equal(m.display, "standalone");
  assert.ok(m.icons.some((i) => i.sizes === "512x512" && i.purpose === "maskable"));
  for (const i of m.icons) assert.ok(existsSync(new URL(i.src, dist)), `アイコンが無い: ${i.src}`);
});

test("収録音声はマニフェストのとおり dist/ にあり、全部 Service Worker が先に保存する", () => {
  const manifest = JSON.parse(readFileSync(new URL("../src/data/audio.json", import.meta.url), "utf8"));
  const sw = read("sw.js");
  for (const f of new Set(Object.values(manifest.files))) {
    assert.ok(existsSync(new URL(`audio/${f}`, dist)), `音声が無い: ${f}`);
    assert.ok(sw.includes(`audio/${f}`), `precache に無い: audio/${f}`);
  }
});
