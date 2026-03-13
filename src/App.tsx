import { useState, useEffect } from "react";
import { doc, setDoc } from "firebase/firestore";
import { useAuth } from "./hooks/useAuth";
import { db } from "./lib/firebase";
import { findNearestArea, getCurrentPosition } from "./lib/areas";
import { cleanupStaleData } from "./lib/cleanup";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MainPage from "./pages/MainPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import "./App.css";

function App() {
  const { user, profile, setProfile, loading, cleanupAnonymous } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [showGpsPrompt, setShowGpsPrompt] = useState(() => {
    return !localStorage.getItem("nomitai_gps_asked");
  });
  const [gpsDetecting, setGpsDetecting] = useState(false);
  const [currentArea, setCurrentArea] = useState(() => {
    return localStorage.getItem("nomitai_area") || "仙台";
  });

  // アプリ起動時に古いデータを掃除（6時間に1回）
  useEffect(() => {
    cleanupStaleData();
  }, []);

  // プロフィールのエリアと同期
  useEffect(() => {
    if (profile?.area) {
      setCurrentArea(profile.area);
      localStorage.setItem("nomitai_area", profile.area);
    }
  }, [profile?.area]);

  const handleAreaChange = async (area: string) => {
    setCurrentArea(area);
    localStorage.setItem("nomitai_area", area);
    if (profile && user) {
      const updated = { ...profile, area };
      await setDoc(doc(db, "users", user.uid), updated);
      setProfile(updated);
    }
  };

  const handleGpsAllow = async () => {
    setGpsDetecting(true);
    try {
      const pos = await getCurrentPosition();
      const nearest = findNearestArea(pos.coords.latitude, pos.coords.longitude);
      setCurrentArea(nearest);
      localStorage.setItem("nomitai_area", nearest);
    } catch {
      // GPS拒否・エラー時はデフォルトのまま
    } finally {
      setGpsDetecting(false);
      localStorage.setItem("nomitai_gps_asked", "1");
      setShowGpsPrompt(false);
    }
  };

  const handleGpsSkip = () => {
    localStorage.setItem("nomitai_gps_asked", "1");
    setShowGpsPrompt(false);
  };

  if (loading) {
    return (
      <div className="loading">
        <p>読み込み中...</p>
      </div>
    );
  }

  // 初回アクセス時のGPS確認画面
  if (showGpsPrompt) {
    return (
      <div className="gps-prompt-page">
        <div className="gps-prompt-card">
          <div className="gps-prompt-icon">📍</div>
          <h1>ノミタイ</h1>
          <p className="gps-prompt-text">
            近くのエリアのチャットに自動で入るために、<br />位置情報を使用します
          </p>
          <button className="gps-prompt-allow" onClick={handleGpsAllow} disabled={gpsDetecting}>
            {gpsDetecting ? "📡 検出中..." : "許可する"}
          </button>
          <button className="gps-prompt-skip" onClick={handleGpsSkip}>
            スキップ
          </button>
        </div>
      </div>
    );
  }

  // 利用規約・プライバシーポリシー
  if (showTerms) {
    return <TermsPage onBack={() => { setShowTerms(false); setShowLogin(true); }} />;
  }
  if (showPrivacy) {
    return <PrivacyPage onBack={() => { setShowPrivacy(false); setShowLogin(true); }} />;
  }

  // ログイン画面を表示（ゲストがログインを要求した場合）
  if (showLogin && !user) {
    return <LoginPage onBack={() => setShowLogin(false)} onShowTerms={() => { setShowLogin(false); setShowTerms(true); }} onShowPrivacy={() => { setShowLogin(false); setShowPrivacy(true); }} />;
  }

  // 未ログイン → ゲストモードでメイン画面
  if (!user) {
    return <MainPage profile={null} onRequestLogin={() => setShowLogin(true)} currentArea={currentArea} onAreaChange={handleAreaChange} messageText={messageText} onMessageTextChange={setMessageText} />;
  }

  // ログイン済み・プロフィール未設定 → プロフィール入力画面
  if (!profile) {
    return <RegisterPage uid={user.uid} onRegistered={(p) => setProfile(p)} />;
  }

  // プロフィール編集画面
  if (showEditProfile) {
    return (
      <RegisterPage
        uid={user.uid}
        existingProfile={profile}
        onRegistered={(p) => { setProfile(p); setShowEditProfile(false); }}
        onCancel={() => setShowEditProfile(false)}
      />
    );
  }

  // 登録済み → メイン画面
  return <MainPage profile={profile} onRequestLogin={() => {}} onLogout={cleanupAnonymous} onEditProfile={() => setShowEditProfile(true)} currentArea={currentArea} onAreaChange={handleAreaChange} messageText={messageText} onMessageTextChange={setMessageText} />;
}

export default App;
