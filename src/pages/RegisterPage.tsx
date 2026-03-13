import { useState, useRef, useEffect } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { uploadImage } from "../lib/cloudinary";
import { AREA_NAMES, findNearestArea, getCurrentPosition } from "../lib/areas";
import type { AgeGroup, Gender, UserProfile } from "../types";

interface Props {
  uid: string;
  onRegistered: (profile: UserProfile) => void;
  existingProfile?: UserProfile;
  onCancel?: () => void;
}

const AGE_GROUPS: AgeGroup[] = ["20代", "30代", "40代", "50代〜"];
const GENDERS: Gender[] = ["男性", "女性", "その他"];

export default function RegisterPage({ uid, onRegistered, existingProfile, onCancel }: Props) {
  const isEdit = !!existingProfile;
  const [nickname, setNickname] = useState(existingProfile?.nickname ?? "");
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(existingProfile?.ageGroup ?? "20代");
  const [gender, setGender] = useState<Gender>(existingProfile?.gender ?? "男性");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(existingProfile?.photoURL ?? null);
  const [area, setArea] = useState(existingProfile?.area ?? "東京");
  const [gpsDetecting, setGpsDetecting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 新規登録時にGPSで最寄りエリアを提案
  useEffect(() => {
    if (isEdit) return;
    setGpsDetecting(true);
    getCurrentPosition()
      .then((pos) => {
        const nearest = findNearestArea(pos.coords.latitude, pos.coords.longitude);
        setArea(nearest);
      })
      .catch(() => {
        // GPS拒否・エラー時は仙台のまま
      })
      .finally(() => setGpsDetecting(false));
  }, [isEdit]);

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
      } else if (isEdit && existingProfile?.photoURL) {
        photoURL = existingProfile.photoURL;
      }

      const profile: UserProfile = {
        uid,
        nickname: nickname.trim(),
        ageGroup,
        gender,
        area,
        photoURL,
        createdAt: isEdit ? existingProfile!.createdAt : Date.now(),
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
      <h1>{isEdit ? "プロフィール編集" : "プロフィール設定"}</h1>
      {!isEdit && <p className="register-subtitle">あなたのことを教えてください</p>}

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
            autoFocus={!isEdit}
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
          <label>エリア {gpsDetecting && <span className="gps-detecting">📡 検出中...</span>}</label>
          <div className="button-group area-group">
            {AREA_NAMES.map((a) => (
              <button
                key={a}
                type="button"
                className={`select-btn ${area === a ? "selected" : ""}`}
                onClick={() => setArea(a)}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="error-message">{error}</p>}

        <button type="submit" className="submit-btn" disabled={submitting}>
          {submitting ? (isEdit ? "保存中..." : "登録中...") : (isEdit ? "保存する" : "はじめる")}
        </button>
        {isEdit && onCancel && (
          <button type="button" className="cancel-btn register-cancel" onClick={onCancel}>
            キャンセル
          </button>
        )}
      </form>
    </div>
  );
}
