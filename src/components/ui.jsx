import { categoryById } from "../categories.js";
import { grammarById } from "../data.js";
import { speak } from "../speech.js";

export function TopBar({ title, backTo = "", right }) {
  return (
    <header class="topbar">
      <a class="topbar-back" href={`#/${backTo}`} aria-label="戻る">
        ‹
      </a>
      <h1 class="topbar-title">{title}</h1>
      <div class="topbar-right">{right}</div>
    </header>
  );
}

export function SpeakButton({ text, rate, big = false, label = "読み上げる" }) {
  return (
    <button
      type="button"
      class={big ? "speak speak-big" : "speak"}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        speak(text, rate);
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
        <path
          d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
    </button>
  );
}

export function CatTag({ cat }) {
  const c = categoryById.get(cat);
  if (!c) return null;
  return (
    <span class="cattag">
      {c.icon} {c.ja}
    </span>
  );
}

export function MasteryDots({ level }) {
  return (
    <span class="dots pitem-dots" role="img" aria-label={["未着手", "覚えかけ", "意味は分かる", "言える"][level]}>
      {[1, 2, 3].map((i) => (
        <span key={i} class={i <= level ? `dot on l${level}` : "dot"} />
      ))}
    </span>
  );
}

// フレーズの解説: 単語の分解、メモ、関係する文法ノート
export function Explain({ phrase }) {
  const words = phrase.words ?? [];
  const notes = (phrase.grammar ?? []).map((id) => grammarById.get(id)).filter(Boolean);
  return (
    <div class="explain">
      {words.length > 0 && (
        <section>
          <h3 class="explain-h">単語</h3>
          <dl class="words">
            {words.map((w) => (
              <div class="word" key={w.w}>
                <dt lang="es">
                  {w.w}
                  {w.base && <span class="word-base">← {w.base}</span>}
                </dt>
                <dd>{w.ja}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {phrase.note && (
        <section>
          <h3 class="explain-h">メモ</h3>
          <p class="explain-note">{phrase.note}</p>
        </section>
      )}
      {notes.length > 0 && (
        <section>
          <h3 class="explain-h">文法ノート</h3>
          <ul class="gram-links">
            {notes.map((g) => (
              <li key={g.id}>
                <a href={`#/grammar/${g.id}`}>
                  <span class="gram-link-title">{g.title}</span>
                  <span class="gram-link-sum">{g.summary}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
