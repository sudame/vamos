import { useState } from "preact/hooks";
import { Icon, Screen, Spanish } from "../components/ui.tsx";
import { GRAMMAR, grammarById, phrasesByGrammar } from "../data.ts";
import { masteryOf } from "../srs.ts";
import type { GrammarBlock, ScreenProps } from "../types.ts";
import { PhraseList } from "./Browse.tsx";

const SHOW_RELATED = 6;

export function GrammarList({ state }: ScreenProps) {
  return (
    <Screen tab="grammar" title="文法ノート">
      <p class="lead">型を知っておくと、単語を入れ替えて言えることが増えます。</p>
      <ol class="rows">
        {GRAMMAR.map((g) => {
          const ps = phrasesByGrammar.get(g.id) ?? [];
          const known = ps.filter((p) => masteryOf(state.cards, p.id) >= 2).length;
          return (
            <li key={g.id}>
              <a href={`#/grammar/${g.id}`} class="row link-row">
                <span class="row-main">
                  <span class="row-title">{g.title}</span>
                  <span class="row-sub clamp">{g.summary}</span>
                </span>
                {ps.length > 0 && (
                  <span class="row-count">
                    {known}
                    <small>/{ps.length}</small>
                  </span>
                )}
                <Icon name="chevron" size={18} />
              </a>
            </li>
          );
        })}
      </ol>
    </Screen>
  );
}

export function GrammarNote({ state, id }: ScreenProps & { id: string }) {
  const g = grammarById.get(id);
  const [more, setMore] = useState(false);
  if (!g) {
    return (
      <Screen tab="grammar" title="見つかりません" back="grammar">
        <p class="empty">このノートはありません。</p>
      </Screen>
    );
  }
  const rate = state.settings.rate;
  const idx = GRAMMAR.indexOf(g);
  const next = GRAMMAR[idx + 1];
  const related = phrasesByGrammar.get(g.id) ?? [];
  return (
    <Screen tab="grammar" title="文法ノート" back="grammar">
      <article class="note-page">
        <h2 class="note-title">{g.title}</h2>
        <p class="note-sum">{g.summary}</p>
        {g.body.map((b, i) => (
          <Block key={i} b={b} />
        ))}

        {g.swap && g.swap.length > 0 && (
          <section>
            <h3 class="section-title">入れ替えてみる</h3>
            <ul class="rows">
              {g.swap.map((s) => (
                <li key={s.es} class="row phrase-row">
                  <span class="row-main">
                    <Spanish text={s.es} rate={rate} class="row-es" />
                    <span class="row-sub">{s.ja}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {related.length > 0 && (
          <section>
            <h3 class="section-title">この型を使うフレーズ</h3>
            <PhraseList phrases={more ? related : related.slice(0, SHOW_RELATED)} state={state} />
            {!more && related.length > SHOW_RELATED && (
              <button type="button" class="text-btn more" onClick={() => setMore(true)}>
                ほかに {related.length - SHOW_RELATED} 件を表示
              </button>
            )}
          </section>
        )}

        {next && (
          <a class="row link-row next-note" href={`#/grammar/${next.id}`}>
            <span class="row-main">
              <span class="row-sub">次のノート</span>
              <span class="row-title">{next.title}</span>
            </span>
            <Icon name="chevron" size={18} />
          </a>
        )}
      </article>
    </Screen>
  );
}

function Block({ b }: { b: GrammarBlock }) {
  switch (b.type) {
    case "p":
      return <p class="note-p">{b.text}</p>;
    case "pattern":
      return (
        <div class="pattern">
          <p class="pattern-es" lang="es">
            {b.es}
          </p>
          <p class="pattern-ja">{b.ja}</p>
        </div>
      );
    case "table":
      return (
        <div class="table-wrap">
          <table class="conj">
            <thead>
              <tr>
                {b.head.map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, i) => (
                    <td key={i}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "tip":
      return <p class="tip">{b.text}</p>;
    default:
      return null;
  }
}
