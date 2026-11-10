import { useEffect, useId, useState } from "preact/hooks";
import { TopBar } from "../components/ui.jsx";
import { onVoicesChanged, pickVoice, spanishVoices, speak } from "../speech.js";
import { emptyState, migrate } from "../storage.js";

export function Settings({ state, update }) {
  const s = state.settings;
  const set = (k, v) => update((st) => ({ ...st, settings: { ...st.settings, [k]: v } }));
  const [voices, setVoices] = useState(spanishVoices);
  const [msg, setMsg] = useState("");
  useEffect(() => onVoicesChanged(() => setVoices(spanishVoices())), []);
  const voice = pickVoice();

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `vamos-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const importData = async (file) => {
    try {
      const data = migrate(JSON.parse(await file.text()));
      if (!window.confirm("いまの記録を、読み込んだ記録で置き換えます。よろしいですか？")) return;
      update(() => data);
      setMsg(`${Object.keys(data.cards).length} 枚分の記録を読み込みました`);
    } catch {
      setMsg("読み込めませんでした。書き出したファイルか確かめてください");
    }
  };

  const reset = () => {
    if (!window.confirm("学習の記録をすべて消します。設定は残ります。よろしいですか？")) return;
    update((st) => ({ ...emptyState(), settings: st.settings }));
    setMsg("記録を消しました");
  };

  return (
    <div class="page">
      <TopBar title="設定" />
      <main class="page-main settings">
        <section>
          <h2>出題</h2>
          <Field label="スペイン語を言う問題">
            <Seg
              value={s.produceMode}
              onChange={(v) => set("produceMode", v)}
              options={[
                ["flip", "めくって自己採点"],
                ["type", "打ち込む"],
              ]}
            />
          </Field>
          <Toggle label="聞き取り問題を混ぜる" value={s.listenQuiz} onChange={(v) => set("listenQuiz", v)} />
          <Toggle label="カタカナの読みを出す" value={s.showKana} onChange={(v) => set("showKana", v)} />
        </section>

        <section>
          <h2>音声</h2>
          <Toggle label="自動で読み上げる" value={s.autoSpeak} onChange={(v) => set("autoSpeak", v)} />
          <Field label={`速さ ${s.rate.toFixed(2)}`}>
            <input
              type="range"
              min="0.5"
              max="1.2"
              step="0.05"
              value={s.rate}
              onInput={(e) => set("rate", Number(e.currentTarget.value))}
              aria-label="読み上げの速さ"
            />
          </Field>
          <p class="small">
            使う音声:{" "}
            {voice ? `${voice.name}（${voice.lang}${voice.localService ? "・端末内" : "・ネット経由"}）` : "なし"}
            {voices.length > 1 && ` ほか ${voices.length - 1} 件`}
          </p>
          <button type="button" class="btn" onClick={() => speak("¡Hola! ¿Qué tal? Bienvenido a España.", s.rate)}>
            試しに鳴らす
          </button>
        </section>

        <section>
          <h2>見た目</h2>
          <Seg
            value={s.theme}
            onChange={(v) => set("theme", v)}
            options={[
              ["auto", "端末に合わせる"],
              ["light", "明るい"],
              ["dark", "暗い"],
            ]}
          />
          <p class="small">機内の消灯後は「暗い」が目にやさしいです。</p>
        </section>

        <section class="prep">
          <h2>機内に入る前の準備</h2>
          <ol>
            <li>
              <b>ホーム画面に追加する。</b> iPhone は Safari の共有ボタンから「ホーム画面に追加」、Android は Chrome
              のメニューから「ホーム画面に追加」または「アプリをインストール」。
            </li>
            <li>
              <b>一度ネットにつないだ状態で開く。</b>{" "}
              ホームに「オフラインで使えます」と出れば、全部のデータが端末に保存されています。
            </li>
            <li>
              <b>スペイン語の音声を端末に入れる。</b> 読み上げは端末の音声合成を使います。 iPhone は「設定 →
              アクセシビリティ → 読み上げコンテンツ → 声 → スペイン語（スペイン）」、Android は「設定 → システム → 言語
              → 音声出力（テキスト読み上げ） → Google の音声合成 → 音声データのインストール →
              スペイン語（スペイン）」からダウンロードします。
            </li>
            <li>
              <b>機内モードにしてから試す。</b> 上の「試しに鳴らす」で音が出れば準備完了です。
            </li>
          </ol>
        </section>

        <section>
          <h2>記録</h2>
          <p class="small">学習の記録はこの端末のブラウザにだけ保存されます。消えると困るときは書き出しておけます。</p>
          <div class="row wrap">
            <button type="button" class="btn" onClick={exportData}>
              書き出す
            </button>
            <label class="btn">
              読み込む
              <input
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => {
                  const f = e.currentTarget.files?.[0];
                  if (f) importData(f);
                  e.currentTarget.value = "";
                }}
              />
            </label>
            <button type="button" class="btn btn-danger" onClick={reset}>
              記録を消す
            </button>
          </div>
          {msg && <p class="msg">{msg}</p>}
        </section>
      </main>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div class="field">
      <span class="field-label">{label}</span>
      {children}
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <label class="toggle">
      <span>{label}</span>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.currentTarget.checked)} />
    </label>
  );
}

function Seg({ value, onChange, options }) {
  const name = useId();
  return (
    <div class="seg">
      {options.map(([v, l]) => (
        <label key={v}>
          <input type="radio" name={name} checked={value === v} onChange={() => onChange(v)} />
          <span class="seg-btn">{l}</span>
        </label>
      ))}
    </div>
  );
}
