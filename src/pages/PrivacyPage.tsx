interface Props {
  onBack: () => void;
}

export default function PrivacyPage({ onBack }: Props) {
  return (
    <div className="legal-page">
      <h1>プライバシーポリシー</h1>
      <p className="legal-date">最終更新日: 2026年3月13日</p>

      <section>
        <h2>1. 収集する情報</h2>
        <p>本サービスでは、以下の情報を収集します。</p>
        <ul>
          <li><strong>プロフィール情報:</strong> ニックネーム、年代、性別、プロフィール画像（任意）</li>
          <li><strong>認証情報:</strong> メールアドレス（メール認証の場合）、Google認証情報（Google認証の場合）</li>
          <li><strong>位置情報:</strong> GPS情報（ユーザーが許可した場合のみ、最寄りエリアの判定にのみ使用）</li>
          <li><strong>投稿データ:</strong> チャットメッセージ、画像</li>
          <li><strong>利用データ:</strong> アクセス日時、利用エリア</li>
        </ul>
      </section>

      <section>
        <h2>2. 情報の利用目的</h2>
        <ul>
          <li>サービスの提供・運営</li>
          <li>ユーザー認証・アカウント管理</li>
          <li>最寄りエリアのチャットルームへの自動振り分け</li>
          <li>サービスの改善・不正利用の防止</li>
        </ul>
      </section>

      <section>
        <h2>3. 情報の保存</h2>
        <ul>
          <li>データはGoogle Firebase（Firestore）およびCloudinaryに保存されます。</li>
          <li>匿名アカウントのデータは、一定期間経過後に自動削除される場合があります。</li>
          <li>位置情報はサーバーに保存されません（エリア名のみ保存）。</li>
        </ul>
      </section>

      <section>
        <h2>4. 第三者への提供</h2>
        <p>以下の場合を除き、個人情報を第三者に提供することはありません。</p>
        <ul>
          <li>法令に基づく場合</li>
          <li>ユーザーの同意がある場合</li>
          <li>サービス提供に必要な業務委託先（Firebase、Cloudinary）</li>
        </ul>
      </section>

      <section>
        <h2>5. 利用している外部サービス</h2>
        <ul>
          <li><strong>Google Firebase:</strong> 認証、データベース、ホスティング</li>
          <li><strong>Cloudinary:</strong> 画像の保存・配信</li>
        </ul>
        <p>各サービスのプライバシーポリシーもご確認ください。</p>
      </section>

      <section>
        <h2>6. データの削除</h2>
        <ul>
          <li>ユーザーは自身の投稿メッセージを削除できます。</li>
          <li>アカウント削除をご希望の場合は、運営者にお問い合わせください。</li>
        </ul>
      </section>

      <section>
        <h2>7. Cookie・ローカルストレージ</h2>
        <p>本サービスでは、ユーザーの利便性向上のためにローカルストレージを使用しています（エリア設定、GPS確認状態の保持等）。個人を特定する情報は保存していません。</p>
      </section>

      <section>
        <h2>8. ポリシーの変更</h2>
        <p>本ポリシーは予告なく変更される場合があります。変更後のポリシーは本サービス上に掲示した時点で効力を生じます。</p>
      </section>

      <button className="legal-back-btn" onClick={onBack}>戻る</button>
    </div>
  );
}
