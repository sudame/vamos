// 端末の音声合成でスペイン語を読み上げる。
// 音声データが端末に入っていればオフラインでも鳴る。

let cachedVoice;

function synth() {
  return typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
}

export function spanishVoices() {
  const s = synth();
  if (!s) return [];
  return s.getVoices().filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith("es"));
}

// スペイン本国（es-ES）を優先し、端末内の音声（localService）を優先する
export function pickVoice() {
  const vs = spanishVoices();
  const score = (v) => {
    const lang = v.lang.toLowerCase().replace("_", "-");
    return (lang === "es-es" ? 4 : 0) + (v.localService ? 2 : 0) + (v.default ? 1 : 0);
  };
  return vs.sort((a, b) => score(b) - score(a))[0] ?? null;
}

export function onVoicesChanged(fn) {
  const s = synth();
  if (!s) return () => {};
  const h = () => {
    cachedVoice = undefined;
    fn();
  };
  s.addEventListener?.("voiceschanged", h);
  return () => s.removeEventListener?.("voiceschanged", h);
}

export function canSpeak() {
  return synth() != null;
}

export function speak(text, rate = 0.9) {
  const s = synth();
  if (!s) return;
  if (cachedVoice === undefined) cachedVoice = pickVoice();
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = cachedVoice?.lang ?? "es-ES";
  if (cachedVoice) u.voice = cachedVoice;
  u.rate = rate;
  s.speak(u);
}

export function stopSpeaking() {
  synth()?.cancel();
}
