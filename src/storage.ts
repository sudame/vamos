// 学習の記録は端末の localStorage にだけ置く。サーバーには何も送らない。

import type { Card, DayRecord, Settings, State } from "./types.ts";

const KEY = "vamos:v1";

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
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

export function emptyState(): State {
  return { cards: {}, days: {}, settings: { ...DEFAULT_SETTINGS } };
}

const isObj = (v: unknown): v is Record<string, unknown> => v != null && typeof v === "object" && !Array.isArray(v);

// produceMode と theme は型（string）しか見ていないので、知らない値もそのまま通る
function validSetting<K extends keyof Settings>(key: K, v: unknown): v is Settings[K] {
  if (key === "cats") return v === null || (Array.isArray(v) && v.every((c) => typeof c === "string"));
  if (key === "produceMode") return v === "flip" || v === "type";
  if (key === "theme") return v === "auto" || v === "light" || v === "dark";
  if (key === "rate") return typeof v === "number" && Number.isFinite(v) && v >= 0.5 && v <= 1.2;
  return typeof v === typeof DEFAULT_SETTINGS[key];
}

export function migrate(raw: unknown): State {
  const s = emptyState();
  if (!isObj(raw)) return s;
  if (isObj(raw.cards)) {
    for (const [id, c] of Object.entries(raw.cards)) {
      // state と due しか確かめていない。ほかの項目は書き出したときの形を信じる
      if (isObj(c) && typeof c.state === "string" && Number.isFinite(c.due)) s.cards[id] = c as unknown as Card;
    }
  }
  // 日ごとの記録は中身を確かめずに受け入れている
  if (isObj(raw.days)) s.days = raw.days as Record<string, DayRecord>;
  if (isObj(raw.settings)) {
    for (const k of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
      if (k in raw.settings) copySetting(s.settings, k, raw.settings[k]);
    }
  }
  return s;
}

function copySetting<K extends keyof Settings>(settings: Settings, key: K, v: unknown) {
  if (validSetting(key, v)) settings[key] = v;
}

// 書き出したファイルを読み込むとき用。記録らしくなければ null
export function parseBackup(text: string): State | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObj(raw) || !isObj(raw.cards)) return null;
  return migrate(raw);
}

export function load(): State {
  try {
    const text = localStorage.getItem(KEY);
    return migrate(text ? JSON.parse(text) : null);
  } catch {
    return emptyState();
  }
}

export function save(state: State): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function dayKey(now: number): string {
  const d = new Date(now);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function recordAnswer(
  days: Record<string, DayRecord>,
  now: number,
  correct: boolean,
): Record<string, DayRecord> {
  const k = dayKey(now);
  const d = days[k] ?? { answered: 0, correct: 0 };
  return { ...days, [k]: { answered: d.answered + 1, correct: d.correct + (correct ? 1 : 0) } };
}

// 今日を含めて連続で 1 問以上解いた日数
export function streak(days: Record<string, DayRecord>, now: number): number {
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
