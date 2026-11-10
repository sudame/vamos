// 学習の記録は端末の localStorage にだけ置く。サーバーには何も送らない。

const KEY = "vamos:v1";

export const DEFAULT_SETTINGS = Object.freeze({
  cats: null, // null はすべてのカテゴリ
  produceMode: "flip", // flip: めくって自己採点 / type: 打ち込む
  autoSpeak: true,
  rate: 0.9,
  showKana: true,
  listenQuiz: true,
  theme: "auto",
});

export function emptyState() {
  return { cards: {}, days: {}, settings: { ...DEFAULT_SETTINGS }, starred: {} };
}

export function migrate(raw) {
  const s = emptyState();
  if (raw == null || typeof raw !== "object") return s;
  if (raw.cards && typeof raw.cards === "object") s.cards = raw.cards;
  if (raw.days && typeof raw.days === "object") s.days = raw.days;
  if (raw.starred && typeof raw.starred === "object") s.starred = raw.starred;
  if (raw.settings && typeof raw.settings === "object") {
    s.settings = { ...DEFAULT_SETTINGS, ...raw.settings };
  }
  return s;
}

export function load() {
  try {
    const text = localStorage.getItem(KEY);
    return migrate(text ? JSON.parse(text) : null);
  } catch {
    return emptyState();
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function dayKey(now) {
  const d = new Date(now);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function recordAnswer(days, now, correct) {
  const k = dayKey(now);
  const d = days[k] ?? { answered: 0, correct: 0 };
  return { ...days, [k]: { answered: d.answered + 1, correct: d.correct + (correct ? 1 : 0) } };
}

// 今日を含めて連続で 1 問以上解いた日数
export function streak(days, now) {
  let n = 0;
  const d = new Date(now);
  // 今日まだ解いていなくても、昨日まで続いていれば数える
  if (!days[dayKey(d.getTime())]?.answered) d.setDate(d.getDate() - 1);
  while (days[dayKey(d.getTime())]?.answered) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
