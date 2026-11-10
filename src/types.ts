// アプリ全体で使う型。データ JSON（src/data/*.json）の形と、localStorage に保存する記録の形をここに置く。

// --- フレーズ集（src/data/phrases.json） ---

export interface Category {
  id: string;
  ja: string;
  es: string;
  icon: string;
}

// フレーズを語に分解したもの。base は活用する前の形
export interface Word {
  w: string;
  ja: string;
  base?: string;
}

export interface Phrase {
  id: string;
  cat: string;
  es: string;
  ja: string;
  kana?: string;
  note?: string;
  // 正解に数える別の言い方
  alt?: string[];
  words: Word[];
  // 関係する文法ノートの id
  grammar?: string[];
}

// --- 文法ノート（src/data/grammar.json） ---

export type GrammarBlock =
  | { type: "p"; text: string }
  | { type: "pattern"; es: string; ja: string }
  | { type: "table"; head: string[]; rows: string[][] }
  | { type: "tip"; text: string };

// 「入れ替えてみる」の例文
export interface GrammarExample {
  es: string;
  ja: string;
}

export interface Grammar {
  id: string;
  title: string;
  summary: string;
  body: GrammarBlock[];
  swap?: GrammarExample[];
}

// --- 収録音声（src/data/audio.json と scripts/audio-plan.ts） ---

export interface AudioManifest {
  voice: string;
  // 文から mp3 のファイル名を引く
  files: Record<string, string>;
}

// 1 つの音声ファイルの中で、1 人の話し手が読む部分
export interface AudioSegment {
  text: string;
  voice: string;
}

export interface AudioPlanEntry {
  segments: AudioSegment[];
  file: string;
}

// --- 間隔反復 ---

// rec: スペイン語を見て意味が分かるか、pro: 日本語を見てスペイン語が出てくるか
export type CardDir = "rec" | "pro";

export type CardState = "new" | "learning" | "relearning" | "review";

export interface Card {
  state: CardState;
  step: number;
  // 次に出す時刻（ミリ秒）
  due: number;
  // 間隔（日）
  interval: number;
  ease: number;
  reps: number;
  lapses: number;
  // 最後に答えた時刻（ミリ秒）
  seen?: number;
}

// again / hard / good / easy
export type Grade = 0 | 1 | 2 | 3;

// 0 未着手、1 覚えかけ、2 意味は分かる、3 言える
export type Mastery = 0 | 1 | 2 | 3;

export type PickKind = "new" | "due" | "ahead";

// pickNext が選んだカード
export interface CardPick {
  id: string;
  kind: PickKind;
}

// --- 問題 ---

interface QuestionBase {
  cardId: string;
  phrase: Phrase;
  dir: string;
  kind: PickKind;
}

export type Question = QuestionBase &
  ({ type: "intro" } | { type: "choice" | "listen"; options: Phrase[] } | { type: "flip" | "type" });

export type CheckResult = "exact" | "accent" | "close" | "wrong";

export interface DiffMark {
  ch: string;
  ok: boolean;
}

// 4 択に答えたとき。chosen は選んだフレーズの id
export interface ChoiceAnswer {
  correct: boolean;
  chosen: string;
  typed?: undefined;
}

// 打ち込んで答えたとき。override は「実は合ってた」で正解にしたもの
export interface TypedAnswer {
  correct: boolean;
  typed: string;
  result: CheckResult | "override";
  matched: string;
  chosen?: undefined;
}

export type Answer = ChoiceAnswer | TypedAnswer;

// 1 ラウンドの成績。missed は間違えたフレーズの id
export interface Round {
  n: number;
  correct: number;
  missed: string[];
}

// --- 保存する記録（src/storage.ts） ---

export type ProduceMode = "flip" | "type";

export type Theme = "auto" | "light" | "dark";

export interface Settings {
  // null はすべてのカテゴリ
  cats: string[] | null;
  produceMode: ProduceMode;
  autoSpeak: boolean;
  autoNext: boolean;
  useRecorded: boolean;
  rate: number;
  showKana: boolean;
  listenQuiz: boolean;
  theme: Theme;
}

// 1 日分の回答数と正答数
export interface DayRecord {
  answered: number;
  correct: number;
}

export interface State {
  // キーは cardId（「フレーズの id:rec」など）
  cards: Record<string, Card>;
  // キーは dayKey（YYYY-MM-DD）
  days: Record<string, DayRecord>;
  settings: Settings;
}

export type Update = (fn: (prev: State) => State) => void;

// 各画面が受け取る props
export interface ScreenProps {
  state: State;
  update: Update;
}

// --- オフライン ---

export type OfflineStatus = "checking" | "ready" | "unsupported" | "error";
