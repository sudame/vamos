// 学習の記録は端末の localStorage にだけ置く。サーバーには何も送らない。

const KEY = "vamos:v1";

export const DEFAULT_SETTINGS = Object.freeze({
  cats: null, // null はすべてのカテゴリ
  produceMode: "flip", // flip: めくって自己採点 / type: 打ち込む
  autoSpeak: true,
  autoNext: true, // 正解したら少し待って次の問題へ
  useRecorded: true, // 同梱の収録音声を使う。false なら端末の音声合成
  rate: 0.9,
  showKana: true,
  listenQuiz: true,
  theme: "auto",
});

export function emptyState() {
  return { cards: {}, days: {}, settings: { ...DEFAULT_SETTINGS } };
}

const isObj = (v) => v != null && typeof v === "object" && !Array.isArray(v);

function validSetting(key, v) {
  if (key === "cats") return v === null || (Array.isArray(v) && v.every((c) => typeof c === "string"));
  return typeof v === typeof DEFAULT_SETTINGS[key];
}

export function migrate(raw) {
  const s = emptyState();
  if (!isObj(raw)) return s;
  if (isObj(raw.cards)) {
    for (const [id, c] of Object.entries(raw.cards)) {
      if (isObj(c) && typeof c.state === "string" && Number.isFinite(c.due)) s.cards[id] = c;
    }
  }
  if (isObj(raw.days)) s.days = raw.days;
  if (isObj(raw.settings)) {
    for (const k of Object.keys(DEFAULT_SETTINGS)) {
      if (k in raw.settings && validSetting(k, raw.settings[k])) s.settings[k] = raw.settings[k];
    }
  }
  return s;
}

// 書き出したファイルを読み込むとき用。記録らしくなければ null
export function parseBackup(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObj(raw) || !isObj(raw.cards)) return null;
  return migrate(raw);
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
