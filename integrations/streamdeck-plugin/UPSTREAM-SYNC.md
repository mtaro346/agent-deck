# フォークと本家の同期

このフォークのブランチ構成:

- `origin` = あなたのフォーク (`mtaro346/agent-deck`)
- `upstream` = 本家 (`asheshgoplani/agent-deck`)
- **`main`** = 本家ミラー。カスタム変更は載せない（常に `upstream/main` に追従させる）
- **`mtaro346/main`** = あなたのカスタム。Stream Deck プラグイン（`integrations/streamdeck-plugin/`）はここに載る

カスタム変更は `integrations/streamdeck-plugin/` 配下に隔離してあり、agent-deck 本体は無改造なので、本家を取り込んでも競合はほぼ起きません。

## 本家の更新を取り込む手順

```bash
# 1) main を本家に追従させる
git checkout main
git fetch upstream
git merge --ff-only upstream/main
git push origin main

# 2) カスタムブランチへ本家を取り込む
git checkout mtaro346/main
git merge main
#   競合が出たら解決（基本は integrations/streamdeck-plugin/ 以外なので素直にマージできるはず）
git push origin mtaro346/main
```

`--ff-only` が失敗する場合は、`main` に誤ってコミットが載っている可能性があります。その場合は `git reset --hard upstream/main`（main 限定）で本家ミラーに戻してから再実行してください。
