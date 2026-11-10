import { categoryById } from "../categories.js";
import { grammarById } from "../data.js";
import { speak } from "../speech.js";

const ICONS = {
  learn:
    "M5 6.5h11a2 2 0 0 1 2 2V18a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18V7.5a1 1 0 0 1 1-1zM8 3.5h11.5A1.5 1.5 0 0 1 21 5v11",
  phrases: "M4 6h16M4 12h16M4 18h10",
  grammar: "M5 4.5h9l5 5V19a.5.5 0 0 1-.5.5h-13A.5.5 0 0 1 5 19zM14 4.5v5h5M8.5 13h7M8.5 16.5h4.5",
  settings:
    "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19 12l2-1.2-1.6-2.8-2.2.6a7 7 0 0 0-1.6-.9L15 5.5h-3.2l-.6 2.2a7 7 0 0 0-1.6.9L7.4 8 5.8 10.8 7.6 12l-1.8 1.2 1.6 2.8 2.2-.6a7 7 0 0 0 1.6.9l.6 2.2H15l.6-2.2a7 7 0 0 0 1.6-.9l2.2.6 1.6-2.8z",
  back: "M15 5l-7 7 7 7",
  close: "M6 6l12 12M18 6L6 18",
  chevron: "M9 5l7 7-7 7",
  check: "M5 12.5l4.5 4.5L19 7.5",
  speaker: "M4 9.5v5h3.5L12 18V6L7.5 9.5zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11",
};

export function Icon({ name, size = 24 }) {
  return (
    <svg
      class="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

const TABS = [
  ["", "learn", "学ぶ"],
  ["browse", "phrases", "フレーズ"],
  ["grammar", "grammar", "文法"],
  ["settings", "settings", "設定"],
];

export function TabBar({ current }) {
  return (
    <nav class="tabbar" aria-label="画面の切り替え">
      {TABS.map(([path, icon, label]) => (
        <a key={label} href={`#/${path}`} class="tab" aria-current={current === path ? "page" : undefined}>
          <Icon name={icon} />
          <span>{label}</span>
        </a>
      ))}
    </nav>
  );
}

// タブの画面の骨組み。title は大きな見出し、back があれば戻るリンクを出す
export function Screen({ tab, title, back, children, wide = false }) {
  return (
    <div class="screen">
      <header class="screen-head">
        {back != null && (
          <a class="icon-btn" href={`#/${back}`} aria-label="戻る">
            <Icon name="back" />
          </a>
        )}
        <h1 class={back != null ? "screen-title small" : "screen-title"}>{title}</h1>
      </header>
      <main class={wide ? "screen-body wide" : "screen-body"}>{children}</main>
      <TabBar current={tab} />
    </div>
  );
}

// 押すと読み上げるスペイン語。文そのものを大きな押し場所にする
export function Spanish({ text, rate, class: cls = "", children }) {
  return (
    <button type="button" class={`es-tap ${cls}`} lang="es" onClick={() => speak(text, rate)} title="押すと読み上げる">
      {children ?? text}
    </button>
  );
}

export function SpeakButton({ text, rate, label = "読み上げる" }) {
  return (
    <button
      type="button"
      class="icon-btn speak"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        speak(text, rate);
      }}
    >
      <Icon name="speaker" size={22} />
    </button>
  );
}

export function catName(cat) {
  return categoryById.get(cat)?.ja ?? "";
}

const LEVEL_LABEL = ["まだ", "覚えかけ", "分かる", "言える"];

export function Level({ level }) {
  return (
    <span class={`level l${level}`} title={LEVEL_LABEL[level]}>
      <span class="level-dot" aria-hidden="true" />
      <span class="sr">{LEVEL_LABEL[level]}</span>
    </span>
  );
}

// フレーズの解説: 単語の分解、メモ、関係する文法ノート
export function Explain({ phrase }) {
  const all = phrase.words ?? [];
  // 1 語だけのフレーズは表にしても同じことの繰り返しになる
  const words = all.length === 1 && all[0].base == null ? [] : all;
  const notes = (phrase.grammar ?? []).map((id) => grammarById.get(id)).filter(Boolean);
  return (
    <div class="explain">
      {words.length > 0 && (
        <table class="words">
          <tbody>
            {words.map((w) => (
              <tr key={w.w}>
                <th lang="es">
                  {w.w}
                  {w.base && <span class="word-base">{w.base}</span>}
                </th>
                <td>{w.ja}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {phrase.note && <p class="explain-note">{phrase.note}</p>}
      {notes.length > 0 && (
        <ul class="links">
          {notes.map((g) => (
            <li key={g.id}>
              <a href={`#/grammar/${g.id}`}>
                <span class="links-text">
                  <span class="links-title">{g.title}</span>
                </span>
                <Icon name="chevron" size={18} />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
