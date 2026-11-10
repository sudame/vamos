# ¡Vamos! 旅のスペイン語

スペイン旅行で使うフレーズを、機内でオフラインのまま覚えるための PWA。
https://sudame.net/vamos/ で公開している。

## できること

- **ドリル**: 間隔反復で、忘れかけたフレーズから順に出す。新しいフレーズは次の流れで出る。
  1. 全部を見せて覚える
  2. スペイン語を見て、または聞いて意味を 4 択で選ぶ
  3. 日本語を見てスペイン語を言う（めくって自己採点するか、打ち込む）
- **解説**: フレーズごとに単語の分解とメモを付け、関係する文法ノートへ飛べるようにしている。
- **文法ノート**: 「¿Puedo + 動詞?」のような型を 27 項目。単語を入れ替えた例文で応用を練習する。
- **フレーズ一覧**: 400 件を 12 カテゴリに分け、検索と読み上げができる。

## オフラインで使う

一度ネットにつないで開くと、Service Worker が画面とデータを全部端末に保存する。
そのあとは機内モードでも動く。

読み上げには端末の音声合成を使う。
オフラインで鳴らすには、スペイン語の音声データを端末に入れておく。
手順はアプリの「設定 → 機内に入る前の準備」に書いてある。

学習の記録は端末のブラウザ（localStorage）にだけ保存する。
設定画面から JSON に書き出せる。

## 開発

ツールの版は `mise.toml` で固定している。

```sh
mise run dev     # 開発サーバー
mise run test    # ビルドしてからテスト
mise run lint    # biome（lint と整形の検査）、tsc、jactionlint、shellcheck
mise run format  # biome で整形し、直せる指摘を直す
mise run build   # dist/ を作る
```

- フレーズは `src/data/phrases.json`、文法ノートは `src/data/grammar.json` にある。形は `test/data.test.ts` で検査している。
- アイコンを描き直したら `scripts/make-icons.sh` で PNG を作り直す。Google Chrome が要る。
- main に push すると `pages.yml` が GitHub Pages に出す。
