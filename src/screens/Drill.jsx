import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { check, diffMarks } from "../answer.js";
import { catName, Explain, Icon, Spanish } from "../components/ui.jsx";
import { eligiblePhrases, PHRASES, phraseById } from "../data.js";
import { makeQuestion } from "../quiz.js";
import { canSpeak, speak, stopSpeaking } from "../speech.js";
import { GRADE, MINUTE, newCard, pickNext, schedule } from "../srs.js";
import { dayKey, recordAnswer } from "../storage.js";

// 1 ラウンドの問題数。区切りがあると、機内でも休みどころが分かる
const ROUND = 20;
// 正解したあと次へ進むまでの時間
const AUTO_NEXT_MS = 1100;
const ACCENT_KEYS = ["á", "é", "í", "ó", "ú", "ñ", "ü", "¿", "¡"];
const KIND_LABEL = { new: "新しいフレーズ", due: "復習", ahead: "先取り" };

function formatWait(ms) {
  if (ms < 60 * MINUTE) return `${Math.max(1, Math.round(ms / MINUTE))}分後`;
  if (ms < 24 * 60 * MINUTE) return `${Math.round(ms / (60 * MINUTE))}時間後`;
  const d = ms / (24 * 60 * MINUTE);
  if (d < 60) return `${Math.round(d)}日後`;
  return `${Math.round(d / 30)}か月後`;
}

export function Drill({ state, update }) {
  const { settings } = state;
  const phrases = useMemo(() => eligiblePhrases(settings), [settings]);
  const [q, setQ] = useState(null);
  const [answer, setAnswer] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [round, setRound] = useState({ n: 0, correct: 0, missed: [] });
  const [finished, setFinished] = useState(false);
  const [autoNext, setAutoNext] = useState(false);
  const recent = useRef([]);
  const cardsRef = useRef(state.cards);
  cardsRef.current = state.cards;
  const before = useRef(null); // 採点前のカード。「実は合ってた」で使う
  const answered = useRef(0); // このラウンドで答えた数。採点の直後に次へ進むときも正しく数えるため ref で持つ

  const nextQuestion = () => {
    stopSpeaking();
    setAutoNext(false);
    const pick = pickNext(cardsRef.current, phrases, Date.now(), { avoid: recent.current });
    if (!pick) {
      setQ(null);
      return;
    }
    recent.current = [pick.id, ...recent.current].slice(0, 2);
    before.current = cardsRef.current[pick.id] ?? null;
    setQ(makeQuestion(pick, phraseById, PHRASES, settings, { canSpeak: canSpeak() }));
    setAnswer(null);
    setRevealed(false);
  };

  const advance = () => {
    if (answered.current >= ROUND) {
      stopSpeaking();
      setFinished(true);
      return;
    }
    nextQuestion();
  };

  const newRound = () => {
    answered.current = 0;
    setRound({ n: 0, correct: 0, missed: [] });
    setFinished(false);
    nextQuestion();
  };

  useEffect(() => {
    nextQuestion();
    return stopSpeaking;
  }, []);

  // 出題したときに読み上げる
  useEffect(() => {
    if (!q) return;
    if (q.type === "listen" || (settings.autoSpeak && (q.type === "intro" || q.type === "choice"))) {
      speak(q.phrase.es, settings.rate);
    }
  }, [q]);

  // 正解したら少し待って次へ
  useEffect(() => {
    if (!autoNext) return;
    const t = setTimeout(advance, AUTO_NEXT_MS);
    return () => clearTimeout(t);
  }, [autoNext]);

  const grade = (g, correct) => {
    const now = Date.now();
    answered.current += 1;
    update((s) => ({
      ...s,
      cards: { ...s.cards, [q.cardId]: schedule(s.cards[q.cardId] ?? newCard(), g, now) },
      days: recordAnswer(s.days, now, correct),
    }));
    setRound((r) => ({
      n: r.n + 1,
      correct: r.correct + (correct ? 1 : 0),
      missed: correct || r.missed.includes(q.phrase.id) ? r.missed : [...r.missed, q.phrase.id],
    }));
  };

  const finishAnswer = (a) => {
    setAnswer(a);
    if (a.correct && settings.autoNext) setAutoNext(true);
    if (!a.correct) navigator.vibrate?.(30);
  };

  const choose = (opt) => {
    if (answer) return;
    const correct = opt.id === q.phrase.id;
    grade(correct ? GRADE.good : GRADE.again, correct);
    finishAnswer({ correct, chosen: opt.id });
    if (settings.autoSpeak || q.type === "listen") speak(q.phrase.es, settings.rate);
  };

  const submitTyped = (typed) => {
    if (answer) return;
    const r = check(typed, [q.phrase.es, ...(q.phrase.alt ?? [])]);
    const correct = r.result === "exact" || r.result === "accent";
    grade(correct ? GRADE.good : GRADE.again, correct);
    finishAnswer({ correct, typed, result: r.result, matched: r.matched });
    if (settings.autoSpeak) speak(q.phrase.es, settings.rate);
  };

  // 不正解を取り消して正解にする
  const override = () => {
    const now = Date.now();
    update((s) => {
      const k = dayKey(now);
      const d = s.days[k];
      return {
        ...s,
        cards: { ...s.cards, [q.cardId]: schedule(before.current ?? newCard(), GRADE.good, now) },
        days: d ? { ...s.days, [k]: { ...d, correct: d.correct + 1 } } : s.days,
      };
    });
    setRound((r) => ({ ...r, correct: r.correct + 1, missed: r.missed.filter((id) => id !== q.phrase.id) }));
    setAnswer((a) => ({ ...a, correct: true, result: "override" }));
  };

  const learnIntro = () => {
    grade(GRADE.good, true);
    advance();
  };

  const flipGrade = (g) => {
    grade(g, g !== GRADE.again);
    advance();
  };

  // キーボード操作（PC で使うとき）
  useEffect(() => {
    const h = (e) => {
      if (!q || finished || e.target instanceof HTMLInputElement) return;
      if (e.target instanceof HTMLButtonElement && (e.key === "Enter" || e.key === " ")) return;
      const n = Number(e.key);
      if ((q.type === "choice" || q.type === "listen") && !answer && n >= 1 && n <= 4) {
        if (q.options[n - 1]) choose(q.options[n - 1]);
      } else if (q.type === "flip" && revealed && n >= 1 && n <= 4) {
        flipGrade(n - 1);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (q.type === "intro") learnIntro();
        else if (q.type === "flip" && !revealed) setRevealed(true);
        else if (answer) advance();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  if (phrases.length === 0) {
    return (
      <Frame round={round}>
        <div class="drill-body center">
          <p class="lead">出題するカテゴリが選ばれていません。</p>
        </div>
        <div class="dock">
          <a class="btn primary block" href="#/">
            カテゴリを選ぶ
          </a>
        </div>
      </Frame>
    );
  }

  if (finished) return <Summary round={round} settings={settings} onAgain={newRound} />;
  if (!q) return <Frame round={round} />;

  const p = q.phrase;
  const rate = settings.rate;
  const showKana = settings.showKana;

  return (
    <Frame round={round}>
      <div class="drill-body" key={q.cardId}>
        <p class="kind">
          {KIND_LABEL[q.kind]}
          <span class="kind-cat">{catName(p.cat)}</span>
        </p>

        {q.type === "intro" && (
          <>
            <Prompt phrase={p} rate={rate} kana={showKana} />
            <p class="ja-answer">{p.ja}</p>
            <Explain phrase={p} />
          </>
        )}

        {q.type === "choice" && (
          <>
            <Prompt phrase={p} rate={rate} kana={showKana && !!answer} />
            {answer && <Result answer={answer} phrase={p} />}
          </>
        )}

        {q.type === "listen" &&
          (answer ? (
            <>
              <Prompt phrase={p} rate={rate} kana={showKana} />
              <Result answer={answer} phrase={p} />
            </>
          ) : (
            <div class="listen">
              <button type="button" class="listen-btn" onClick={() => speak(p.es, rate)} aria-label="もう一度聞く">
                <Icon name="speaker" size={40} />
              </button>
              <button type="button" class="text-btn" onClick={() => speak(p.es, rate * 0.7)}>
                ゆっくり聞く
              </button>
            </div>
          ))}

        {(q.type === "flip" || q.type === "type") && (
          <>
            <p class="ja-prompt">{p.ja}</p>
            {(revealed || answer) && (
              <div class="reveal">
                {answer?.typed != null && <TypedDiff answer={answer} phrase={p} />}
                <Prompt phrase={p} rate={rate} kana={showKana} autoplay={q.type === "flip" && settings.autoSpeak} />
              </div>
            )}
            {q.type === "type" && !answer && <TypeInput key={q.cardId} onSubmit={submitTyped} />}
          </>
        )}

        {q.type !== "intro" && (answer || revealed) && (
          <ExplainToggle
            key={q.cardId}
            phrase={p}
            open={answer ? !answer.correct : false}
            onOpen={() => setAutoNext(false)}
          />
        )}
      </div>

      <div class="dock">
        {q.type === "intro" && (
          <button type="button" class="btn primary block" onClick={learnIntro}>
            覚えた
          </button>
        )}

        {(q.type === "choice" || q.type === "listen") &&
          (!answer ? (
            <ol class="options">
              {q.options.map((o) => (
                <li key={o.id}>
                  <button type="button" class="option" onClick={() => choose(o)}>
                    {o.ja}
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <NextButton auto={autoNext} onClick={advance} />
          ))}

        {q.type === "flip" &&
          (!revealed ? (
            <button type="button" class="btn primary block" onClick={() => setRevealed(true)}>
              答えを見る
            </button>
          ) : (
            <Grades card={state.cards[q.cardId] ?? newCard()} onGrade={flipGrade} />
          ))}

        {q.type === "type" &&
          (!answer ? (
            <div class="pair">
              <button type="button" class="btn" onClick={() => submitTyped("")}>
                分からない
              </button>
              <button type="submit" form="typein" class="btn primary">
                答え合わせ
              </button>
            </div>
          ) : (
            <div class={answer.correct ? "pair single" : "pair"}>
              {!answer.correct && (
                <button type="button" class="btn" onClick={override}>
                  実は合ってた
                </button>
              )}
              <NextButton auto={autoNext} onClick={advance} />
            </div>
          ))}
      </div>
    </Frame>
  );
}

function Frame({ round, children }) {
  return (
    <div class="drill">
      <header class="drill-head">
        <a class="icon-btn" href="#/" aria-label="やめる">
          <Icon name="close" />
        </a>
        <div
          class="meter"
          role="progressbar"
          aria-label="このラウンドの進み具合"
          aria-valuemin={0}
          aria-valuemax={ROUND}
          aria-valuenow={round.n}
        >
          <span style={{ width: `${(Math.min(round.n, ROUND) / ROUND) * 100}%` }} />
        </div>
        <span class="meter-count">
          {Math.min(round.n, ROUND)}/{ROUND}
        </span>
      </header>
      {children}
    </div>
  );
}

function Prompt({ phrase, rate, kana, autoplay = false }) {
  useEffect(() => {
    if (autoplay) speak(phrase.es, rate);
  }, []);
  return (
    <div class="prompt">
      <Spanish text={phrase.es} rate={rate} class="es-prompt" />
      {kana && phrase.kana && <p class="kana">{phrase.kana}</p>}
    </div>
  );
}

function Result({ answer, phrase }) {
  const chosen = answer.chosen && answer.chosen !== phrase.id ? phraseById.get(answer.chosen) : null;
  return (
    <div class={answer.correct ? "result ok" : "result ng"}>
      <p class="result-head">{answer.correct ? "正解" : "不正解"}</p>
      <p class="ja-answer">{phrase.ja}</p>
      {chosen && <p class="result-chosen">選んだ答え: {chosen.ja}</p>}
    </div>
  );
}

function TypedDiff({ answer, phrase }) {
  const title = {
    exact: "正解",
    accent: "正解。アクセント記号に気をつけて",
    close: "惜しい。1〜2 文字ちがいます",
    wrong: answer.typed === "" ? "答え" : "不正解",
    override: "正解にしました",
  }[answer.result];
  const target = answer.matched ?? phrase.es;
  return (
    <div class={answer.correct ? "result ok" : "result ng"}>
      <p class="result-head">{title}</p>
      {answer.typed !== "" && answer.result !== "exact" && (
        <p class="typed" lang="es">
          {diffMarks(answer.typed, target).map((m, i) => (
            <span key={i} class={m.ok ? undefined : "miss"}>
              {m.ch}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

function ExplainToggle({ phrase, open: initial, onOpen }) {
  const [open, setOpen] = useState(initial);
  return (
    <section class="explain-box">
      <button
        type="button"
        class="explain-toggle"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          onOpen();
        }}
      >
        解説
        <Icon name="chevron" size={18} />
      </button>
      {open && <Explain phrase={phrase} />}
    </section>
  );
}

function NextButton({ auto, onClick }) {
  return (
    <button type="button" class={auto ? "btn primary block next auto" : "btn primary block next"} onClick={onClick}>
      次へ
      {auto && <span class="next-timer" style={{ animationDuration: `${AUTO_NEXT_MS}ms` }} aria-hidden="true" />}
    </button>
  );
}

function Grades({ card, onGrade }) {
  const now = Date.now();
  const labels = [
    ["もう一度", GRADE.again],
    ["あやしい", GRADE.hard],
    ["言えた", GRADE.good],
    ["楽勝", GRADE.easy],
  ];
  return (
    <div class="grades">
      {labels.map(([label, g]) => (
        <button type="button" key={g} class={`grade g${g}`} onClick={() => onGrade(g)}>
          <span>{label}</span>
          <small>{formatWait(schedule(card, g, now).due - now)}</small>
        </button>
      ))}
    </div>
  );
}

function TypeInput({ onSubmit }) {
  const [v, setV] = useState("");
  const ref = useRef(null);
  useEffect(() => ref.current?.focus(), []);
  const insert = (ch) => {
    const el = ref.current;
    const s = el?.selectionStart ?? v.length;
    const e = el?.selectionEnd ?? v.length;
    setV(v.slice(0, s) + ch + v.slice(e));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(s + ch.length, s + ch.length);
    });
  };
  return (
    <form
      id="typein"
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
        placeholder="スペイン語で"
        aria-label="スペイン語の答え"
      />
      <div class="accents">
        {ACCENT_KEYS.map((ch) => (
          <button type="button" key={ch} onMouseDown={(e) => e.preventDefault()} onClick={() => insert(ch)}>
            {ch}
          </button>
        ))}
      </div>
      <p class="note">大文字と記号は気にしなくて大丈夫です。</p>
    </form>
  );
}

function Summary({ round, settings, onAgain }) {
  const missed = round.missed.map((id) => phraseById.get(id)).filter(Boolean);
  const pct = round.n ? Math.round((round.correct / round.n) * 100) : 0;
  return (
    <div class="drill">
      <header class="drill-head">
        <a class="icon-btn" href="#/" aria-label="やめる">
          <Icon name="close" />
        </a>
      </header>
      <div class="drill-body">
        <p class="summary-score">
          <b>{round.correct}</b>
          <span>/{round.n} 問正解</span>
        </p>
        <p class="lead">
          {pct >= 90 ? "よく覚えています。" : pct >= 60 ? "その調子です。" : "間違えたフレーズは、すぐまた出てきます。"}
        </p>
        {missed.length > 0 && (
          <section>
            <h2 class="section-title">間違えたフレーズ</h2>
            <ul class="rows">
              {missed.map((p) => (
                <li key={p.id} class="row phrase-row static">
                  <span class="row-main">
                    <Spanish text={p.es} rate={settings.rate} class="row-es" />
                    <span class="row-sub">{p.ja}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <div class="dock">
        <div class="pair">
          <a class="btn" href="#/">
            ホームへ
          </a>
          <button type="button" class="btn primary" onClick={onAgain}>
            もう {ROUND} 問
          </button>
        </div>
      </div>
    </div>
  );
}
