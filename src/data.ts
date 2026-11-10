import grammar from "./data/grammar.json";
import phrases from "./data/phrases.json";
import type { Grammar, Phrase, Settings } from "./types.ts";

export const PHRASES: Phrase[] = phrases;
export const phraseById = new Map(PHRASES.map((p) => [p.id, p]));

// JSON から推論される型ではブロックの type が string になり、GrammarBlock の判別に合わない。
// 形は test/data.test.ts で検査している
export const GRAMMAR = grammar as Grammar[];
export const grammarById = new Map(GRAMMAR.map((g) => [g.id, g]));

// 文法ノートから、そのノートを使うフレーズを引く
export const phrasesByGrammar = new Map<string, Phrase[]>();
for (const p of PHRASES) {
  for (const g of p.grammar ?? []) {
    if (!phrasesByGrammar.has(g)) phrasesByGrammar.set(g, []);
    phrasesByGrammar.get(g)?.push(p);
  }
}

// 設定で選んだカテゴリのフレーズ
export function eligiblePhrases(settings: Settings): Phrase[] {
  const cats = settings.cats;
  return cats == null ? PHRASES : PHRASES.filter((p) => cats.includes(p.cat));
}
