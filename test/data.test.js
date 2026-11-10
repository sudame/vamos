// フレーズ集と文法ノートの中身を確かめる
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { CATEGORY_IDS } from "../src/categories.js";

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const phrases = read("../src/data/phrases.json");
const grammar = read("../src/data/grammar.json");
const grammarIds = new Set(grammar.map((g) => g.id));

test("フレーズの id は一意で、カテゴリは既知のもの", () => {
  const ids = new Set();
  for (const p of phrases) {
    assert.ok(!ids.has(p.id), `重複: ${p.id}`);
    ids.add(p.id);
    assert.ok(CATEGORY_IDS.includes(p.cat), `${p.id}: 不明なカテゴリ ${p.cat}`);
  }
});

test("どのカテゴリにもフレーズがある", () => {
  for (const c of CATEGORY_IDS) {
    assert.ok(
      phrases.some((p) => p.cat === c),
      `${c} が空`,
    );
  }
});

test("フレーズは es と ja を持ち、¿ と ¡ は閉じている", () => {
  for (const p of phrases) {
    assert.ok(p.es?.trim(), `${p.id}: es が空`);
    assert.ok(p.ja?.trim(), `${p.id}: ja が空`);
    for (const s of [p.es, ...(p.alt ?? [])]) {
      const opens = (s.match(/¿/g) ?? []).length;
      const closes = (s.match(/\?/g) ?? []).length;
      assert.equal(opens, closes, `${p.id}: ¿ と ? の数が合わない: ${s}`);
      assert.equal((s.match(/¡/g) ?? []).length, (s.match(/!/g) ?? []).length, `${p.id}: ¡ と ! の数: ${s}`);
    }
  }
});

test("フレーズの解説は単語の分解を持ち、文法ノートへのリンクは実在する", () => {
  for (const p of phrases) {
    assert.ok(Array.isArray(p.words) && p.words.length > 0, `${p.id}: words が空`);
    for (const w of p.words) assert.ok(w.w && w.ja, `${p.id}: words の要素が不完全`);
    for (const g of p.grammar ?? []) assert.ok(grammarIds.has(g), `${p.id}: 不明な文法ノート ${g}`);
  }
});

test("文法ノートの id は一意で、本文のブロックは既知の形", () => {
  assert.equal(grammarIds.size, grammar.length);
  for (const g of grammar) {
    assert.ok(g.title && g.summary, `${g.id}: title か summary が空`);
    for (const b of g.body) {
      assert.ok(["p", "pattern", "table", "tip"].includes(b.type), `${g.id}: 不明なブロック ${b.type}`);
      if (b.type === "table") {
        for (const r of b.rows) assert.equal(r.length, b.head.length, `${g.id}: 表の列数が合わない`);
      }
    }
  }
});

test("収録音声のマニフェストは、今のフレーズと例文の文だけを持つ", () => {
  const audio = read("../src/data/audio.json");
  const texts = new Set([...phrases.map((p) => p.es), ...grammar.flatMap((g) => (g.swap ?? []).map((s) => s.es))]);
  for (const t of Object.keys(audio.files)) assert.ok(texts.has(t), `使われていない音声: ${t}`);
  if (Object.keys(audio.files).length > 0) {
    for (const t of texts) assert.ok(t in audio.files, `音声が無い: ${t}`);
  }
});
