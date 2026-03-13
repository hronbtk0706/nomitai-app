import { useState } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { generateAnonName } from "../lib/anonName";

interface Props {
  onBack?: () => void;
  onShowTerms?: () => void;
  onShowPrivacy?: () => void;
  currentArea?: string;
}

export default function LoginPage({ onBack, onShowTerms, onShowPrivacy, currentArea = "東京" }: Props) {
  const [mode, setMode] = useState<"select" | "email">("select");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleGoogle = async () => {
    setError("");
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error && err.message.includes("popup-closed")) return;
      setError("Googleログインに失敗しました");
    }
  };

  const handleAnonymous = async () => {
    const ok = confirm(
      "匿名モードでは、最後の操作から1時間経つと自動的にログアウトされます。\n\n再ログイン時は別のニックネームになり、以前のアカウントには戻れません。\nよろしいですか？"
    );
    if (!ok) return;
    setError("");
    try {
      const credential = await signInAnonymously(auth);
      const uid = credential.user.uid;
      const anonName = generateAnonName(uid);
      await setDoc(doc(db, "users", uid), {
        uid,
        nickname: anonName,
        ageGroup: "20代",
        gender: "その他",
        area: currentArea,
        isAnonymous: true,
        createdAt: Date.now(),
      });
    } catch (err) {
      console.error(err);
      setError("匿名ログインに失敗しました");
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setSubmitting(true);
    setError("");
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        if (err.message.includes("user-not-found") || err.message.includes("wrong-password") || err.message.includes("invalid-credential")) {
          setError("メールアドレスまたはパスワードが正しくありません");
        } else if (err.message.includes("email-already-in-use")) {
          setError("このメールアドレスは既に登録されています");
        } else if (err.message.includes("weak-password")) {
          setError("パスワードは6文字以上にしてください");
        } else if (err.message.includes("invalid-email")) {
          setError("メールアドレスの形式が正しくありません");
        } else {
          setError(isSignUp ? "登録に失敗しました" : "ログインに失敗しました");
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <h1>🍺 ノミタイ</h1>
      <p className="login-subtitle">
        「今夜飲みたい」を表明して
        <br />
        気軽に飲み仲間を見つけよう
      </p>

      {error && <p className="error-message">{error}</p>}

      {mode === "select" ? (
        <div className="login-buttons">
          <button className="login-btn google-btn" onClick={handleGoogle}>
            <span className="login-icon">G</span>
            Googleでログイン
          </button>
          <button className="login-btn email-btn" onClick={() => setMode("email")}>
            <span className="login-icon">✉</span>
            メールでログイン
          </button>
          <button className="login-btn anon-btn" onClick={handleAnonymous}>
            <span className="login-icon">🎭</span>
            匿名で参加する
          </button>
          {onBack && (
            <button className="back-link" onClick={onBack}>
              チャットに戻る
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={handleEmailSubmit} className="email-form">
          <div className="form-group">
            <label htmlFor="email">メールアドレス</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@mail.com"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">パスワード</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6文字以上"
              minLength={6}
            />
          </div>
          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? "処理中..." : isSignUp ? "新規登録" : "ログイン"}
          </button>
          <button
            type="button"
            className="switch-mode-btn"
            onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
          >
            {isSignUp ? "アカウントをお持ちの方はこちら" : "新規登録はこちら"}
          </button>
          <button
            type="button"
            className="back-link"
            onClick={() => { setMode("select"); setError(""); }}
          >
            戻る
          </button>
        </form>
      )}

      <div className="legal-links">
        <span>ログインすると</span>
        <button type="button" className="legal-link" onClick={onShowTerms}>利用規約</button>
        <span>と</span>
        <button type="button" className="legal-link" onClick={onShowPrivacy}>プライバシーポリシー</button>
        <span>に同意したことになります</span>
      </div>
    </div>
  );
}
