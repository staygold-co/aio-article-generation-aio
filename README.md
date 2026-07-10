# AIO Content Factory MVP

AIO記事生成システムのMVPです。Next.js + TypeScript + Tailwind CSSで構築し、ローカルでのURL解析、記事生成、AIOスコア診断、WordPress投稿をサポートします。

## 目的
- ChatGPT引用、Google AI Overviewを狙える記事を大量生成するための基盤
- 業種・記事タイプごとの記事作成
- WordPress REST API連携による投稿管理

## 機能
- URL読み込み
- キーワード入力
- 業種選択
- 記事タイプ選択
- 記事生成
- AIOスコア診断
- WordPress投稿

## 技術構成
- Next.js
- TypeScript
- Tailwind CSS
- SQLite
- WordPress REST API

## セットアップ
1. 依存関係をインストール
   ```bash
   npm install
   ```
2. 環境変数を設定
   - `.env` を作成し、以下を追加
     ```env
     WP_SITE_URL=https://example.com
     WP_USERNAME=yourusername
     WP_PASSWORD=yourpassword
     WP_API_TOKEN=your_api_token
     ```
3. 開発サーバーを起動
   ```bash
   npm run dev
   ```
4. ブラウザで `http://localhost:3000` を開く

## 開発
- ページ: `app/page.tsx`
- APIルート: `app/api/*`
- DB初期化: `lib/db.ts`
- コンテンツ生成ロジック: `lib/aio.ts`

## 今後の拡張
- CSV一括生成
- 競合分析機能
- FAQ Schema挿入
- note連携
- UI改善

## Claude Code への移管

このプロジェクトは Claude Code に移管可能です。移管の手順は `CLAUDE_CODE_TRANSFER.md` にまとめています。
