import assert from "node:assert/strict";
import { test } from "node:test";
import { fileFor, genderOf, plan, segmentsFor, VOICES } from "../scripts/audio-plan.ts";

test("（男性）（女性）の印があれば、その性別の声で読む", () => {
  for (let i = 0; i < 20; i++) {
    assert.equal(genderOf(segmentsFor(`Soy japonés ${i}.`, "私は日本人です（男性）")[0].voice), "male");
    assert.equal(genderOf(segmentsFor(`Encantada ${i}.`, "はじめまして（女性が言う）")[0].voice), "female");
    assert.equal(genderOf(segmentsFor(`Estoy cansada ${i}.`, "（女性が）疲れています")[0].voice), "female");
  }
});

test("男女の並記は前を男性、後ろを女性で読む", () => {
  const s = segmentsFor("Soy japonés. / Soy japonesa.", "日本人です。（男性／女性）");
  assert.deepEqual(
    s.map((x) => x.text),
    ["Soy japonés.", "Soy japonesa."],
  );
  assert.deepEqual(
    s.map((x) => genderOf(x.voice)),
    ["male", "female"],
  );
});

test("対話は 2 人を別の性別にする", () => {
  for (const es of ["Gracias. ―De nada.", "¿Qué hora es? ―Son las tres y media.", "Hola. ―Hola."]) {
    const s = segmentsFor(es, "");
    assert.equal(s.length, 2);
    assert.notEqual(genderOf(s[0].voice), genderOf(s[1].voice));
  }
});

test("印のない文は 4 人に散らばり、同じ文はいつも同じ声", () => {
  const used = new Set();
  for (let i = 0; i < 100; i++) used.add(segmentsFor(`Frase ${i}.`, "")[0].voice);
  assert.equal(used.size, [...VOICES.male, ...VOICES.female].length);
  assert.deepEqual(segmentsFor("Hola.", ""), segmentsFor("Hola.", ""));
});

test("ファイル名は声と文で変わる", () => {
  assert.notEqual(
    fileFor([{ text: "Hola.", voice: VOICES.male[0] }]),
    fileFor([{ text: "Hola.", voice: VOICES.male[1] }]),
  );
});

test("今のデータでは、性の印と対話の規則が全部守られている", () => {
  for (const [es, e] of plan(new URL("../", import.meta.url))) {
    if (/[―—]/.test(es)) assert.ok(e.segments.length >= 2, es);
  }
});
