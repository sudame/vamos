import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS, dayKey, migrate, parseBackup, recordAnswer, streak } from "../src/storage.js";

test("migrate は壊れた入力でも空の状態を返す", () => {
  assert.deepEqual(migrate(null).cards, {});
  assert.deepEqual(migrate("x").settings, DEFAULT_SETTINGS);
});

test("migrate は足りない設定を既定値で埋める", () => {
  const s = migrate({ settings: { rate: 0.7 } });
  assert.equal(s.settings.rate, 0.7);
  assert.equal(s.settings.produceMode, "flip");
});

test("recordAnswer はその日の回答数と正答数を足す", () => {
  const now = new Date(2026, 10, 11, 10).getTime();
  let days = recordAnswer({}, now, true);
  days = recordAnswer(days, now, false);
  assert.deepEqual(days[dayKey(now)], { answered: 2, correct: 1 });
});

test("streak は今日が未回答でも昨日まで続いていれば数える", () => {
  const day = (d) => new Date(2026, 10, d, 12).getTime();
  const days = {
    [dayKey(day(8))]: { answered: 1, correct: 1 },
    [dayKey(day(9))]: { answered: 3, correct: 2 },
    [dayKey(day(10))]: { answered: 5, correct: 5 },
  };
  assert.equal(streak(days, day(10)), 3);
  assert.equal(streak(days, day(11)), 3);
  assert.equal(streak(days, day(12)), 0);
});

test("migrate は型の合わない設定と壊れたカードを捨てる", () => {
  const s = migrate({
    settings: { rate: "fast", theme: "dark", cats: ["bar", 1] },
    cards: { "a:rec": { state: "review", due: 1 }, "b:rec": "x", "c:rec": { state: "new" } },
  });
  assert.equal(s.settings.rate, DEFAULT_SETTINGS.rate);
  assert.equal(s.settings.theme, "dark");
  assert.equal(s.settings.cats, null);
  assert.deepEqual(Object.keys(s.cards), ["a:rec"]);
});

test("parseBackup は記録でない JSON を受け付けない", () => {
  assert.equal(parseBackup("[]"), null);
  assert.equal(parseBackup('{"foo":1}'), null);
  assert.equal(parseBackup("{"), null);
  assert.ok(parseBackup('{"cards":{}}'));
});
