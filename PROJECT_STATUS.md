# ノミタイ - プロジェクト状況サマリー

## 概要
「ノミタイ」は今夜飲みたい人同士をつなげるリアルタイムチャットアプリ。
- URL: https://nomitai-app.web.app
- React + TypeScript + Vite
- Firebase Hosting（Sparkプラン / 無料）
- Firestore でデータ管理
- Cloudinary で画像ストレージ（25GB無料）

## 完了済み機能・対応

### SEO対策
- `index.html` にmeta description, keywords, canonical, OGP, Twitter Card, JSON-LD構造化データを追加
- `public/robots.txt`, `public/sitemap.xml` 作成
- `public/googlee1b8ce35e66428bd.html` でGoogle Search Console登録済み
- `<noscript>` コンテンツ追加（クローラー向け）

### セキュリティ（Firestoreルール）
- `firestore.rules` を本番用に設定
  - users: 認証済みユーザーのみ読み取り、本人のみ書き込み/削除、24時間経過の匿名ユーザーは他者が削除可
  - drinks: 誰でも読み取り、本人のみ作成、本人or3日経過で削除可
  - chats: 誰でも読み取り、本人のみ作成、本人or3日経過で削除可、リアクション更新は認証済みユーザー
  - reports: 認証済みユーザーのみ作成可（読み取り/更新/削除不可）

### データクリーンアップ（クライアントサイド）
- `src/lib/cleanup.ts`: アプリ起動時に6時間間隔で実行
  - 24時間経過の匿名ユーザー（プロフィール+drinks）を削除
  - 3日経過のdrinksデータを削除
  - **チャットは削除しない**（ユーザーの決定により保持）

### 不適切コンテンツ対策
- `src/lib/ngWords.ts`: NGワードフィルター（全角→半角正規化対応）
- スパム防止: 3秒間隔制限
- 通報機能: 他人のメッセージを長押しで通報 → Firestore `reports` コレクションに保存
- 画像のフィルタリングはクライアントサイドでは不可 → 通報ベースで対応

### 利用規約・プライバシーポリシー
- `src/pages/TermsPage.tsx`: 利用規約（8条）
- `src/pages/PrivacyPage.tsx`: プライバシーポリシー（8項目）
- ログイン画面にリンク表示

### PWA対応
- `public/manifest.json`: PWAマニフェスト（standalone, portrait）
- `public/sw.js`: Service Worker（ネットワーク優先戦略）
- `public/icon.svg`: ビールジョッキのアプリアイコン
- `index.html`: apple-mobile-web-app-capable等のメタタグ追加
- `src/main.tsx`: Service Worker登録

### ユーザー活動の可視化
- ヘッダーに総登録者数を表示（匿名を除く、ログイン後のみ表示）
- エリアセレクターに各エリアの「飲みたい」人数バッジ表示

## 未解決の問題

### 総登録者数の表示問題
- ヘッダーの「👥 {totalUsers}」が表示されないという報告あり
- デバッグ版をデプロイしたが、原因特定前にセッション終了
- 現在はデバッグコードをクリーンアップ済み（`totalUsers`がnullの間は非表示、profileがある場合のみ取得）
- **考えられる原因**:
  1. Firestoreの`users`コレクション読み取りに認証が必要だが、タイミングの問題でクエリが失敗している可能性
  2. Service Workerが古いバージョンをキャッシュしている可能性
- **次のステップ**: ブラウザのコンソールで「ユーザー数取得エラー」が出ていないか確認。出ていればFirestoreルールまたは認証タイミングの問題。

## ファイル構成（主要変更ファイル）

```
nomitai-app/
├── index.html              # SEOメタタグ、PWA設定
├── firestore.rules         # Firestoreセキュリティルール
├── firebase.json           # Firebase設定（firestoreルール参照追加）
├── public/
│   ├── manifest.json       # PWAマニフェスト
│   ├── sw.js               # Service Worker
│   ├── icon.svg            # アプリアイコン（ビールジョッキ）
│   ├── robots.txt          # クローラー設定
│   ├── sitemap.xml         # サイトマップ
│   └── googlee1b8ce35e66428bd.html  # Search Console認証
├── src/
│   ├── main.tsx            # SW登録追加
│   ├── App.tsx             # クリーンアップ呼び出し、利用規約/PP画面ルーティング
│   ├── App.css             # 新規スタイル追加
│   ├── lib/
│   │   ├── cleanup.ts      # クライアントサイドデータクリーンアップ
│   │   └── ngWords.ts      # NGワードフィルター
│   └── pages/
│       ├── MainPage.tsx    # NG/スパム/通報/ユーザー数/エリア別人数
│       ├── LoginPage.tsx   # 利用規約・PPリンク追加
│       ├── TermsPage.tsx   # 利用規約ページ
│       └── PrivacyPage.tsx # プライバシーポリシーページ
```

## Firebaseプラン制限（Spark / 無料）
- Firestore: 1GB ストレージ（~1000メッセージ/日で約2.7年）
- Cloud Functions: 使用不可 → クリーンアップはクライアントサイドで実装
- 画像: Cloudinary（25GBまで無料、~25万枚）

## 今後の検討事項
- SSR対応（SEO強化、ただし現時点では不要）
- 画像の自動モデレーション（クライアントサイドでは不可、通報ベースで運用）
- Firestore容量が逼迫した場合のデータアーカイブ戦略
