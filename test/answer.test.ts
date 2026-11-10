import assert from "node:assert/strict";
import { test } from "node:test";
import { check, diffMarks, fold, normalize } from "../src/answer.ts";

test("normalize は大文字・記号・空白を無視する", () => {
  assert.equal(normalize("  ¿Me pones   una CAÑA, por favor? "), "me pones una caña por favor");
});

test("fold はアクセント記号と ñ も畳む", () => {
  assert.equal(fold("¿Dónde está el baño?"), "donde esta el bano");
});

test("記号と大文字だけ違えば exact", () => {
  assert.equal(check("la cuenta por favor", ["La cuenta, por favor."]).result, "exact");
});

test("por favor の有無は問わない", () => {
  assert.equal(check("La cuenta", ["La cuenta, por favor."]).result, "exact");
});

test("アクセント記号だけ違えば accent", () => {
  assert.equal(check("donde esta el bano", ["¿Dónde está el baño?"]).result, "accent");
});

test("1 文字の打ち間違いは close", () => {
  assert.equal(check("¿Dónde está el bañp?", ["¿Dónde está el baño?"]).result, "close");
});

test("短い語の打ち間違いは close にしない", () => {
  assert.equal(check("sí", ["No."]).result, "wrong");
  assert.equal(check("noo", ["No."]).result, "wrong");
});

test("別解でも正解になり、matched にその別解が入る", () => {
  const r = check("una caña por favor", ["¿Me pones una caña, por favor?", "Una caña, por favor."]);
  assert.equal(r.result, "exact");
  assert.equal(r.matched, "Una caña, por favor.");
});

test("空の答えは wrong", () => {
  assert.equal(check("   ", ["Hola."]).result, "wrong");
});

test("diffMarks は足りない文字に印を付け、記号は気にしない", () => {
  const marks = diffMarks("donde esta", "¿Dónde está?");
  const missed = marks.filter((m) => !m.ok).map((m) => m.ch);
  assert.deepEqual(missed, ["ó", "á"]);
});

test("diffMarks は省いた por favor を責めない", () => {
  const marks = diffMarks("me pones una cana", "¿Me pones una caña, por favor?");
  assert.deepEqual(
    marks.filter((m) => !m.ok).map((m) => m.ch),
    ["ñ"],
  );
});

test("1 文字違いで別の語になるものは正解にならない（close は正解に数えない側）", () => {
  assert.equal(check("julio", ["junio"]).result, "close");
  assert.equal(check("ocho", ["Otra, por favor."]).result, "wrong");
});
