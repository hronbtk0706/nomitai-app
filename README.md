# 🍺 ノミタイ

「今夜飲みたい」を気軽に表明して、近くの飲み仲間を見つけるリアルタイムチャットアプリです。

**→ https://nomitai-app.web.app**

---

## 主な機能

- **エリア別チャット** — 東京・大阪・名古屋など全国の主要都市ごとにチャットルームを分割
- **「飲みたい！」表明** — ボタン一つで今夜飲みたいことを表明、参加者リストをリアルタイム表示
- **GPS自動エリア選択** — 位置情報から最寄りのエリアに自動で入室
- **画像送信** — チャットに画像を添付して送信（Cloudinary経由）
- **リアクション** — メッセージに絵文字でリアクション
- **匿名ログイン** — アカウント登録不要で参加可能（1時間無操作でセッション終了）
- **PWA対応** — ホーム画面に追加してネイティブアプリのように使用可能
- **不適切コンテンツ対策** — NGワードフィルタ・通報機能

## 技術スタック

| 分類 | 技術 |
|------|------|
| フロントエンド | React 19 + TypeScript + Vite |
| スタイリング | CSS（カスタム、ダークテーマ） |
| 認証 | Firebase Authentication（Google / メール / 匿名） |
| データベース | Cloud Firestore（リアルタイム購読） |
| ホスティング | Firebase Hosting |
| 画像ストレージ | Cloudinary |
| SEO | react-snap（ビルド時プリレンダリング） |
| PWA | Service Worker + Web App Manifest |

## ローカル起動

```bash
git clone https://github.com/hronbtk0706/nomitai-app.git
cd nomitai-app
npm install
```

`.env` ファイルを作成し Firebase / Cloudinary の設定値を記載します：

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_CLOUDINARY_CLOUD_NAME=...
VITE_CLOUDINARY_UPLOAD_PRESET=...
```

```bash
npm run dev
```

## ディレクトリ構成

```
src/
├── pages/        # 各画面コンポーネント（MainPage, LoginPage, RegisterPage...）
├── hooks/        # カスタムフック（useAuth）
├── lib/          # Firebase / Cloudinary / ユーティリティ
└── types.ts      # 共通型定義
```

## ライセンス

MIT
