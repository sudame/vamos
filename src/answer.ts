// 打ち込んだスペイン語の答え合わせ。

import type { CheckResult, DiffMark } from "./types.ts";

const PUNCT_CLASS = "[¿?¡!.,;:\"'“”‘’«»…()\\-–—]";
const PUNCT = new RegExp(PUNCT_CLASS, "g");
const PUNCT_CHAR = new RegExp(`^${PUNCT_CLASS}$`);

// 大文字小文字・記号・空白の違いを無視する
export function normalize(s: string): string {
  return s.normalize("NFC").toLowerCase().replace(PUNCT, " ").replace(/\s+/g, " ").trim();
}

// アクセント記号も無視する（ñ も n として扱う）
export function fold(s: string): string {
  return normalize(s).normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function withoutPorFavor(s: string): string {
  return s
    .replace(/\bpor favor\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

// 結果:
//   exact  完全に合っている
//   accent アクセント記号だけ違う
//   close  1〜2 文字だけ違う。打ち間違いか、別の語（junio と julio など）かは区別できないので、正解には数えない
//   wrong  違う
// matched は一番近かった正解
export function check(input: string, answers: string[]): { result: CheckResult; matched: string } {
  const inN = normalize(input);
  if (inN === "") return { result: "wrong", matched: answers[0] };
  const inF = fold(input);

  let best: { result: CheckResult; matched: string; dist: number } = {
    result: "wrong",
    matched: answers[0],
    dist: Number.POSITIVE_INFINITY,
  };
  for (const ans of answers) {
    const aN = normalize(ans);
    const aF = fold(ans);
    if (inN === aN || withoutPorFavor(inN) === withoutPorFavor(aN)) {
      return { result: "exact", matched: ans };
    }
    if (inF === aF || withoutPorFavor(inF) === withoutPorFavor(aF)) {
      best = { result: "accent", matched: ans, dist: 0 };
      continue;
    }
    const d = Math.min(levenshtein(inF, aF), levenshtein(withoutPorFavor(inF), withoutPorFavor(aF)));
    const len = withoutPorFavor(aF).length;
    const limit = len <= 4 ? 0 : len <= 12 ? 1 : 2;
    if (d <= limit && best.result !== "accent" && d < best.dist) {
      best = { result: "close", matched: ans, dist: d };
    }
  }
  return { result: best.result, matched: best.matched };
}

// 文字単位の違いを返す（正解の側から見て、合っている文字か）。
// 表示用なので、アクセントの違いも「違う」として印を付ける。
export function diffMarks(input: string, answer: string): DiffMark[] {
  const a = [...answer];
  const b = [...input];
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  const eq = (x: string, y: string) => x.toLowerCase() === y.toLowerCase();
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = eq(a[i], b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const marks: DiffMark[] = [];
  let i = 0;
  let j = 0;
  while (i < m) {
    if (j < n && eq(a[i], b[j])) {
      marks.push({ ch: a[i], ok: true });
      i++;
      j++;
    } else if (j < n && dp[i][j + 1] >= dp[i + 1][j]) {
      j++;
    } else {
      const ignorable = PUNCT_CHAR.test(a[i]) || a[i] === " ";
      marks.push({ ch: a[i], ok: ignorable });
      i++;
    }
  }
  // por favor は省いてよいので、入力に無ければその部分（前の「, 」も含む）を合っている扱いにする
  if (!/por favor/.test(fold(input))) {
    const m = /,?\s*por favor/i.exec(answer);
    if (m) {
      const from = [...answer.slice(0, m.index)].length;
      const to = from + [...m[0]].length;
      for (let k = from; k < to && k < marks.length; k++) marks[k] = { ...marks[k], ok: true };
    }
  }
  return marks;
}
