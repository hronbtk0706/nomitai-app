import { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MainPage from "./pages/MainPage";
import "./App.css";

function App() {
  const { user, profile, setProfile, loading, cleanupAnonymous } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [messageText, setMessageText] = useState("");

  if (loading) {
    return (
      <div className="loading">
        <p>読み込み中...</p>
      </div>
    );
  }

  // ログイン画面を表示（ゲストがログインを要求した場合）
  if (showLogin && !user) {
    return <LoginPage onBack={() => setShowLogin(false)} />;
  }

  // 未ログイン → ゲストモードでメイン画面
  if (!user) {
    return <MainPage profile={null} onRequestLogin={() => setShowLogin(true)} messageText={messageText} onMessageTextChange={setMessageText} />;
  }

  // ログイン済み・プロフィール未設定 → プロフィール入力画面
  if (!profile) {
    return <RegisterPage uid={user.uid} onRegistered={(p) => setProfile(p)} />;
  }

  // 登録済み → メイン画面
  return <MainPage profile={profile} onRequestLogin={() => {}} onLogout={cleanupAnonymous} messageText={messageText} onMessageTextChange={setMessageText} />;
}

export default App;
