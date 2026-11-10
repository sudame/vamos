# vamos のエージェント向けの決まり

機内でオフラインのまま旅行のスペイン語を覚える PWA。
使い方と公開の流れは README にある。

## ツールとコマンド

ツールのバージョンは `mise.toml` で固定している。
`mise exec` は付けない。vite は `mise run` のタスクから呼ぶ。
CLI のツールは `npx` などで実行時に取ってこず、`mise.toml` の tools に足す。

- `mise run test`、`mise run lint`、`mise run build`：CI も同じタスクを呼ぶ。
- `mise run github-settings`：自動マージと main の ruleset を GitHub に設定する。

## 守ること

- オフラインで動くことが前提。外部のサーバー（フォント、CDN、API）を参照しない。新しい種類のファイルを足したら、`vite.config.js` の `globPatterns` に入るか確かめる。
- スペイン語はスペイン本国の言い方にする（vale、billete、móvil、coger など）。¿ ¡ とアクセント記号を正しく付ける。
- 学習の記録の形（`src/storage.js`）を変えるときは、`migrate` で古い記録を読めるようにする。旅行中の記録が消えると困る。
