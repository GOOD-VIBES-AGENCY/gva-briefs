# GVA タイアップ依頼ページ 自動生成システム

Googleフォームの回答から、タイアップ依頼ページを自動生成してGitHub Pagesに公開します。

## 🚀 セットアップ（3ステップのみ）

### Step 1 — Apps Script プロジェクトを作成
1. [script.google.com](https://script.google.com) を開く
2. 「新しいプロジェクト」を作成
3. 左の「+」からファイルを2つ追加：
   - `Setup.gs` → [コードをコピー](./gas/Setup.gs)
   - `Code.gs` → [コードをコピー](./gas/Code.gs)

### Step 2 — GitHubトークンを設定
1. 左メニュー「プロジェクトの設定（⚙️）」→「スクリプトプロパティ」
2. 「プロパティを追加」をクリック
3. キー: `GITHUB_TOKEN` / 値: GitHub Personal Access Token を入力して保存

### Step 3 — 実行するだけ
1. 関数のドロップダウンから `runSetup` を選択
2. 「実行（▶）」をクリック
3. 権限の承認を許可
4. **完了！** ログにフォームURLが表示されます 🎉

---

## 📋 フォームを送信すると...

```
担当者がフォームに入力
       ↓
Apps Script が自動起動
       ↓
タイアップ依頼ページを生成
       ↓
GitHub に自動コミット
       ↓
http://goodvibesagency.tokyo/gva-briefs/briefs/{ブランド名}-{年月}/
で即公開 ✨
```

---

## 📄 生成されるURL

| ページ | URL |
|---|---|
| 一覧 | http://goodvibesagency.tokyo/gva-briefs/ |
| 個別ページ例 | http://goodvibesagency.tokyo/gva-briefs/briefs/phoebe-2026-06/ |
