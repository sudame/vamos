import { useEffect, useId, useState } from "preact/hooks";
import { Screen } from "../components/ui.jsx";
import { onVoicesChanged, pickVoice, recordedCount, spanishVoices, speak } from "../speech.js";
import { emptyState, parseBackup } from "../storage.js";

export function Settings({ state, update }) {
  const s = state.settings;
  const set = (k, v) => update((st) => ({ ...st, settings: { ...st.settings, [k]: v } }));
  const [, setVoices] = useState(spanishVoices);
  const [msg, setMsg] = useState("");
  useEffect(() => onVoicesChanged(() => setVoices(spanishVoices())), []);
  const voice = pickVoice();
  const hasRecorded = recordedCount() > 0;

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `vamos-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setMsg("記録を書き出しました。");
  };

  const importData = async (file) => {
    const data = parseBackup(await file.text());
    if (!data) {
      setMsg("読み込めませんでした。このアプリで書き出したファイルを選んでください。");
      return;
    }
    const n = Object.keys(data.cards).length;
    const cur = Object.keys(state.cards).length;
    if (!window.confirm(`いまの記録（${cur} 枚）を、読み込んだ記録（${n} 枚）で置き換えます。`)) return;
    update(() => data);
    setMsg(`${n} 枚分の記録を読み込みました。`);
  };

  const reset = () => {
    if (!window.confirm("学習の記録をすべて消します。設定は残ります。")) return;
    update((st) => ({ ...emptyState(), settings: st.settings }));
    setMsg("記録を消しました。");
  };

  return (
    <Screen tab="settings" title="設定">
      <Group title="出題">
        <Choice
          label="スペイン語を言う問題"
          value={s.produceMode}
          onChange={(v) => set("produceMode", v)}
          options={[
            ["flip", "めくって自己採点"],
            ["type", "打ち込む"],
          ]}
        />
        <Switch label="聞き取りの問題も出す" value={s.listenQuiz} onChange={(v) => set("listenQuiz", v)} />
        <Switch label="カタカナの読みを出す" value={s.showKana} onChange={(v) => set("showKana", v)} />
        <Switch label="正解したら自動で次へ" value={s.autoNext} onChange={(v) => set("autoNext", v)} />
      </Group>

      <Group title="音声">
        <Switch label="自動で読み上げる" value={s.autoSpeak} onChange={(v) => set("autoSpeak", v)} />
        {hasRecorded && (
          <Choice
            label="声"
            value={s.useRecorded ? "recorded" : "device"}
            onChange={(v) => set("useRecorded", v === "recorded")}
            options={[
              ["recorded", "収録した声"],
              ["device", "端末の読み上げ"],
            ]}
          />
        )}
        <li class="row field-row">
          <label class="row-title" for="rate">
            速さ
          </label>
          <input
            id="rate"
            type="range"
            min="0.5"
            max="1.2"
            step="0.05"
            value={s.rate}
            onInput={(e) => set("rate", Number(e.currentTarget.value))}
          />
          <span class="row-count">{s.rate.toFixed(2)}</span>
        </li>
        <li class="row">
          <button type="button" class="text-btn" onClick={() => speak("¿Me pones una caña, por favor?", s.rate)}>
            試しに鳴らす
          </button>
        </li>
      </Group>
      <p class="note">
        {hasRecorded && s.useRecorded
          ? `全 ${recordedCount()} 文を収録した声で読みます。`
          : `端末の読み上げ: ${voice ? `${voice.name}（${voice.lang}）` : "スペイン語の声がありません"}`}
      </p>

      <Group title="画面">
        <Choice
          label="色"
          value={s.theme}
          onChange={(v) => set("theme", v)}
          options={[
            ["auto", "端末に合わせる"],
            ["light", "明るい"],
            ["dark", "暗い"],
          ]}
        />
      </Group>
      <p class="note">消灯した機内では「暗い」が目にやさしいです。</p>

      <section class="prep">
        <h2 class="section-title">機内に入る前に</h2>
        <ol>
          <li>
            ホーム画面に追加します。iPhone は Safari の共有ボタンから、Android は Chrome
            のメニューから「ホーム画面に追加」を選びます。
          </li>
          <li>ネットにつながった状態で一度開きます。ホームに「機内モードでも使えます」と出れば準備できています。</li>
          <li>機内モードにして「試しに鳴らす」で音が出るか確かめます。</li>
        </ol>
      </section>

      <Group title="記録">
        <li class="row">
          <button type="button" class="text-btn" onClick={exportData}>
            ファイルに書き出す
          </button>
        </li>
        <li class="row">
          <label class="text-btn">
            ファイルから読み込む
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
        </li>
        <li class="row">
          <button type="button" class="text-btn danger" onClick={reset}>
            記録を消す
          </button>
        </li>
      </Group>
      <p class="note">{msg || "記録はこの端末のブラウザにだけ保存されます。"}</p>
    </Screen>
  );
}

function Group({ title, children }) {
  return (
    <section>
      <h2 class="section-title">{title}</h2>
      <ul class="rows">{children}</ul>
    </section>
  );
}

function Switch({ label, value, onChange }) {
  const id = useId();
  return (
    <li class="row">
      <label class="row-title" for={id}>
        {label}
      </label>
      <input
        id={id}
        class="switch"
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.currentTarget.checked)}
      />
    </li>
  );
}

function Choice({ label, value, onChange, options }) {
  const name = useId();
  return (
    <li class="row choice-row">
      <span class="row-title">{label}</span>
      <div class="seg">
        {options.map(([v, l]) => (
          <label key={v}>
            <input type="radio" name={name} checked={value === v} onChange={() => onChange(v)} />
            <span>{l}</span>
          </label>
        ))}
      </div>
    </li>
  );
}
