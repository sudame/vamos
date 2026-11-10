import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { check, diffMarks } from "../answer.js";
import { CatTag, Explain, SpeakButton } from "../components/ui.jsx";
import { PHRASES, phraseById } from "../data.js";
import { makeQuestion } from "../quiz.js";
import { canSpeak, speak, stopSpeaking } from "../speech.js";
import { GRADE, isLearning, MINUTE, newCard, pickNext, schedule } from "../srs.js";
import { dayKey, recordAnswer } from "../storage.js";

const ACCENT_KEYS = ["á", "é", "í", "ó", "ú", "ñ", "ü", "¿", "¡"];

export function eligiblePhrases(settings) {
  const cats = settings.cats;
  return cats == null ? PHRASES : PHRASES.filter((p) => cats.includes(p.cat));
}

function formatWait(ms) {
  if (ms < 60 * MINUTE) return `${Math.max(1, Math.round(ms / MINUTE))}分`;
  if (ms < 24 * 60 * MINUTE) return `${Math.round(ms / (60 * MINUTE))}時間`;
  const d = ms / (24 * 60 * MINUTE);
  if (d < 60) return `${Math.round(d)}日`;
  return `${Math.round(d / 30)}か月`;
}

const KIND_LABEL = { new: "新しい", due: "復習", ahead: "先取り" };

export function Drill({ state, update }) {
  const { settings } = state;
  const phrases = useMemo(() => eligiblePhrases(settings), [settings]);
  const [q, setQ] = useState(null);
  const [answer, setAnswer] = useState(null); // { correct, chosen?, typed?, result? }
  const [revealed, setRevealed] = useState(false);
  const [session, setSession] = useState({ answered: 0, correct: 0 });
  const recent = useRef([]);
  const cardsRef = useRef(state.cards);
  cardsRef.current = state.cards;

  const nextQuestion = () => {
    stopSpeaking();
    const now = Date.now();
    const pick = pickNext(cardsRef.current, phrases, now, { avoid: recent.current });
    if (!pick) {
      setQ(null);
      return;
    }
    recent.current = [pick.id, ...recent.current].slice(0, 2);
    setQ(makeQuestion(pick, phraseById, PHRASES, settings, { canSpeak: canSpeak() }));
    setAnswer(null);
    setRevealed(false);
  };

  useEffect(() => {
    nextQuestion();
    return stopSpeaking;
  }, []);

  // 出題時の自動読み上げ
  useEffect(() => {
    if (!q) return;
    if (q.type === "listen" || (settings.autoSpeak && (q.type === "intro" || q.type === "choice"))) {
      speak(q.phrase.es, settings.rate);
    }
  }, [q, settings.autoSpeak, settings.rate]);

  const grade = (g, correct) => {
    const now = Date.now();
    update((s) => ({
      ...s,
      cards: { ...s.cards, [q.cardId]: schedule(s.cards[q.cardId] ?? newCard(), g, now) },
      days: recordAnswer(s.days, now, correct),
    }));
    setSession((x) => ({ answered: x.answered + 1, correct: x.correct + (correct ? 1 : 0) }));
  };

  const choose = (opt) => {
    if (answer) return;
    const correct = opt.id === q.phrase.id;
    grade(correct ? GRADE.good : GRADE.again, correct);
    setAnswer({ correct, chosen: opt.id });
    if (settings.autoSpeak || q.type === "listen") speak(q.phrase.es, settings.rate);
  };

  const submitTyped = (typed) => {
    if (answer) return;
    const answers = [q.phrase.es, ...(q.phrase.alt ?? [])];
    const r = check(typed, answers);
    const correct = r.result === "exact" || r.result === "accent";
    const g = r.result === "close" ? GRADE.hard : correct ? GRADE.good : GRADE.again;
    grade(g, r.result !== "wrong");
    setAnswer({ correct: r.result !== "wrong", typed, result: r.result, matched: r.matched });
    if (settings.autoSpeak) speak(q.phrase.es, settings.rate);
  };

  // override のために、採点前のカードを覚えておく
  const prevCard = useRef(null);
  useEffect(() => {
    prevCard.current = q ? (state.cards[q.cardId] ?? null) : null;
  }, [q]);

  // 「実は合ってた」: 不正解を取り消して正解にする
  const override = () => {
    update((s) => {
      const k = dayKey(Date.now());
      const d = s.days[k];
      return {
        ...s,
        cards: { ...s.cards, [q.cardId]: schedule(prevCard.current ?? newCard(), GRADE.good, Date.now()) },
        days: d ? { ...s.days, [k]: { ...d, correct: d.correct + 1 } } : s.days,
      };
    });
    setSession((x) => ({ ...x, correct: x.correct + 1 }));
    setAnswer((a) => ({ ...a, correct: true, result: "override" }));
  };

  const learningCount = useMemo(
    () =>
      phrases.reduce(
        (n, p) =>
          n + (isLearning(state.cards[`${p.id}:rec`]) ? 1 : 0) + (isLearning(state.cards[`${p.id}:pro`]) ? 1 : 0),
        0,
      ),
    [phrases, state.cards],
  );

  // キーボード操作（PC で使うとき）
  useEffect(() => {
    const h = (e) => {
      if (!q || e.target instanceof HTMLInputElement) return;
      // ボタンにフォーカスがあるときの Enter はボタン自身のクリックに任せる
      if (e.target instanceof HTMLButtonElement && (e.key === "Enter" || e.key === " ")) return;
      if ((q.type === "choice" || q.type === "listen") && !answer && /^[1-4]$/.test(e.key)) {
        const opt = q.options[Number(e.key) - 1];
        if (opt) choose(opt);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (q.type === "intro") {
          grade(GRADE.good, true);
          nextQuestion();
        } else if (q.type === "flip" && !revealed) setRevealed(true);
        else if (answer) nextQuestion();
      } else if (q.type === "flip" && revealed && /^[1-4]$/.test(e.key)) {
        flipGrade(Number(e.key) - 1);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const flipGrade = (g) => {
    grade(g, g !== GRADE.again);
    nextQuestion();
  };

  if (phrases.length === 0) {
    return (
      <Shell session={session} learning={0}>
        <p class="empty">出題するカテゴリが選ばれていません。</p>
        <a class="btn" href="#/">
          ホームに戻る
        </a>
      </Shell>
    );
  }
  if (!q) return <Shell session={session} learning={learningCount} />;

  const p = q.phrase;
  return (
    <Shell session={session} learning={learningCount}>
      <div class="qmeta">
        <span class={`kind kind-${q.kind}`}>{KIND_LABEL[q.kind]}</span>
        <CatTag cat={p.cat} />
      </div>

      {q.type === "intro" && (
        <div class="card card-intro">
          <p class="hint">新しいフレーズ。声に出して読んでみよう</p>
          <PhraseFace phrase={p} settings={settings} />
          <p class="ja-big">{p.ja}</p>
          <Explain phrase={p} />
          <button
            type="button"
            class="btn btn-primary btn-wide"
            onClick={() => {
              grade(GRADE.good, true);
              nextQuestion();
            }}
          >
            覚えた、次へ
          </button>
        </div>
      )}

      {(q.type === "choice" || q.type === "listen") && (
        <div class="card">
          {q.type === "listen" && !answer ? (
            <div class="listen">
              <p class="hint">聞き取って、意味を選ぼう</p>
              <SpeakButton text={p.es} rate={settings.rate} big label="もう一度聞く" />
              <button type="button" class="link" onClick={() => speak(p.es, settings.rate * 0.7)}>
                ゆっくり
              </button>
            </div>
          ) : (
            <>
              <p class="hint">意味はどれ？</p>
              <PhraseFace phrase={p} settings={settings} hideKana={!answer} />
            </>
          )}
          <ol class="options">
            {q.options.map((o, i) => {
              let cls = "option";
              if (answer) {
                if (o.id === p.id) cls += " option-right";
                else if (o.id === answer.chosen) cls += " option-wrong";
                else cls += " option-dim";
              }
              return (
                <li key={o.id}>
                  <button type="button" class={cls} onClick={() => choose(o)} disabled={!!answer}>
                    <span class="option-num">{i + 1}</span>
                    {o.ja}
                  </button>
                </li>
              );
            })}
          </ol>
          {answer && (
            <Feedback
              answer={answer}
              phrase={p}
              settings={settings}
              onNext={nextQuestion}
              showFace={q.type === "listen"}
            />
          )}
        </div>
      )}

      {q.type === "flip" && (
        <div class="card">
          <p class="hint">スペイン語で言ってみよう</p>
          <p class="ja-big">{p.ja}</p>
          {!revealed ? (
            <button type="button" class="btn btn-primary btn-wide" onClick={() => setRevealed(true)}>
              答えを見る
            </button>
          ) : (
            <Revealed phrase={p} settings={settings}>
              <GradeButtons card={state.cards[q.cardId] ?? newCard()} onGrade={flipGrade} />
            </Revealed>
          )}
        </div>
      )}

      {q.type === "type" && (
        <div class="card">
          <p class="hint">スペイン語で書いてみよう</p>
          <p class="ja-big">{p.ja}</p>
          {!answer ? (
            <TypeInput key={q.cardId} onSubmit={submitTyped} onGiveUp={() => submitTyped("")} />
          ) : (
            <Feedback answer={answer} phrase={p} settings={settings} onNext={nextQuestion} onOverride={override} />
          )}
        </div>
      )}
    </Shell>
  );
}

function Shell({ session, learning, children }) {
  return (
    <div class="drill">
      <header class="drill-bar">
        <a class="drill-close" href="#/" aria-label="終わる">
          ×
        </a>
        <div class="drill-stats">
          <span>
            <b>{session.answered}</b> 問
          </span>
          <span>
            正答 <b>{session.answered ? Math.round((session.correct / session.answered) * 100) : 0}</b>%
          </span>
          <span>
            覚えかけ <b>{learning}</b>
          </span>
        </div>
      </header>
      <main class="drill-main">{children}</main>
    </div>
  );
}

function PhraseFace({ phrase, settings, hideKana = false }) {
  return (
    <div class="face">
      <p class="es-big" lang="es">
        {phrase.es}
      </p>
      <div class="face-sub">
        {settings.showKana && !hideKana && phrase.kana && <span class="kana">{phrase.kana}</span>}
        <SpeakButton text={phrase.es} rate={settings.rate} />
      </div>
    </div>
  );
}

function Revealed({ phrase, settings, children }) {
  useEffect(() => {
    if (settings.autoSpeak) speak(phrase.es, settings.rate);
  }, []);
  return (
    <div class="revealed">
      <PhraseFace phrase={phrase} settings={settings} />
      {children}
      <details class="explain-wrap">
        <summary>解説を見る</summary>
        <Explain phrase={phrase} />
      </details>
    </div>
  );
}

function GradeButtons({ card, onGrade }) {
  const now = Date.now();
  const labels = [
    ["もう一度", GRADE.again],
    ["難しい", GRADE.hard],
    ["言えた", GRADE.good],
    ["簡単", GRADE.easy],
  ];
  return (
    <div class="grades">
      {labels.map(([label, g]) => (
        <button type="button" key={g} class={`grade grade-${g}`} onClick={() => onGrade(g)}>
          <span class="grade-label">{label}</span>
          <span class="grade-wait">{formatWait(schedule(card, g, now).due - now)}</span>
        </button>
      ))}
    </div>
  );
}

function TypeInput({ onSubmit, onGiveUp }) {
  const [v, setV] = useState("");
  const ref = useRef(null);
  useEffect(() => ref.current?.focus(), []);
  const insert = (ch) => {
    const el = ref.current;
    const s = el?.selectionStart ?? v.length;
    const e = el?.selectionEnd ?? v.length;
    const nv = v.slice(0, s) + ch + v.slice(e);
    setV(nv);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(s + ch.length, s + ch.length);
    });
  };
  return (
    <form
      class="typein"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(v);
      }}
    >
      <input
        ref={ref}
        lang="es"
        value={v}
        onInput={(e) => setV(e.currentTarget.value)}
        autocomplete="off"
        autocapitalize="off"
        autocorrect="off"
        spellcheck={false}
        placeholder="ここに入力"
        aria-label="スペイン語の答え"
      />
      <div class="accents">
        {ACCENT_KEYS.map((ch) => (
          <button type="button" key={ch} onMouseDown={(e) => e.preventDefault()} onClick={() => insert(ch)}>
            {ch}
          </button>
        ))}
      </div>
      <div class="row">
        <button type="button" class="btn" onClick={onGiveUp}>
          分からない
        </button>
        <button type="submit" class="btn btn-primary">
          答え合わせ
        </button>
      </div>
      <p class="small">大文字・記号は気にしなくて大丈夫。アクセント記号の抜けは正解扱いで知らせます。</p>
    </form>
  );
}

function Feedback({ answer, phrase, settings, onNext, onOverride, showFace = true }) {
  let title;
  if (answer.result === "accent") title = "正解（アクセント記号に注意）";
  else if (answer.result === "close") title = "おしい！ほぼ正解";
  else if (answer.result === "override") title = "正解にしました";
  else title = answer.correct ? "正解！" : "ざんねん";
  const target = answer.matched ?? phrase.es;
  return (
    <div class={answer.correct ? "feedback ok" : "feedback ng"}>
      <p class="feedback-title">{title}</p>
      {answer.typed != null && answer.typed !== "" && answer.result !== "exact" && (
        <div class="typed-diff">
          <p class="small">あなたの答え: {answer.typed}</p>
          <p class="diff" lang="es">
            {diffMarks(answer.typed, target).map((m, i) => (
              <span key={i} class={m.ok ? "" : "diff-miss"}>
                {m.ch}
              </span>
            ))}
          </p>
        </div>
      )}
      {showFace && (
        <>
          <PhraseFace phrase={phrase} settings={settings} />
          <p class="ja-mid">{phrase.ja}</p>
        </>
      )}
      <details class="explain-wrap" open={!answer.correct}>
        <summary>解説を見る</summary>
        <Explain phrase={phrase} />
      </details>
      <div class="row">
        {onOverride && !answer.correct && (
          <button type="button" class="btn" onClick={onOverride}>
            実は合ってた
          </button>
        )}
        <button type="button" class="btn btn-primary" onClick={onNext}>
          次へ
        </button>
      </div>
    </div>
  );
}
