// 間隔反復の計算。状態を持たない純粋な関数だけを置く。
//
// カードは 1 フレーズにつき 2 枚ある。
//   rec: スペイン語を見て（聞いて）意味が分かるか
//   pro: 日本語を見てスペイン語が出てくるか
// pro は rec を一度卒業してから出す。

export const MINUTE = 60 * 1000;
export const DAY = 24 * 60 * MINUTE;

export const LEARN_STEPS = [1 * MINUTE, 5 * MINUTE, 15 * MINUTE];
export const RELEARN_STEPS = [3 * MINUTE, 12 * MINUTE];

export const GRADE = Object.freeze({ again: 0, hard: 1, good: 2, easy: 3 });

const START_EASE = 2.5;
const MIN_EASE = 1.3;

export function cardId(phraseId, dir) {
  return `${phraseId}:${dir}`;
}

export function newCard() {
  return {
    state: "new",
    step: 0,
    due: 0,
    interval: 0,
    ease: START_EASE,
    reps: 0,
    lapses: 0,
  };
}

function stepsFor(state) {
  return state === "relearning" ? RELEARN_STEPS : LEARN_STEPS;
}

// grade を受けたあとのカードを返す。interval の単位は日。
export function schedule(card, grade, now) {
  const c = { ...card, reps: card.reps + 1 };

  if (c.state === "new" || c.state === "learning" || c.state === "relearning") {
    if (c.state === "new") c.state = "learning";
    const steps = stepsFor(c.state);
    const graduateInterval = c.state === "relearning" ? Math.max(1, c.interval) : 1;

    if (grade === GRADE.again) {
      c.step = 0;
      c.due = now + steps[0];
    } else if (grade === GRADE.hard) {
      c.due = now + Math.round(steps[Math.min(c.step, steps.length - 1)] * 1.5);
    } else if (grade === GRADE.good) {
      c.step += 1;
      if (c.step >= steps.length) {
        graduate(c, graduateInterval, now);
      } else {
        c.due = now + steps[c.step];
      }
    } else {
      graduate(c, c.state === "relearning" ? graduateInterval * 1.5 : 3, now);
    }
    return c;
  }

  // review。予定より早く答えたとき（機内で先取りしたとき）は、間隔を伸ばさない。
  const early = now < c.due;
  if (grade === GRADE.again) {
    c.lapses += 1;
    c.ease = Math.max(MIN_EASE, c.ease - 0.2);
    c.interval = Math.max(1, c.interval * 0.5);
    c.state = "relearning";
    c.step = 0;
    c.due = now + RELEARN_STEPS[0];
    return c;
  }
  if (early) {
    if (grade === GRADE.hard) c.ease = Math.max(MIN_EASE, c.ease - 0.15);
    if (grade === GRADE.easy) c.ease += 0.15;
    c.due = Math.max(c.due, now + c.interval * DAY * 0.5);
    return c;
  }
  if (grade === GRADE.hard) {
    c.ease = Math.max(MIN_EASE, c.ease - 0.15);
    c.interval = c.interval * 1.2;
  } else if (grade === GRADE.good) {
    c.interval = c.interval * c.ease;
  } else {
    c.interval = c.interval * c.ease * 1.3;
    c.ease += 0.15;
  }
  c.due = now + c.interval * DAY;
  return c;
}

function graduate(c, intervalDays, now) {
  c.state = "review";
  c.step = 0;
  c.interval = intervalDays;
  c.due = now + intervalDays * DAY;
}

export function isLearning(card) {
  return card != null && (card.state === "learning" || card.state === "relearning");
}

export function isGraduated(card) {
  return card != null && card.state === "review";
}

// 次に出すカードを選ぶ。
//   1. 期限が来た learning / relearning / review（期限の早い順）
//   2. 覚えかけが maxLearning 枚未満なら新しいカード（pro の解放を rec より先に）
//   3. それもなければ、期限の早いものを先取りする
// phrases は出題対象のフレーズ（カテゴリで絞ったあと）を、出す順に並べたもの。
// avoid に入れた id は、ほかに出せるものがある限り選ばない（直前と同じ問題を避ける）。
export function pickNext(cards, phrases, now, { maxLearning = 8, avoid = [] } = {}) {
  const avoidSet = new Set(avoid);
  const started = [];
  let learningCount = 0;
  const unlockPro = [];
  const fresh = [];

  for (const p of phrases) {
    const rec = cards[cardId(p.id, "rec")];
    const pro = cards[cardId(p.id, "pro")];
    if (rec == null || rec.state === "new") {
      fresh.push(cardId(p.id, "rec"));
    } else {
      started.push([cardId(p.id, "rec"), rec]);
      if (isLearning(rec)) learningCount += 1;
    }
    if (pro != null && pro.state !== "new") {
      started.push([cardId(p.id, "pro"), pro]);
      if (isLearning(pro)) learningCount += 1;
    } else if (isGraduated(rec)) {
      unlockPro.push(cardId(p.id, "pro"));
    }
  }

  const byDue = (a, b) => a[1].due - b[1].due;
  const due = started.filter(([, c]) => c.due <= now).sort(byDue);
  const dueOk = due.find(([id]) => !avoidSet.has(id));
  if (dueOk) return { id: dueOk[0], kind: "due" };

  if (learningCount < maxLearning) {
    const n = [...unlockPro, ...fresh].find((id) => !avoidSet.has(id));
    if (n) return { id: n, kind: "new" };
  }

  const ahead = [...started].sort((a, b) => {
    // 覚えかけを先に、そのあと期限の早い順
    const la = isLearning(a[1]) ? 0 : 1;
    const lb = isLearning(b[1]) ? 0 : 1;
    return la - lb || a[1].due - b[1].due;
  });
  const aheadOk = ahead.find(([id]) => !avoidSet.has(id));
  if (aheadOk) return { id: aheadOk[0], kind: "ahead" };

  const anyNew = [...unlockPro, ...fresh][0];
  if (anyNew) return { id: anyNew, kind: "new" };
  if (due[0]) return { id: due[0][0], kind: "due" };
  if (ahead[0]) return { id: ahead[0][0], kind: "ahead" };
  return null;
}

export function parseCardId(id) {
  const i = id.lastIndexOf(":");
  return { phraseId: id.slice(0, i), dir: id.slice(i + 1) };
}

// フレーズの習熟度。0 未着手、1 覚えかけ、2 意味は分かる、3 言える
export function masteryOf(cards, phraseId) {
  const rec = cards[cardId(phraseId, "rec")];
  const pro = cards[cardId(phraseId, "pro")];
  if (isGraduated(pro) || (pro?.state === "relearning" && pro.interval >= 1)) return 3;
  if (isGraduated(rec) || (rec?.state === "relearning" && rec.interval >= 1)) return 2;
  if (rec != null && rec.state !== "new") return 1;
  return 0;
}
