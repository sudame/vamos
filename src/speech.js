// スペイン語を鳴らす。
// 同梱した収録音声（scripts/gen-audio.mjs で作った mp3）があればそれを鳴らし、
// なければ端末の音声合成を使う。どちらも端末内で完結するのでオフラインで鳴る。

import audio from "./data/audio.json";

// 設定の「速さ」の既定値。収録音声はこの値のとき等倍で鳴らす
const BASE_RATE = 0.9;

const prefs = { useRecorded: true };
let player = null;
let cachedVoice;

export function setSpeechPrefs(p) {
  Object.assign(prefs, p);
}

export function recordedCount() {
  return Object.keys(audio.files).length;
}

export function recordedVoice() {
  return audio.voice;
}

function recordedUrl(text) {
  const f = audio.files[text];
  return f ? `${import.meta.env.BASE_URL}audio/${f}` : null;
}

function getPlayer() {
  if (!player && typeof Audio !== "undefined") player = new Audio();
  return player;
}

// iOS は利用者の操作の中で一度 play() した audio 要素でないと、あとから自動で鳴らせない。
// 最初のタップで無音を鳴らして、以後の自動読み上げを通す
export function unlockAudioOnFirstTap() {
  if (typeof window === "undefined") return;
  const h = () => {
    const p = getPlayer();
    if (p) {
      p.muted = true;
      p.src = SILENT_WAV;
      p.play()
        .catch(() => {})
        .finally(() => {
          p.muted = false;
        });
    }
    window.removeEventListener("pointerdown", h, true);
  };
  window.addEventListener("pointerdown", h, true);
}

const SILENT_WAV = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

function synth() {
  return typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
}

export function spanishVoices() {
  const s = synth();
  if (!s) return [];
  return s.getVoices().filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith("es"));
}

// スペイン本国（es-ES）、端末内（localService）、高品質（Enhanced / Premium）を優先する
export function pickVoice() {
  const vs = spanishVoices();
  const score = (v) => {
    const lang = v.lang.toLowerCase().replace("_", "-");
    const hq = /premium|enhanced|拡張|プレミアム|neural|natural/i.test(v.name) ? 3 : 0;
    return (lang === "es-es" ? 8 : 0) + (v.localService ? 4 : 0) + hq + (v.default ? 1 : 0);
  };
  return [...vs].sort((a, b) => score(b) - score(a))[0] ?? null;
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
  return (prefs.useRecorded && recordedCount() > 0) || synth() != null;
}

export function willUseRecorded(text) {
  return prefs.useRecorded && recordedUrl(text) != null;
}

function speakSynth(text, rate) {
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

export function speak(text, rate = BASE_RATE) {
  stopSpeaking();
  const url = prefs.useRecorded ? recordedUrl(text) : null;
  const p = url ? getPlayer() : null;
  if (!p) {
    speakSynth(text, rate);
    return;
  }
  p.src = url;
  p.playbackRate = Math.min(2, Math.max(0.5, rate / BASE_RATE));
  p.preservesPitch = true;
  p.play().catch(() => speakSynth(text, rate));
}

export function stopSpeaking() {
  synth()?.cancel();
  if (player && !player.paused) player.pause();
}
