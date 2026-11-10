#!/usr/bin/env bash
# public/icon.svg から PNG のアイコンを作る。アイコンを描き直したときだけ手で実行する。
# Google Chrome のヘッドレスで描画する。
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
pub="$root/public"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

chrome="${CHROME:-google-chrome}"

render() {
  local html="$1" size="$2" out="$3"
  "$chrome" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --default-background-color=00000000 \
    --window-size="$size,$size" --screenshot="$out" "file://$html" > /dev/null 2>&1
}

page() {
  local svg="$1" size="$2" html="$3"
  cat > "$html" <<EOF
<!doctype html><html><body style="margin:0;background:transparent">
<img src="file://$svg" width="$size" height="$size" style="display:block">
</body></html>
EOF
}

# maskable は角を丸めず全面を塗り、内側 80% に絵を収める
cat > "$work/maskable.svg" <<'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#b3261e"/>
  <rect y="171" width="512" height="170" fill="#f2b705"/>
  <text x="256" y="315" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="184" font-weight="700" fill="#b3261e">¡V!</text>
</svg>
EOF

for size in 192 512; do
  page "$pub/icon.svg" "$size" "$work/icon-$size.html"
  render "$work/icon-$size.html" "$size" "$pub/icon-$size.png"
done

page "$work/maskable.svg" 512 "$work/maskable.html"
render "$work/maskable.html" 512 "$pub/icon-maskable-512.png"

# iOS のホーム画面は角を自分で丸めるので、maskable と同じ全面塗りの絵を使う
page "$work/maskable.svg" 180 "$work/apple.html"
render "$work/apple.html" 180 "$pub/apple-touch-icon.png"

echo "アイコンを作った"
