# Claude Code への移管手順

このプロジェクトは標準的な Next.js + TypeScript + Tailwind の構成で作成されています。
Claude Code に移管する場合は、以下の手順に従ってください。

## 1. フォルダを開く

1. Claude Code または対応するエディタで `c:\Users\stayg\OneDrive\デスクトップ\AIO記事作成AI` フォルダを開きます。
2. プロジェクトルートに `package.json`、`app/`、`lib/`、`tsconfig.json` が存在することを確認します。

## 2. 依存関係をインストール

Claude Code のターミナルで次を実行します。

```bash
npm install
```

## 3. 環境変数を用意

プロジェクトルートに `.env` を作成し、必要な WordPress 認証情報を追加します。

```env
WP_SITE_URL=https://your-wordpress-site.com
WP_USERNAME=your-username
WP_PASSWORD=your-password
WP_API_TOKEN=your-jwt-or-application-password
```

## 4. 開発サーバーを起動

```bash
npm run dev
```

## 5. ブラウザ確認

`http://localhost:3000` を開き、UI が表示されることを確認します。

## 6. 実装の続きを進める

- `app/page.tsx` : UI と操作フロー
- `app/api/*` : URL解析、記事生成、診断、WordPress連携 API
- `lib/aio.ts` : 生成ロジックと WordPress 投稿処理
- `lib/db.ts` : SQLite DB 初期化

---

> 注意: ここでは Claude Code 環境に直接切り替えることはできません。移管は、上記手順に沿ってフォルダを Claude Code に読み込むことで実現してください。
