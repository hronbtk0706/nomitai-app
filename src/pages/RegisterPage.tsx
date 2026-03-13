import { useState, useRef } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { uploadImage } from "../lib/cloudinary";
import type { AgeGroup, Gender, UserProfile } from "../types";

interface Props {
  uid: string;
  onRegistered: (profile: UserProfile) => void;
}

const AGE_GROUPS: AgeGroup[] = ["20代", "30代", "40代", "50代〜"];
const GENDERS: Gender[] = ["男性", "女性", "その他"];

export default function RegisterPage({ uid, onRegistered }: Props) {
  const [nickname, setNickname] = useState("");
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("20代");
  const [gender, setGender] = useState<Gender>("男性");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setError("ニックネームを入力してください");
      return;
    }
    if (nickname.trim().length > 10) {
      setError("ニックネームは10文字以内にしてください");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      let photoURL: string | undefined;
      if (photoFile) {
        photoURL = await uploadImage(photoFile);
      }

      const profile: UserProfile = {
        uid,
        nickname: nickname.trim(),
        ageGroup,
        gender,
        area: "仙台",
        photoURL,
        createdAt: Date.now(),
      };
      await setDoc(doc(db, "users", uid), profile);
      onRegistered(profile);
    } catch (err) {
      setError("登録に失敗しました。もう一度お試しください。");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="register-page">
      <h1>プロフィール設定</h1>
      <p className="register-subtitle">あなたのことを教えてください</p>

      <form onSubmit={handleSubmit} className="register-form">
        {/* プロフィール画像 */}
        <div className="form-group photo-group">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoSelect}
            hidden
          />
          <div className="avatar-upload" onClick={() => fileInputRef.current?.click()}>
            {photoPreview ? (
              <img src={photoPreview} alt="プロフィール" className="avatar-preview" />
            ) : (
              <div className="default-avatar">😊</div>
            )}
            <span className="avatar-edit-badge">📷</span>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="nickname">ニックネーム</label>
          <input
            id="nickname"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="10文字以内"
            maxLength={10}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label>年代</label>
          <div className="button-group">
            {AGE_GROUPS.map((ag) => (
              <button
                key={ag}
                type="button"
                className={`select-btn ${ageGroup === ag ? "selected" : ""}`}
                onClick={() => setAgeGroup(ag)}
              >
                {ag}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>性別</label>
          <div className="button-group">
            {GENDERS.map((g) => (
              <button
                key={g}
                type="button"
                className={`select-btn ${gender === g ? "selected" : ""}`}
                onClick={() => setGender(g)}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>エリア</label>
          <div className="area-display">📍 仙台</div>
        </div>

        {error && <p className="error-message">{error}</p>}

        <button type="submit" className="submit-btn" disabled={submitting}>
          {submitting ? "登録中..." : "はじめる"}
        </button>
      </form>
    </div>
  );
}
