import { useState, useEffect, useRef } from "react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  orderBy,
  updateDoc,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { uploadImage } from "../lib/cloudinary";
import type { UserProfile, WantToDrink, ChatMessage, Reactions } from "../types";
import { getTodayId } from "../lib/date";

interface Props {
  profile: UserProfile | null;
  onRequestLogin: () => void;
  onLogout?: () => Promise<void>;
  messageText: string;
  onMessageTextChange: (text: string) => void;
}

export default function MainPage({ profile, onRequestLogin, onLogout, messageText, onMessageTextChange }: Props) {
  const [drinkList, setDrinkList] = useState<WantToDrink[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [myDrink, setMyDrink] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [drinking, setDrinking] = useState(false);
  const [countBounce, setCountBounce] = useState(false);
  const [reactedKey, setReactedKey] = useState<string | null>(null);
  const [modalImageIndex, setModalImageIndex] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const prevCountRef = useRef(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isGuest = !profile;
  const todayId = getTodayId();

  // 「飲みたい」一覧をリアルタイム購読
  useEffect(() => {
    const q = query(
      collection(db, "drinks"),
      where("dayId", "==", todayId),
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: WantToDrink[] = [];
      let myDocId: string | null = null;
      snapshot.forEach((d) => {
        const data = d.data() as WantToDrink & { dayId: string };
        list.push({ ...data, uid: data.uid });
        if (profile && data.uid === profile.uid) {
          myDocId = d.id;
        }
      });
      setDrinkList(list);
      setMyDrink(myDocId);
    });
    return () => unsubscribe();
  }, [todayId, profile?.uid]);

  // 飲みたい人数の変化を検知してアニメーション
  useEffect(() => {
    if (drinkList.length > prevCountRef.current) {
      setCountBounce(true);
      setTimeout(() => setCountBounce(false), 600);
    }
    prevCountRef.current = drinkList.length;
  }, [drinkList.length]);

  // チャットをリアルタイム購読
  useEffect(() => {
    const q = query(
      collection(db, "chats"),
      where("dayId", "==", todayId),
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach((d) => {
        msgs.push({ id: d.id, ...d.data() } as ChatMessage);
      });
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [todayId]);

  // チャット自動スクロール
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ゲストがアクションしようとしたときのチェック
  const requireLogin = (): boolean => {
    if (!isGuest) return false;
    if (confirm("ログインしてチャットに参加しよう！\nログイン画面に移動しますか？")) {
      onRequestLogin();
    }
    return true;
  };

  // 「飲みたい」を表明
  const handleDrink = async () => {
    if (requireLogin()) return;
    if (drinking || myDrink || !profile) return;
    setDrinking(true);
    try {
      await addDoc(collection(db, "drinks"), {
        uid: profile.uid,
        nickname: profile.nickname,
        ageGroup: profile.ageGroup,
        gender: profile.gender,
        dayId: todayId,
        createdAt: Date.now(),
      });
    } catch (err) {
      console.error("飲みたい表明に失敗:", err);
    } finally {
      setDrinking(false);
    }
  };

  // 「飲みたい」を取り消し
  const handleCancel = async () => {
    if (!myDrink) return;
    try {
      await deleteDoc(doc(db, "drinks", myDrink));
    } catch (err) {
      console.error("取り消しに失敗:", err);
    }
  };

  // 画像選択
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("画像ファイルを選択してください");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("10MB以下の画像を選択してください");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // チャット送信
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requireLogin()) return;
    if ((!messageText.trim() && !imageFile) || sending || !profile) return;

    setSending(true);
    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const chatData: Record<string, unknown> = {
        uid: profile.uid,
        nickname: profile.nickname,
        text: messageText.trim(),
        dayId: todayId,
        createdAt: Date.now(),
      };
      if (profile.photoURL) chatData.photoURL = profile.photoURL;
      if (imageUrl) chatData.imageUrl = imageUrl;

      await addDoc(collection(db, "chats"), chatData);
      onMessageTextChange("");
      clearImage();
    } catch (err) {
      console.error("送信に失敗:", err);
    } finally {
      setSending(false);
    }
  };

  // リアクション
  const REACTION_EMOJIS = ["👍", "😂", "🍺", "❤️", "👀"];

  const handleToggleReaction = async (msgId: string, emoji: string) => {
    if (requireLogin()) return;
    if (!profile) return;

    const msg = messages.find((m) => m.id === msgId);
    if (!msg) return;

    const reactions: Reactions = msg.reactions ? { ...msg.reactions } : {};
    const uids = reactions[emoji] ? [...reactions[emoji]] : [];

    const isAdding = !uids.includes(profile.uid);
    if (isAdding) {
      reactions[emoji] = [...uids, profile.uid];
    } else {
      reactions[emoji] = uids.filter((uid) => uid !== profile.uid);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    }

    // アニメーショントリガー（追加時のみ）
    if (isAdding) {
      const key = `${msgId}-${emoji}`;
      setReactedKey(key);
      setTimeout(() => setReactedKey(null), 500);
    }

    await updateDoc(doc(db, "chats", msgId), { reactions });
  };

  // チャット内の全画像URL一覧
  const imageUrls = messages.filter((m) => m.imageUrl).map((m) => m.imageUrl!);

  const openImageModal = (url: string) => {
    const idx = imageUrls.indexOf(url);
    setModalImageIndex(idx >= 0 ? idx : 0);
  };

  // メッセージ長押し削除
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMessagePressStart = (msg: ChatMessage) => {
    if (isGuest || msg.uid !== profile!.uid) return;
    longPressTimer.current = setTimeout(async () => {
      if (confirm("このメッセージを削除しますか？")) {
        await deleteDoc(doc(db, "chats", msg.id));
      }
    }, 500);
  };

  const handleMessagePressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const isAnonymous = !!(profile as UserProfile & { isAnonymous?: boolean })?.isAnonymous;

  const handleLogout = async () => {
    if (isAnonymous) {
      const ok = confirm(
        "匿名モードのため、ログアウトするとアカウントは削除され元に戻せません。\nよろしいですか？"
      );
      if (!ok) return;
      await onLogout?.();
    } else {
      const ok = confirm("ログアウトしますか？");
      if (!ok) return;
      await signOut(auth);
    }
  };

  return (
    <div className="main-page">
      {/* ヘッダー */}
      <header className="header">
        <span className="area-badge">📍 仙台</span>
        {isGuest ? (
          <button className="login-header-btn" onClick={onRequestLogin}>
            ログイン
          </button>
        ) : (
          <div className="header-right">
            {profile.photoURL ? (
              <img src={profile.photoURL} alt="" className="header-avatar" />
            ) : (
              <span className="header-avatar-default">😊</span>
            )}
            <span className="user-badge">{profile.nickname}</span>
            <button className="logout-btn" onClick={handleLogout}>
              ログアウト
            </button>
          </div>
        )}
      </header>

      {/* 飲みたい一覧 */}
      <section className="drink-section">
        <h2 className={`drink-count ${countBounce ? "bounce" : ""}`}>
          🍺 今夜飲みたい人：<span className="count-number">
            {countBounce && (
              <>
                <span className="ray ray1" />
                <span className="ray ray2" />
                <span className="ray ray3" />
              </>
            )}
            {drinkList.length}
          </span>人
        </h2>
        {drinkList.length === 0 && (
          <p className="empty-message">まだ誰もいません。最初の一人になろう！</p>
        )}

        {/* 飲みたいボタン / 取り消しボタン */}
        {!isGuest && myDrink ? (
          <button className="cancel-btn" onClick={handleCancel}>
            取り消す
          </button>
        ) : (
          <button
            className="drink-btn"
            onClick={handleDrink}
            disabled={!isGuest && drinking}
          >
            🍺 飲みたい
          </button>
        )}
      </section>

      {/* チャット */}
      <section className="chat-section">
        <h2>チャット</h2>
        <div className="chat-messages">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`chat-message ${!isGuest && msg.uid === profile.uid ? "mine" : ""}`}
              onMouseDown={() => handleMessagePressStart(msg)}
              onMouseUp={handleMessagePressEnd}
              onMouseLeave={handleMessagePressEnd}
              onTouchStart={() => handleMessagePressStart(msg)}
              onTouchEnd={handleMessagePressEnd}
            >
              <div className="chat-nickname">{msg.nickname}</div>
              <div className="chat-body">
                {msg.photoURL ? (
                  <img src={msg.photoURL} alt="" className="chat-avatar" />
                ) : (
                  <span className="chat-avatar-default">😊</span>
                )}
                <div className="chat-bubble">
                  {msg.text && <div className="chat-text">{msg.text}</div>}
                  {msg.imageUrl && (
                    <img
                      src={msg.imageUrl}
                      alt="送信画像"
                      className="chat-image"
                      onClick={() => openImageModal(msg.imageUrl!)}
                    />
                  )}
                </div>
                <span className="chat-time">
                  {new Date(msg.createdAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              {/* リアクションバー */}
              <div className="reaction-bar">
                {REACTION_EMOJIS.map((emoji) => {
                  const uids = msg.reactions?.[emoji] || [];
                  const count = uids.length;
                  const reacted = !isGuest && uids.includes(profile.uid);
                  const justReacted = reactedKey === `${msg.id}-${emoji}`;
                  return (
                    <button
                      key={emoji}
                      className={`reaction-btn ${count > 0 ? "has-count" : ""} ${reacted ? "reacted" : ""} ${justReacted ? "pop" : ""}`}
                      onClick={() => handleToggleReaction(msg.id, emoji)}
                    >
                      {justReacted && (
                        <>
                          <span className="reaction-ray r1" />
                          <span className="reaction-ray r2" />
                          <span className="reaction-ray r3" />
                        </>
                      )}
                      {emoji}{count > 0 && <span className="reaction-count">{count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <p className="empty-message">まだメッセージがありません</p>
          )}
          <div ref={chatEndRef} />
        </div>

        {imagePreview && (
          <div className="image-preview">
            <img src={imagePreview} alt="プレビュー" />
            <button className="image-preview-close" onClick={clearImage} type="button">✕</button>
          </div>
        )}

        <form className="chat-form" onSubmit={handleSendMessage}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            hidden
          />
          <button
            type="button"
            className="image-attach-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            📷
          </button>
          <input
            type="text"
            value={messageText}
            onChange={(e) => onMessageTextChange(e.target.value)}
            placeholder="メッセージを入力"
            maxLength={200}
          />
          <button type="submit" disabled={sending || (!messageText.trim() && !imageFile)}>
            {sending ? "..." : "送信"}
          </button>
        </form>
      </section>
      {modalImageIndex !== null && imageUrls[modalImageIndex] && (
        <div
          className="image-modal-overlay"
          onClick={() => setModalImageIndex(null)}
          onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;
            const diff = e.changedTouches[0].clientX - touchStartX.current;
            if (diff < -50 && modalImageIndex < imageUrls.length - 1) {
              setModalImageIndex(modalImageIndex + 1);
            } else if (diff > 50 && modalImageIndex > 0) {
              setModalImageIndex(modalImageIndex - 1);
            }
            touchStartX.current = null;
          }}
        >
          {modalImageIndex > 0 && (
            <button
              className="modal-nav modal-nav-prev"
              onClick={(e) => { e.stopPropagation(); setModalImageIndex(modalImageIndex - 1); }}
            >
              ‹
            </button>
          )}
          <img
            src={imageUrls[modalImageIndex]}
            alt="拡大画像"
            className="image-modal-img"
            onClick={(e) => e.stopPropagation()}
          />
          {modalImageIndex < imageUrls.length - 1 && (
            <button
              className="modal-nav modal-nav-next"
              onClick={(e) => { e.stopPropagation(); setModalImageIndex(modalImageIndex + 1); }}
            >
              ›
            </button>
          )}
          <span className="modal-counter">
            {modalImageIndex + 1} / {imageUrls.length}
          </span>
        </div>
      )}
    </div>
  );
}
