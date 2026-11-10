import { useEffect, useMemo, useState } from "preact/hooks";
import { CATEGORIES, CATEGORY_IDS } from "../categories.ts";
import { Icon, TabBar } from "../components/ui.tsx";
import { eligiblePhrases, PHRASES } from "../data.ts";
import { offlineStatus, onOfflineStatus } from "../offline.ts";
import { canSpeak, onVoicesChanged, recordedCount, spanishVoices } from "../speech.ts";
import { masteryOf, summarize } from "../srs.ts";
import { dayKey, streak } from "../storage.ts";
import type { Mastery, OfflineStatus, ScreenProps } from "../types.ts";

function useOffline() {
  const [s, setS] = useState(offlineStatus);
  useEffect(() => onOfflineStatus(setS), []);
  return s;
}

function useVoiceCount() {
  const [n, setN] = useState(() => spanishVoices().length);
  useEffect(() => {
    const off = onVoicesChanged(() => setN(spanishVoices().length));
    const t = setTimeout(() => setN(spanishVoices().length), 1000);
    return () => {
      off();
      clearTimeout(t);
    };
  }, []);
  return n;
}

const LEVELS: [Mastery, string][] = [
  [3, "言える"],
  [2, "分かる"],
  [1, "覚えかけ"],
  [0, "まだ"],
];

export function Home({ state, update }: ScreenProps) {
  const offline = useOffline();
  const voices = useVoiceCount();
  const now = Date.now();
  const today = state.days[dayKey(now)] ?? { answered: 0, correct: 0 };
  const selected = state.settings.cats ?? CATEGORY_IDS;
  const days = streak(state.days, now);

  const { levels, perCat, counts } = useMemo(() => {
    const levels = new Map(PHRASES.map((p) => [p.id, masteryOf(state.cards, p.id)]));
    const perCat = new Map(CATEGORIES.map((c) => [c.id, { total: 0, say: 0 }]));
    const counts = [0, 0, 0, 0];
    for (const p of PHRASES) {
      // levels は PHRASES から作り、フレーズのカテゴリは test/data.test.ts で既知のものに限っているので、どちらも必ず引ける
      const l = levels.get(p.id) ?? 0;
      counts[l]++;
      const s = perCat.get(p.cat);
      if (!s) continue;
      s.total++;
      if (l >= 3) s.say++;
    }
    return { levels, perCat, counts };
  }, [state.cards]);

  const pool = useMemo(() => eligiblePhrases(state.settings), [state.settings]);
  const { due, fresh } = summarize(state.cards, pool, now);

  const toggle = (id: string) => {
    update((s) => {
      const cur = new Set(s.settings.cats ?? CATEGORY_IDS);
      if (cur.has(id)) cur.delete(id);
      else cur.add(id);
      const cats = CATEGORY_IDS.filter((c) => cur.has(c));
      return { ...s, settings: { ...s.settings, cats: cats.length === CATEGORY_IDS.length ? null : cats } };
    });
  };
  const allOn = selected.length === CATEGORY_IDS.length;
  const setAll = (on: boolean) => update((s) => ({ ...s, settings: { ...s.settings, cats: on ? null : [] } }));

  let lead: string;
  if (pool.length === 0) lead = "下でカテゴリを選ぶと始められます。";
  else if (due > 0) lead = `復習が ${due} 枚たまっています。`;
  else if (fresh > 0) lead = `まだ見ていないフレーズが ${fresh} 件あります。`;
  else lead = "選んだフレーズはひととおり覚えました。先取りで復習できます。";

  return (
    <div class="screen">
      <header class="home-head">
        <p class="wordmark" lang="es">
          ¡Vamos!
        </p>
        <p class="home-meta">
          {days > 0 ? `${days} 日連続` : "今日から"}
          <span class="sep" aria-hidden="true" />
          今日 {today.answered} 問
        </p>
      </header>

      <main class="screen-body">
        <section class="progress" aria-label="覚えた具合">
          <a class="mosaic" href="#/browse" aria-label="フレーズ一覧を開く">
            {CATEGORIES.map((c) => (
              <span key={c.id} class={selected.includes(c.id) ? "mosaic-row" : "mosaic-row off"}>
                {PHRASES.filter((p) => p.cat === c.id).map((p) => (
                  <span key={p.id} class={`cell l${levels.get(p.id)}`} />
                ))}
              </span>
            ))}
          </a>
          <ul class="legend">
            {LEVELS.map(([l, label]) => (
              <li key={l}>
                <span class={`cell l${l}`} aria-hidden="true" />
                {label}
                <b>{counts[l]}</b>
              </li>
            ))}
          </ul>
        </section>

        <section class="start">
          <p class="start-lead">{lead}</p>
          {pool.length === 0 ? (
            <span class="btn primary block disabled" aria-disabled="true">
              始める
            </span>
          ) : (
            <a class="btn primary block" href="#/drill">
              {today.answered > 0 ? "続ける" : "始める"}
            </a>
          )}
          <Readiness offline={offline} voices={voices} useRecorded={state.settings.useRecorded} />
        </section>

        <section>
          <div class="section-head">
            <h2>出題するカテゴリ</h2>
            <button type="button" class="text-btn" onClick={() => setAll(!allOn)}>
              {allOn ? "すべて外す" : "すべて選ぶ"}
            </button>
          </div>
          <ul class="rows">
            {CATEGORIES.map((c) => {
              const s = perCat.get(c.id) ?? { total: 0, say: 0 };
              const on = selected.includes(c.id);
              return (
                <li key={c.id}>
                  <button type="button" class="row check-row" aria-pressed={on} onClick={() => toggle(c.id)}>
                    <span class="row-main">
                      <span class="row-title">{c.ja}</span>
                      <span class="row-sub" lang="es">
                        {c.es}
                      </span>
                    </span>
                    <span class="row-count">
                      {s.say}
                      <small>/{s.total}</small>
                    </span>
                    <span class="checkbox" aria-hidden="true">
                      {on && <Icon name="check" size={16} />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p class="note">数字は「言える」になったフレーズの数です。</p>
        </section>
      </main>
      <TabBar current="" />
    </div>
  );
}

// 機内で困らないかの確認。問題がなければ 1 行で済ませる
function Readiness({ offline, voices, useRecorded }: { offline: OfflineStatus; voices: number; useRecorded: boolean }) {
  const recorded = useRecorded && recordedCount() > 0;
  const problems: string[] = [];
  if (offline === "checking") problems.push("オフライン用にデータを保存しています。");
  else if (offline !== "ready") problems.push("このブラウザではオフライン用に保存できません。");
  if (!recorded && (!canSpeak() || voices === 0)) problems.push("スペイン語の音声がありません。");

  if (problems.length === 0) {
    return (
      <p class="ready ok">
        <Icon name="check" size={16} />
        機内モードでも使えます
      </p>
    );
  }
  return (
    <p class="ready">
      {problems.join(" ")} <a href="#/settings">準備のしかた</a>
    </p>
  );
}
