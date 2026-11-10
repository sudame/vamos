import { useMemo } from "preact/hooks";
import { SpeakButton, TopBar } from "../components/ui.jsx";
import { GRAMMAR, grammarById, phrasesByGrammar } from "../data.js";
import { masteryOf } from "../srs.js";
import { PhraseList } from "./Browse.jsx";

export function GrammarList({ state }) {
  return (
    <div class="page">
      <TopBar title="文法ノート" />
      <main class="page-main">
        <p class="lead">
          フレーズを丸暗記するだけでなく、型を知って単語を入れ替えれば言えることが増えます。
          ドリルの解説からもここに飛べます。
        </p>
        <ol class="glist">
          {GRAMMAR.map((g, i) => {
            const ps = phrasesByGrammar.get(g.id) ?? [];
            const known = ps.filter((p) => masteryOf(state.cards, p.id) >= 2).length;
            return (
              <li key={g.id}>
                <a href={`#/grammar/${g.id}`} class="gitem">
                  <span class="gitem-num">{i + 1}</span>
                  <span class="gitem-text">
                    <span class="gitem-title">{g.title}</span>
                    <span class="gitem-sum">{g.summary}</span>
                  </span>
                  {ps.length > 0 && (
                    <span class="gitem-count">
                      {known}/{ps.length}
                    </span>
                  )}
                </a>
              </li>
            );
          })}
        </ol>
      </main>
    </div>
  );
}

export function GrammarNote({ state, id }) {
  const g = grammarById.get(id);
  const idx = useMemo(() => GRAMMAR.findIndex((x) => x.id === id), [id]);
  if (!g) {
    return (
      <div class="page">
        <TopBar title="見つかりません" backTo="grammar" />
      </div>
    );
  }
  const rate = state.settings.rate;
  const prev = GRAMMAR[idx - 1];
  const next = GRAMMAR[idx + 1];
  const related = phrasesByGrammar.get(g.id) ?? [];
  return (
    <div class="page">
      <TopBar title="文法ノート" backTo="grammar" />
      <main class="page-main note">
        <h2 class="note-title">{g.title}</h2>
        <p class="note-sum">{g.summary}</p>
        {g.body.map((b, i) => (
          <Block key={i} b={b} />
        ))}
        {g.swap?.length > 0 && (
          <section class="swap">
            <h3>入れ替えて使ってみよう</h3>
            <ul>
              {g.swap.map((s) => (
                <li key={s.es}>
                  <div>
                    <p class="swap-es" lang="es">
                      {s.es}
                    </p>
                    <p class="swap-ja">{s.ja}</p>
                  </div>
                  <SpeakButton text={s.es} rate={rate} />
                </li>
              ))}
            </ul>
          </section>
        )}
        {related.length > 0 && (
          <section>
            <h3>この型を使うフレーズ</h3>
            <PhraseList phrases={related.slice(0, 6)} state={state} />
            {related.length > 6 && (
              <details class="more">
                <summary>ほかに {related.length - 6} 件</summary>
                <PhraseList phrases={related.slice(6)} state={state} />
              </details>
            )}
          </section>
        )}
        <nav class="note-nav">
          {prev ? <a href={`#/grammar/${prev.id}`}>‹ {prev.title}</a> : <span />}
          {next ? <a href={`#/grammar/${next.id}`}>{next.title} ›</a> : <span />}
        </nav>
      </main>
    </div>
  );
}

function Block({ b }) {
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
          <table>
            <thead>
              <tr>
                {b.head.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r) => (
                <tr key={r.join("|")}>
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
      return <p class="tip">💡 {b.text}</p>;
    default:
      return null;
  }
}
