import grammar from "./data/grammar.json";
import phrases from "./data/phrases.json";

export const PHRASES = phrases;
export const phraseById = new Map(PHRASES.map((p) => [p.id, p]));

export const GRAMMAR = grammar;
export const grammarById = new Map(GRAMMAR.map((g) => [g.id, g]));

// 文法ノートから、そのノートを使うフレーズを引く
export const phrasesByGrammar = new Map();
for (const p of PHRASES) {
  for (const g of p.grammar ?? []) {
    if (!phrasesByGrammar.has(g)) phrasesByGrammar.set(g, []);
    phrasesByGrammar.get(g).push(p);
  }
}
