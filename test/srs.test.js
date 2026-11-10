import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cardId,
  DAY,
  GRADE,
  LEARN_STEPS,
  MINUTE,
  masteryOf,
  newCard,
  pickNext,
  schedule,
  summarize,
} from "../src/srs.js";

const T0 = 1_800_000_000_000;

test("新しいカードは good を重ねると学習ステップを進み、最後に 1 日後へ卒業する", () => {
  let c = newCard();
  let now = T0;
  for (let i = 1; i < LEARN_STEPS.length; i++) {
    c = schedule(c, GRADE.good, now);
    assert.equal(c.state, "learning");
    assert.equal(c.due, now + LEARN_STEPS[i]);
    now = c.due;
  }
  c = schedule(c, GRADE.good, now);
  assert.equal(c.state, "review");
  assert.equal(c.interval, 1);
  assert.equal(c.due, now + DAY);
});

test("学習中に again を付けると最初のステップに戻る", () => {
  let c = schedule(newCard(), GRADE.good, T0);
  c = schedule(c, GRADE.again, T0 + 10 * MINUTE);
  assert.equal(c.step, 0);
  assert.equal(c.due, T0 + 10 * MINUTE + LEARN_STEPS[0]);
});

test("easy ですぐに 3 日後へ卒業する", () => {
  const c = schedule(newCard(), GRADE.easy, T0);
  assert.equal(c.state, "review");
  assert.equal(c.interval, 3);
});

test("復習で忘れると relearning になり、やり直しのあとは短くなった間隔で戻る", () => {
  let c = { ...newCard(), state: "review", interval: 10, due: T0 };
  c = schedule(c, GRADE.again, T0);
  assert.equal(c.state, "relearning");
  assert.equal(c.lapses, 1);
  assert.equal(c.interval, 5);
  c = schedule(c, GRADE.good, c.due);
  c = schedule(c, GRADE.good, c.due);
  assert.equal(c.state, "review");
  assert.equal(c.interval, 5);
});

test("期限どおりの復習の good は ease 倍に伸びる", () => {
  const c = schedule({ ...newCard(), state: "review", interval: 2, due: T0 }, GRADE.good, T0);
  assert.equal(c.interval, 5);
  assert.equal(c.due, T0 + 5 * DAY);
});

test("先取りの復習は間隔を伸ばさない", () => {
  const before = { ...newCard(), state: "review", interval: 4, due: T0 + 4 * DAY };
  const c = schedule(before, GRADE.good, T0);
  assert.equal(c.interval, 4);
  assert.equal(c.due, before.due);
});

test("ease は下限 1.3 を割らない", () => {
  let c = { ...newCard(), state: "review", interval: 1, due: T0, ease: 1.35 };
  c = schedule(c, GRADE.again, T0);
  assert.equal(c.ease, 1.3);
});

const P = [{ id: "a" }, { id: "b" }, { id: "c" }];

test("何もなければ先頭のフレーズの rec を新しく出す", () => {
  assert.deepEqual(pickNext({}, P, T0), { id: "a:rec", kind: "new" });
});

test("期限の来たカードを新しいカードより先に出す", () => {
  const cards = { [cardId("b", "rec")]: { ...newCard(), state: "learning", due: T0 - 1 } };
  assert.deepEqual(pickNext(cards, P, T0), { id: "b:rec", kind: "due" });
});

test("rec を卒業したフレーズは pro を新しいカードより先に解放する", () => {
  const cards = { [cardId("a", "rec")]: { ...newCard(), state: "review", interval: 1, due: T0 + DAY } };
  assert.deepEqual(pickNext(cards, P, T0), { id: "a:pro", kind: "new" });
});

test("覚えかけが上限に達したら新しいカードを出さず、覚えかけを先取りする", () => {
  const cards = {
    "a:rec": { ...newCard(), state: "learning", due: T0 + 5 * MINUTE },
    "b:rec": { ...newCard(), state: "learning", due: T0 + 2 * MINUTE },
  };
  assert.deepEqual(pickNext(cards, P, T0, { maxLearning: 2 }), { id: "b:rec", kind: "ahead" });
});

test("avoid にある id は、ほかに出せるものがあれば避ける", () => {
  const cards = { "a:rec": { ...newCard(), state: "learning", due: T0 - 1 } };
  assert.deepEqual(pickNext(cards, P, T0, { avoid: ["a:rec"] }), { id: "b:rec", kind: "new" });
});

test("出せるのが avoid の 1 枚だけでも、止まらずにそれを出す", () => {
  const cards = { "a:rec": { ...newCard(), state: "learning", due: T0 + MINUTE } };
  assert.deepEqual(pickNext(cards, [{ id: "a" }], T0, { avoid: ["a:rec", "a:pro"], maxLearning: 1 }), {
    id: "a:rec",
    kind: "ahead",
  });
});

test("全部卒業していても先取りで出し続ける", () => {
  const cards = {
    "a:rec": { ...newCard(), state: "review", interval: 3, due: T0 + 3 * DAY },
    "a:pro": { ...newCard(), state: "review", interval: 1, due: T0 + DAY },
  };
  assert.deepEqual(pickNext(cards, [{ id: "a" }], T0), { id: "a:pro", kind: "ahead" });
});

test("対象のフレーズがなければ null", () => {
  assert.equal(pickNext({}, [], T0), null);
});

test("masteryOf は rec と pro の卒業で段階が上がる", () => {
  assert.equal(masteryOf({}, "a"), 0);
  assert.equal(masteryOf({ "a:rec": { ...newCard(), state: "learning" } }, "a"), 1);
  assert.equal(masteryOf({ "a:rec": { ...newCard(), state: "review", interval: 1 } }, "a"), 2);
  assert.equal(
    masteryOf(
      {
        "a:rec": { ...newCard(), state: "review", interval: 1 },
        "a:pro": { ...newCard(), state: "review", interval: 1 },
      },
      "a",
    ),
    3,
  );
});

test("先取りの答えでは ease が変わらない", () => {
  const before = { ...newCard(), state: "review", interval: 4, due: T0 + 4 * DAY };
  assert.equal(schedule(before, GRADE.easy, T0).ease, before.ease);
  assert.equal(schedule(before, GRADE.hard, T0).ease, before.ease);
});

test("全部卒業したあとの先取りは、すべてのカードを順に回す", () => {
  const phrases = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}` }));
  let cards = {};
  for (const p of phrases) {
    cards[`${p.id}:rec`] = { ...newCard(), state: "review", interval: 3, due: T0 + 3 * DAY };
    cards[`${p.id}:pro`] = { ...newCard(), state: "review", interval: 3, due: T0 + 3 * DAY };
  }
  const shown = new Set();
  const recent = [];
  let now = T0;
  for (let i = 0; i < 40; i++) {
    const pick = pickNext(cards, phrases, now, { avoid: recent });
    shown.add(pick.id);
    recent.unshift(pick.id);
    recent.length = Math.min(recent.length, 2);
    cards = { ...cards, [pick.id]: schedule(cards[pick.id], GRADE.good, now) };
    now += 10_000;
  }
  assert.equal(shown.size, 20);
});

test("summarize は期限の来たカードとまだ始めていないフレーズを数える", () => {
  const cards = {
    "a:rec": { ...newCard(), state: "review", interval: 1, due: T0 - 1 },
    "a:pro": { ...newCard(), state: "learning", due: T0 + MINUTE },
  };
  assert.deepEqual(summarize(cards, P, T0), { due: 1, fresh: 2 });
});
