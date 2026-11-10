import { CatTag, Explain, MasteryDots, SpeakButton, TopBar } from "../components/ui.jsx";
import { phraseById } from "../data.js";
import { masteryOf } from "../srs.js";

export function PhrasePage({ state, id }) {
  const p = phraseById.get(id);
  if (!p) {
    return (
      <div class="page">
        <TopBar title="見つかりません" backTo="browse" />
      </div>
    );
  }
  return (
    <div class="page">
      <TopBar title="フレーズ" backTo={`browse/${p.cat}`} />
      <main class="page-main">
        <div class="card">
          <div class="qmeta">
            <CatTag cat={p.cat} />
            <MasteryDots level={masteryOf(state.cards, p.id)} />
          </div>
          <p class="es-big" lang="es">
            {p.es}
          </p>
          <div class="face-sub">
            {p.kana && <span class="kana">{p.kana}</span>}
            <SpeakButton text={p.es} rate={state.settings.rate} />
          </div>
          <p class="ja-big">{p.ja}</p>
          {p.alt?.length > 0 && (
            <p class="small">
              別の言い方: <span lang="es">{p.alt.join(" / ")}</span>
            </p>
          )}
          <Explain phrase={p} />
        </div>
      </main>
    </div>
  );
}
