import { useMemo, useState } from "preact/hooks";
import { fold } from "../answer.js";
import { CATEGORIES } from "../categories.js";
import { Explain, Icon, Level, Screen, Spanish } from "../components/ui.jsx";
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

export function Browse({ state, cat: initialCat }) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState(initialCat || "");
  const [open, setOpen] = useState(null);
  const q = query.trim();
  const list = useMemo(() => PHRASES.filter((p) => (!cat || p.cat === cat) && matches(p, q)), [cat, q]);

  return (
    <Screen tab="browse" title="フレーズ">
      <div class="browse-tools">
        <input
          class="search"
          type="search"
          value={query}
          onInput={(e) => setQuery(e.currentTarget.value)}
          placeholder="スペイン語か日本語で探す"
          aria-label="フレーズを探す"
        />
        <div class="chips" role="radiogroup" aria-label="カテゴリ">
          {[{ id: "", ja: "すべて" }, ...CATEGORIES].map((c) => (
            <label key={c.id} class="chip">
              <input type="radio" name="browse-cat" checked={cat === c.id} onChange={() => setCat(c.id)} />
              <span>{c.ja}</span>
            </label>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <p class="empty">「{q}」に当たるフレーズはありません。</p>
      ) : (
        <ul class="rows">
          {list.map((p) => (
            <PhraseRow
              key={p.id}
              phrase={p}
              state={state}
              open={open === p.id}
              onToggle={() => setOpen(open === p.id ? null : p.id)}
            />
          ))}
        </ul>
      )}
    </Screen>
  );
}

function PhraseRow({ phrase: p, state, open, onToggle }) {
  const rate = state.settings.rate;
  return (
    <li class={open ? "phrase open" : "phrase"}>
      <div class="row phrase-row">
        <span class="row-main">
          <Spanish text={p.es} rate={rate} class="row-es" />
          <span class="row-sub">{p.ja}</span>
        </span>
        <Level level={masteryOf(state.cards, p.id)} />
        <button type="button" class="icon-btn expand" aria-expanded={open} aria-label="解説" onClick={onToggle}>
          <Icon name="chevron" size={18} />
        </button>
      </div>
      {open && (
        <div class="phrase-detail">
          {p.kana && <p class="kana">{p.kana}</p>}
          {p.alt?.length > 0 && (
            <p class="note">
              別の言い方 <span lang="es">{p.alt.join(" / ")}</span>
            </p>
          )}
          <Explain phrase={p} />
        </div>
      )}
    </li>
  );
}

// 文法ノートから使うフレーズの一覧
export function PhraseList({ phrases, state }) {
  return (
    <ul class="rows">
      {phrases.map((p) => (
        <li key={p.id} class="row phrase-row">
          <span class="row-main">
            <Spanish text={p.es} rate={state.settings.rate} class="row-es" />
            <span class="row-sub">{p.ja}</span>
          </span>
          <Level level={masteryOf(state.cards, p.id)} />
        </li>
      ))}
    </ul>
  );
}
