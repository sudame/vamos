import { useEffect, useMemo, useState } from "preact/hooks";
import { CATEGORIES, CATEGORY_IDS } from "../categories.js";
import { PHRASES } from "../data.js";
import { offlineStatus, onOfflineStatus } from "../offline.js";
import { canSpeak, onVoicesChanged, spanishVoices } from "../speech.js";
import { masteryOf } from "../srs.js";
import { dayKey, streak } from "../storage.js";

function useOffline() {
  const [s, setS] = useState(offlineStatus);
  useEffect(() => onOfflineStatus(setS), []);
  return s;
}

function useVoiceCount() {
  const [n, setN] = useState(() => spanishVoices().length);
  useEffect(() => {
    const off = onVoicesChanged(() => setN(spanishVoices().length));
    // 一部のブラウザは voiceschanged を出さないので、少し待ってから数え直す
    const t = setTimeout(() => setN(spanishVoices().length), 1000);
    return () => {
      off();
      clearTimeout(t);
    };
  }, []);
  return n;
}

export function Home({ state, update }) {
  const offline = useOffline();
  const voices = useVoiceCount();
  const now = Date.now();
  const today = state.days[dayKey(now)] ?? { answered: 0, correct: 0 };
  const selected = state.settings.cats ?? CATEGORY_IDS;

  const stats = useMemo(() => {
    const per = new Map(CATEGORIES.map((c) => [c.id, { total: 0, seen: 0, know: 0, say: 0 }]));
    for (const p of PHRASES) {
      const m = masteryOf(state.cards, p.id);
      const s = per.get(p.cat);
      if (!s) continue;
      s.total++;
      if (m >= 1) s.seen++;
      if (m >= 2) s.know++;
      if (m >= 3) s.say++;
    }
    let say = 0;
    let know = 0;
    for (const s of per.values()) {
      say += s.say;
      know += s.know;
    }
    return { per, say, know };
  }, [state.cards]);

  const toggle = (id) => {
    update((s) => {
      const cur = new Set(s.settings.cats ?? CATEGORY_IDS);
      if (cur.has(id)) cur.delete(id);
      else cur.add(id);
      const cats = CATEGORY_IDS.filter((c) => cur.has(c));
      return { ...s, settings: { ...s.settings, cats: cats.length === CATEGORY_IDS.length ? null : cats } };
    });
  };
  const setAll = (on) => update((s) => ({ ...s, settings: { ...s.settings, cats: on ? null : [] } }));

  return (
    <div class="home">
      <header class="hero">
        <div class="hero-tiles" aria-hidden="true" />
        <h1 class="logo">
          ¡Vamos<span class="logo-bang">!</span>
        </h1>
        <p class="tagline">機内でひたすら覚える、旅のスペイン語</p>
      </header>

      <main class="home-main">
        <Status offline={offline} voices={voices} />

        <section class="statrow" aria-label="記録">
          <div class="stat">
            <b>{today.answered}</b>
            <span>今日の問題</span>
          </div>
          <div class="stat">
            <b>{streak(state.days, now)}</b>
            <span>連続日数</span>
          </div>
          <div class="stat">
            <b>{stats.know}</b>
            <span>分かる</span>
          </div>
          <div class="stat">
            <b>{stats.say}</b>
            <span>言える</span>
          </div>
        </section>

        <a class="btn btn-primary btn-start" href="#/drill">
          ¡Empezamos! <small>はじめる</small>
        </a>

        <section class="cats">
          <div class="cats-head">
            <h2>出題するカテゴリ</h2>
            <div class="cats-all">
              <button type="button" class="link" onClick={() => setAll(true)}>
                全部
              </button>
              <button type="button" class="link" onClick={() => setAll(false)}>
                解除
              </button>
            </div>
          </div>
          <ul class="cat-list">
            {CATEGORIES.map((c) => {
              const s = stats.per.get(c.id);
              const on = selected.includes(c.id);
              return (
                <li key={c.id}>
                  <button type="button" class={on ? "cat on" : "cat"} aria-pressed={on} onClick={() => toggle(c.id)}>
                    <span class="cat-icon">{c.icon}</span>
                    <span class="cat-name">
                      {c.ja}
                      <small lang="es">{c.es}</small>
                    </span>
                    <span class="cat-count">
                      {s.say}/{s.total}
                    </span>
                    <span class="bar" aria-hidden="true">
                      <span class="bar-seen" style={{ width: `${pct(s.seen, s.total)}%` }} />
                      <span class="bar-know" style={{ width: `${pct(s.know, s.total)}%` }} />
                      <span class="bar-say" style={{ width: `${pct(s.say, s.total)}%` }} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p class="legend small">
            <span class="lg lg-seen" />
            覚えかけ <span class="lg lg-know" />
            分かる <span class="lg lg-say" />
            言える（数字は言える数）
          </p>
        </section>

        <nav class="menu">
          <a href="#/browse">
            <span>📖</span>フレーズ一覧
          </a>
          <a href="#/grammar">
            <span>🧩</span>文法ノート
          </a>
          <a href="#/settings">
            <span>⚙️</span>設定
          </a>
        </nav>
      </main>
    </div>
  );
}

function pct(n, d) {
  return d ? (n / d) * 100 : 0;
}

function Status({ offline, voices }) {
  const items = [];
  if (offline === "ready") items.push(["ok", "オフラインで使えます"]);
  else if (offline === "checking") items.push(["wait", "オフライン用に保存しています…"]);
  else items.push(["ng", "このブラウザではオフライン用に保存できません"]);

  if (!canSpeak()) items.push(["ng", "このブラウザは読み上げに対応していません"]);
  else if (voices === 0) items.push(["ng", "スペイン語の音声が見つかりません（設定を確認）"]);
  else items.push(["ok", `スペイン語の音声 ${voices} 件`]);

  return (
    <ul class="status">
      {items.map(([k, t]) => (
        <li key={t} class={`st st-${k}`}>
          {t}
        </li>
      ))}
      {(offline !== "ready" || voices === 0) && (
        <li class="st-more">
          <a href="#/settings">機内に入る前の準備 →</a>
        </li>
      )}
    </ul>
  );
}
