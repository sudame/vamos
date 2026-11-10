// フレーズと文法ノートの例文を Google Cloud Text-to-Speech で mp3 にする。
// 誰の声で読むかは scripts/audio-plan.ts が決める。
// 作ったファイルは public/audio/ に置き、文と音声ファイルの対応を src/data/audio.json に書く。
// まだ無いファイルの分だけ API を呼ぶので、何度実行してもよい。
//
//   node scripts/gen-audio.ts            # 足りない分を作り、使わないファイルを消す
//   node scripts/gen-audio.ts --voices   # es-ES の声の一覧
//   node scripts/gen-audio.ts --sample <声の名前> <出力先.mp3> [文]
//
// API キーは環境変数 GOOGLE_CLOUD_TTS_API_KEY で渡す。

import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import type { AudioSegment } from "../src/types.ts";
import { plan, VOICES } from "./audio-plan.ts";

const LANG = "es-ES";
const ENDPOINT = "https://texttospeech.googleapis.com/v1";
const PARALLEL = 4;
const root = new URL("../", import.meta.url);
const audioDir = new URL("public/audio/", root);
const manifestPath = new URL("src/data/audio.json", root);

const key = process.env.GOOGLE_CLOUD_TTS_API_KEY ?? "";
if (!key) {
  console.error("環境変数 GOOGLE_CLOUD_TTS_API_KEY に API キーを入れて実行する");
  process.exit(1);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Text-to-Speech API の応答のうち、ここで読むところ
interface SynthesizeResponse {
  audioContent: string;
}
interface VoicesResponse {
  voices: { name: string; ssmlGender: string }[];
}

async function api<T>(path: string, body?: unknown): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${ENDPOINT}/${path}`, {
      method: body ? "POST" : "GET",
      headers: { "X-Goog-Api-Key": key, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.ok) return res.json();
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      await sleep(2000 * 2 ** attempt);
      continue;
    }
    throw new Error(`${path}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
  }
}

async function synthesize(text: string, voice: string): Promise<Buffer> {
  const r = await api<SynthesizeResponse>("text:synthesize", {
    input: { text },
    voice: { languageCode: LANG, name: voice },
    audioConfig: { audioEncoding: "MP3", sampleRateHertz: 24000 },
  });
  return Buffer.from(r.audioContent, "base64");
}

// 対話は話し手ごとに作った mp3 をそのままつなぐ（同じ形式の MP3 はフレームを並べれば再生できる）
async function render(segments: AudioSegment[]): Promise<Buffer> {
  const parts = [];
  for (const s of segments) parts.push(await synthesize(s.text, s.voice));
  return Buffer.concat(parts);
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === "--voices") {
    const r = await api<VoicesResponse>(`voices?languageCode=${LANG}`);
    for (const v of r.voices) console.log(`${v.name}\t${v.ssmlGender}`);
    return;
  }
  if (args[0] === "--sample") {
    const [, voice, out] = args;
    const text = args[3] ?? "Hola, buenas tardes. ¿Me pones una caña y una ración de jamón, por favor?";
    writeFileSync(out, await synthesize(text, voice));
    console.log(`${voice} → ${out}`);
    return;
  }

  mkdirSync(audioDir, { recursive: true });
  const entries = [...plan(root)];
  const todo = entries.filter(([, e]) => !existsSync(new URL(e.file, audioDir)));
  let done = 0;
  const worker = async () => {
    while (todo.length > 0) {
      const next = todo.shift();
      if (!next) break;
      const [, e] = next;
      writeFileSync(new URL(e.file, audioDir), await render(e.segments));
      done++;
      if (done % 25 === 0) console.log(`${done} 件作った`);
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));

  const files = Object.fromEntries(entries.map(([text, e]) => [text, e.file]));
  const keep = new Set(Object.values(files));
  let removed = 0;
  for (const f of readdirSync(audioDir)) {
    if (f.endsWith(".mp3") && !keep.has(f)) {
      rmSync(new URL(f, audioDir));
      removed++;
    }
  }

  const voices = [...VOICES.male, ...VOICES.female].map((v) => v.replace(/^es-ES-Chirp3-HD-/, ""));
  writeFileSync(manifestPath, `${JSON.stringify({ voice: `Chirp 3 HD（${voices.join("・")}）`, files }, null, 2)}\n`);
  console.log(`文 ${entries.length} 件、新しく作った ${done} 件、消した ${removed} 件`);
}

await main();
