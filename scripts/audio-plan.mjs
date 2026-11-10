// どの文をどの声で読むかを決める。API は呼ばない。
//
// 飽きないように 4 人の声に散らす。誰が読むかは文のハッシュで決めるので、作り直しても同じ声になる。
// ただし次の文は話し手の性別を合わせる。
//   - 日本語訳に（男性）（男性が言う）が付く文は男性、（女性）（女性が言う）（女性が）が付く文は女性
//   - 「男性形 / 女性形」の並記は、前を男性、後ろを女性
//   - 「A ―B」の対話は、A と B を別の性別にする

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export const VOICES = {
  female: ["es-ES-Chirp3-HD-Aoede", "es-ES-Chirp3-HD-Kore"],
  male: ["es-ES-Chirp3-HD-Charon", "es-ES-Chirp3-HD-Puck"],
};
const ALL = [...VOICES.male, ...VOICES.female];

const MALE_TAG = /（(男性|男性が言う|男性が)）/;
const FEMALE_TAG = /（(女性|女性が言う|女性が)）/;

function hash(s) {
  return createHash("sha256").update(s).digest();
}

function pick(list, seed) {
  return list[hash(seed).readUInt32BE(0) % list.length];
}

export function genderOf(voice) {
  return VOICES.male.includes(voice) ? "male" : "female";
}

export function segmentsFor(es, ja = "") {
  const dialog = es.split(/\s*[―—]\s*/).filter(Boolean);
  if (dialog.length > 1) {
    const first = pick(ALL, es);
    const other = genderOf(first) === "male" ? VOICES.female : VOICES.male;
    const second = pick(other, `${es}#2`);
    return dialog.map((text, i) => ({ text, voice: i % 2 === 0 ? first : second }));
  }
  const pair = es.split(/\s+\/\s+/);
  if (pair.length === 2 && /男性／女性/.test(ja)) {
    return [
      { text: pair[0], voice: pick(VOICES.male, es) },
      { text: pair[1], voice: pick(VOICES.female, es) },
    ];
  }
  let list = ALL;
  if (MALE_TAG.test(ja)) list = VOICES.male;
  else if (FEMALE_TAG.test(ja)) list = VOICES.female;
  return [{ text: es, voice: pick(list, es) }];
}

export function fileFor(segments) {
  const key = segments.map((s) => `${s.voice}\n${s.text}`).join("\n\n");
  return `${hash(key).toString("hex").slice(0, 16)}.mp3`;
}

// 音声にする文を集める。同じ文は最初に出てきたものの訳で話し手を決める
export function plan(root) {
  const read = (p) => JSON.parse(readFileSync(new URL(p, root), "utf8"));
  const items = [];
  for (const p of read("src/data/phrases.json")) items.push({ es: p.es, ja: p.ja });
  for (const g of read("src/data/grammar.json")) for (const s of g.swap ?? []) items.push({ es: s.es, ja: s.ja });
  const out = new Map();
  for (const it of items) {
    if (out.has(it.es)) continue;
    const segments = segmentsFor(it.es, it.ja);
    out.set(it.es, { segments, file: fileFor(segments) });
  }
  return out;
}
