// カードから問題を作る。

import { parseCardId } from "./srs.ts";
import type { CardPick, Phrase, Question, Settings } from "./types.ts";

export function shuffle<T>(arr: readonly T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 同じカテゴリから優先して、日本語訳が重ならない誤答を n 個選ぶ
export function distractors(phrase: Phrase, all: Phrase[], n = 3, rng: () => number = Math.random): Phrase[] {
  const seen = new Set([phrase.ja]);
  const out: Phrase[] = [];
  const pools = [
    shuffle(
      all.filter((p) => p.cat === phrase.cat),
      rng,
    ),
    shuffle(all, rng),
  ];
  for (const pool of pools) {
    for (const p of pool) {
      if (out.length >= n) return out;
      if (seen.has(p.ja) || p.id === phrase.id) continue;
      seen.add(p.ja);
      out.push(p);
    }
  }
  return out;
}

// type:
//   intro  初めて見るフレーズ。全部見せて覚えてもらう
//   choice スペイン語を見て、日本語を 4 択
//   listen 音だけ聞いて、日本語を 4 択
//   flip   日本語を見て、スペイン語を思い出してからめくる
//   type   日本語を見て、スペイン語を打ち込む
export function makeQuestion(
  pick: CardPick,
  byId: Map<string, Phrase>,
  all: Phrase[],
  settings: Settings,
  { canSpeak = false, rng = Math.random }: { canSpeak?: boolean; rng?: () => number } = {},
): Question | null {
  const { phraseId, dir } = parseCardId(pick.id);
  const phrase = byId.get(phraseId);
  if (!phrase) return null;
  const base = { cardId: pick.id, phrase, dir, kind: pick.kind };

  if (dir === "rec") {
    if (pick.kind === "new") return { ...base, type: "intro" };
    const options = shuffle([phrase, ...distractors(phrase, all, 3, rng)], rng);
    const listen = settings.listenQuiz && canSpeak && rng() < 0.35;
    return { ...base, type: listen ? "listen" : "choice", options };
  }
  return { ...base, type: settings.produceMode === "type" ? "type" : "flip" };
}
