#!/usr/bin/env bash
# GitHub のリポジトリ設定と main の ruleset をそろえる。
# 何度実行しても同じ状態になる。
set -euo pipefail

repo="sudame/vamos"
script_dir="$(cd "$(dirname "$0")" && pwd)"

gh api "repos/$repo" --method PATCH \
  -F allow_auto_merge=true \
  -F delete_branch_on_merge=true \
  -F allow_update_branch=true \
  > /dev/null
echo "リポジトリ設定をそろえた"

ruleset_id="$(gh api "repos/$repo/rulesets" --jq '.[] | select(.name == "default") | .id')"
if [ -n "$ruleset_id" ]; then
  gh api "repos/$repo/rulesets/$ruleset_id" --method PUT --input "$script_dir/github-ruleset.json" > /dev/null
  echo "ruleset default を更新した"
else
  gh api "repos/$repo/rulesets" --method POST --input "$script_dir/github-ruleset.json" > /dev/null
  echo "ruleset default を作った"
fi
