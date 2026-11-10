// スペイン語を鳴らす。
// 同梱した収録音声（scripts/gen-audio.ts で作った mp3）があればそれを鳴らし、
// なければ端末の音声合成を使う。どちらも端末内で完結するのでオフラインで鳴る。

import audioJson from "./data/audio.json";
import type { AudioManifest } from "./types.ts";

const audio: AudioManifest = audioJson;

// 設定の「速さ」の既定値。収録音声はこの値のとき等倍で鳴らす
const BASE_RATE = 0.9;

interface SpeechPrefs {
  useRecorded: boolean;
}

const prefs: SpeechPrefs = { useRecorded: true };
let player: HTMLAudioElement | null = null;
// undefined はまだ選んでいない、null はスペイン語の声が無い
let cachedVoice: SpeechSynthesisVoice | null | undefined;

export function setSpeechPrefs(p: Partial<SpeechPrefs>): void {
  Object.assign(prefs, p);
}

export function recordedCount(): number {
  return Object.keys(audio.files).length;
}

export function recordedVoice(): string {
  return audio.voice;
}

function recordedUrl(text: string): string | null {
  const f = audio.files[text];
  return f ? `${import.meta.env.BASE_URL}audio/${f}` : null;
}

function getPlayer(): HTMLAudioElement | null {
  if (!player && typeof Audio !== "undefined") player = new Audio();
  return player;
}

// iOS は利用者の操作の中で一度 play() した audio 要素でないと、あとから自動で鳴らせない。
// 最初のタップで無音を鳴らして、以後の自動読み上げを通す
export function unlockAudioOnFirstTap(): void {
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

function synth(): SpeechSynthesis | null {
  return typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
}

export function spanishVoices(): SpeechSynthesisVoice[] {
  const s = synth();
  if (!s) return [];
  return s.getVoices().filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith("es"));
}

// スペイン本国（es-ES）、端末内（localService）、高品質（Enhanced / Premium）を優先する
export function pickVoice(): SpeechSynthesisVoice | null {
  const vs = spanishVoices();
  const score = (v: SpeechSynthesisVoice) => {
    const lang = v.lang.toLowerCase().replace("_", "-");
    const hq = /premium|enhanced|拡張|プレミアム|neural|natural/i.test(v.name) ? 3 : 0;
    return (lang === "es-es" ? 8 : 0) + (v.localService ? 4 : 0) + hq + (v.default ? 1 : 0);
  };
  return [...vs].sort((a, b) => score(b) - score(a))[0] ?? null;
}

export function onVoicesChanged(fn: () => void): () => void {
  const s = synth();
  if (!s) return () => {};
  const h = () => {
    cachedVoice = undefined;
    fn();
  };
  s.addEventListener?.("voiceschanged", h);
  return () => s.removeEventListener?.("voiceschanged", h);
}

export function canSpeak(): boolean {
  return (prefs.useRecorded && recordedCount() > 0) || synth() != null;
}

export function willUseRecorded(text: string): boolean {
  return prefs.useRecorded && recordedUrl(text) != null;
}

function speakSynth(text: string, rate: number) {
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

// 収録音声は fetch で丸ごと取り出し、Blob URL にして鳴らす。
// audio 要素に直接 URL を渡すと Safari は Range リクエストを送るが、
// Service Worker の precache は Range に応えないので、オフラインで鳴らなくなる。
// Blob URL は Service Worker を通らないので、この問題が起きない
const blobUrls = new Map<string, Promise<string>>();

function blobUrlFor(url: string): Promise<string> {
  let p = blobUrls.get(url);
  if (!p) {
    p = fetch(url).then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return URL.createObjectURL(await res.blob());
    });
    // 失敗したものは覚えず、次にまた取りに行く
    p.catch(() => blobUrls.delete(url));
    blobUrls.set(url, p);
  }
  return p;
}

// 新しく鳴らすたび、止めるたびに増える。古い再生の結果は無視する
let generation = 0;

export function speak(text: string, rate = BASE_RATE): void {
  stopSpeaking();
  const my = generation;
  const url = prefs.useRecorded ? recordedUrl(text) : null;
  const p = url ? getPlayer() : null;
  if (!p || !url) {
    speakSynth(text, rate);
    return;
  }
  const fallback = (e: unknown) => {
    // 止めたせいの失敗と、もう次の文を鳴らしているときは、合成音声に切り替えない
    if (my !== generation) return;
    if (e instanceof DOMException && e.name === "AbortError") return;
    speakSynth(text, rate);
  };
  blobUrlFor(url).then((src) => {
    if (my !== generation) return;
    p.src = src;
    p.playbackRate = Math.min(2, Math.max(0.5, rate / BASE_RATE));
    p.preservesPitch = true;
    p.play().catch(fallback);
  }, fallback);
}

export function stopSpeaking(): void {
  generation++;
  synth()?.cancel();
  if (player && !player.paused) player.pause();
}
