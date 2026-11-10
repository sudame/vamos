import { useMemo, useState } from "preact/hooks";
import { fold } from "../answer.js";
import { CATEGORIES, categoryById } from "../categories.js";
import { CatTag, Explain, MasteryDots, SpeakButton, TopBar } from "../components/ui.jsx";
import { PHRASES } from "../data.js";
import { masteryOf } from "../srs.js";

function matches(p, q) {
  if (!q) return true;
  const f = fold(q);
  return (
    fold(p.es).includes(f) ||
    p.ja.includes(q) ||
    (p.kana ?? "").includes(q) ||
    (p.words ?? []).some((w) => fold(w.w).includes(f))
  );
}

export function Browse({ state, cat }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(null);
  const list = useMemo(() => PHRASES.filter((p) => (!cat || p.cat === cat) && matches(p, query.trim())), [cat, query]);
  const title = cat ? (categoryById.get(cat)?.ja ?? "フレーズ") : "フレーズ一覧";
  return (
    <div class="page">
      <TopBar title={title} backTo={cat ? "browse" : ""} />
      <main class="page-main">
        <input
          class="search"
          type="search"
          value={query}
          onInput={(e) => setQuery(e.currentTarget.value)}
          placeholder="スペイン語・日本語で探す"
          aria-label="フレーズを探す"
        />
        {!cat && !query && (
          <ul class="chips">
            {CATEGORIES.map((c) => (
              <li key={c.id}>
                <a class="chip" href={`#/browse/${c.id}`}>
                  {c.icon} {c.ja}
                </a>
              </li>
            ))}
          </ul>
        )}
        <p class="small">{list.length} 件</p>
        <ul class="plist">
          {list.map((p) => (
            <li key={p.id} class={open === p.id ? "pitem open" : "pitem"}>
              <button type="button" class="pitem-head" onClick={() => setOpen(open === p.id ? null : p.id)}>
                <span class="pitem-es" lang="es">
                  {p.es}
                </span>
                <span class="pitem-ja">{p.ja}</span>
                <MasteryDots level={masteryOf(state.cards, p.id)} />
              </button>
              {open === p.id && (
                <div class="pitem-body">
                  <div class="face-sub">
                    {p.kana && <span class="kana">{p.kana}</span>}
                    <SpeakButton text={p.es} rate={state.settings.rate} />
                  </div>
                  {!cat && <CatTag cat={p.cat} />}
                  <Explain phrase={p} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

export function PhraseList({ phrases, state }) {
  return (
    <ul class="plist compact">
      {phrases.map((p) => (
        <li key={p.id} class="pitem">
          <a class="pitem-head" href={`#/phrase/${p.id}`}>
            <span class="pitem-es" lang="es">
              {p.es}
            </span>
            <span class="pitem-ja">{p.ja}</span>
            <MasteryDots level={masteryOf(state.cards, p.id)} />
          </a>
        </li>
      ))}
    </ul>
  );
}
