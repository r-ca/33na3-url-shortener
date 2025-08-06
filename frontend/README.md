# 33na3 URL Shortener Frontend

学内ユーザー向け短縮URLサービスのフロントエンド

## セットアップ

### 1. 依存関係のインストール
```bash
npm install
```

### 2. Google OAuth設定
`src/hooks/useAuth.ts` で Google Client ID を設定：

```typescript
const GOOGLE_CLIENT_ID = 'your-actual-client-id.googleusercontent.com';
```

### 3. 開発サーバー起動
```bash
npm run dev
```

ブラウザで `http://localhost:5173` を開く

## 本番ビルド

```bash
npm run build
```

ビルド結果は `dist/` ディレクトリに出力されます。

## 技術スタック

- **React 18** - UIライブラリ
- **TypeScript** - 型安全性
- **Vite** - ビルドツール
- **Ant Design** - UIコンポーネント
- **Google Identity Services** - 認証

## 機能

- ✅ Google Workspace認証
- ✅ 短縮URL作成・管理
- ✅ アクセス統計表示
- ✅ レスポンシブデザイン
- ✅ クリップボード連携

## Google Cloud Console 設定

### 承認済みのJavaScriptの生成元
```
https://url.33na3.work
http://localhost:5173
```

### 承認済みのリダイレクトURI
不要（JavaScript SDKを使用） 