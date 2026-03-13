import { useState, useEffect, useRef } from "react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
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
import { AREA_NAMES } from "../lib/areas";
import { containsNgWord } from "../lib/ngWords";

interface Props {
  profile: UserProfile | null;
  onRequestLogin: () => void;
  onLogout?: () => Promise<void>;
  onEditProfile?: () => void;
  currentArea: string;
  onAreaChange: (area: string) => void;
  messageText: string;
  onMessageTextChange: (text: string) => void;
}

export default function MainPage({ profile, onRequestLogin, onLogout, onEditProfile, currentArea, onAreaChange, messageText, onMessageTextChange }: Props) {
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
  const prevMsgCountRef = useRef(0);

  const [profileMap, setProfileMap] = useState<Record<string, { photoURL?: string }>>({});
  const [showAreaSelector, setShowAreaSelector] = useState(false);
  const [areaDrinkCounts, setAreaDrinkCounts] = useState<Record<string, number>>({});
  const [reportedMsgIds, setReportedMsgIds] = useState<Set<string>>(new Set());
  const lastSendTime = useRef(0);

  // FABドラッグ
  const [fabPos, setFabPos] = useState(() => {
    const saved = localStorage.getItem("nomitai_fab_pos");
    if (saved) {
      try { return JSON.parse(saved) as { x: number; y: number }; } catch { /* ignore */ }
    }
    return { x: window.innerWidth - 76, y: window.innerHeight - 140 };
  });
  const fabDrag = useRef<{ startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null);

  const isGuest = !profile;
  const todayId = getTodayId();
  const roomId = `${currentArea}_${todayId}`;

  // 「飲みたい」一覧をリアルタイム購読
  useEffect(() => {
    const q = query(
      collection(db, "drinks"),
      where("dayId", "==", roomId),
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
  }, [roomId, profile?.uid]);

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
      where("dayId", "==", roomId),
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
  }, [roomId]);

  // チャット自動スクロール（メッセージ追加時のみ）
  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMsgCountRef.current = messages.length;
  }, [messages.length]);

  // 総登録者数（匿名を除く）
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  useEffect(() => {
    if (!profile) return;
    getDocs(collection(db, "users")).then((snap) => {
      let count = 0;
      snap.forEach((d) => {
        if (!d.data().isAnonymous) count++;
      });
      setTotalUsers(count);
    }).catch((err) => {
      console.error("ユーザー数取得エラー:", err);
    });
  }, [profile]);

  // エリアセレクター表示時に全エリアの飲みたい人数を取得
  useEffect(() => {
    if (!showAreaSelector) return;
    const fetchCounts = async () => {
      const counts: Record<string, number> = {};
      for (const area of AREA_NAMES) {
        const areaRoomId = `${area}_${todayId}`;
        const q = query(
          collection(db, "drinks"),
          where("dayId", "==", areaRoomId)
        );
        const snap = await getDocs(q);
        counts[area] = snap.size;
      }
      setAreaDrinkCounts(counts);
    };
    fetchCounts();
  }, [showAreaSelector, todayId]);

  // チャット参加者のプロフィール画像を取得
  useEffect(() => {
    const uids = [...new Set(messages.map((m) => m.uid))];
    const missing = uids.filter((uid) => !(uid in profileMap));
    if (missing.length === 0) return;
    missing.forEach(async (uid) => {
      try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) {
          const data = snap.data() as { photoURL?: string };
          setProfileMap((prev) => ({ ...prev, [uid]: { photoURL: data.photoURL } }));
        } else {
          setProfileMap((prev) => ({ ...prev, [uid]: {} }));
        }
      } catch {
        setProfileMap((prev) => ({ ...prev, [uid]: {} }));
      }
    });
  }, [messages]);

  // 自分のプロフィール変更をキャッシュに反映
  useEffect(() => {
    if (!profile) return;
    setProfileMap((prev) => ({ ...prev, [profile.uid]: { photoURL: profile.photoURL } }));
  }, [profile?.uid, profile?.photoURL]);

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
      const now = Date.now();
      await addDoc(collection(db, "drinks"), {
        uid: profile.uid,
        nickname: profile.nickname,
        ageGroup: profile.ageGroup,
        gender: profile.gender,
        dayId: roomId,
        createdAt: now,
      });
      await addDoc(collection(db, "chats"), {
        uid: profile.uid,
        nickname: profile.nickname,
        text: `🍺 ${profile.nickname}さんが「飲みたい！」を押しました`,
        isSystem: true,
        dayId: roomId,
        createdAt: now + 1,
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

    // NGワードチェック
    if (messageText.trim() && containsNgWord(messageText)) {
      alert("不適切な表現が含まれています。内容を修正してください。");
      return;
    }

    // スパム防止（3秒間隔）
    const now = Date.now();
    if (now - lastSendTime.current < 3000) {
      alert("メッセージの送信間隔が短すぎます。少し待ってから送信してください。");
      return;
    }

    setSending(true);
    try {
      lastSendTime.current = Date.now();
      let imageUrl: string | undefined;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const chatData: Record<string, unknown> = {
        uid: profile.uid,
        nickname: profile.nickname,
        text: messageText.trim(),
        dayId: roomId,
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

  // 通報
  const handleReport = async (msg: ChatMessage) => {
    if (isGuest || !profile) return;
    if (reportedMsgIds.has(msg.id)) {
      alert("このメッセージは既に通報済みです。");
      return;
    }
    if (!confirm("このメッセージを不適切として通報しますか？")) return;
    try {
      await addDoc(collection(db, "reports"), {
        messageId: msg.id,
        messageText: msg.text,
        messageUid: msg.uid,
        messageNickname: msg.nickname,
        reporterUid: profile.uid,
        dayId: roomId,
        createdAt: Date.now(),
      });
      setReportedMsgIds((prev) => new Set(prev).add(msg.id));
      alert("通報を受け付けました。ご協力ありがとうございます。");
    } catch (err) {
      console.error("通報に失敗:", err);
    }
  };

  // メッセージ長押し削除
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMessagePressStart = (msg: ChatMessage) => {
    if (isGuest) return;
    longPressTimer.current = setTimeout(async () => {
      if (msg.uid === profile!.uid) {
        if (confirm("このメッセージを削除しますか？")) {
          await deleteDoc(doc(db, "chats", msg.id));
        }
      } else {
        handleReport(msg);
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

  // FABドラッグハンドラ
  const clampFab = (x: number, y: number) => ({
    x: Math.max(0, Math.min(x, window.innerWidth - 56)),
    y: Math.max(0, Math.min(y, window.innerHeight - 56)),
  });

  const handleFabPointerDown = (e: React.PointerEvent) => {
    fabDrag.current = { startX: e.clientX, startY: e.clientY, origX: fabPos.x, origY: fabPos.y, moved: false };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleFabPointerMove = (e: React.PointerEvent) => {
    if (!fabDrag.current) return;
    const dx = e.clientX - fabDrag.current.startX;
    const dy = e.clientY - fabDrag.current.startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) fabDrag.current.moved = true;
    if (fabDrag.current.moved) {
      setFabPos(clampFab(fabDrag.current.origX + dx, fabDrag.current.origY + dy));
    }
  };

  const handleFabPointerUp = () => {
    if (fabDrag.current) {
      if (fabDrag.current.moved) {
        localStorage.setItem("nomitai_fab_pos", JSON.stringify(fabPos));
      }
      const wasDrag = fabDrag.current.moved;
      fabDrag.current = null;
      if (wasDrag) return; // ドラッグ時はクリック発火しない
    }
  };

  const handleFabClick = () => {
    if (fabDrag.current?.moved) return;
    if (myDrink) {
      handleCancel();
    } else {
      handleDrink();
    }
  };

  return (
    <div className="main-page">
      {/* ヘッダー */}
      <header className="header">
        <button className="area-badge" onClick={() => setShowAreaSelector(true)}>📍 {currentArea} ▾</button>
        {totalUsers !== null && <span className="header-stats">👥 {totalUsers}</span>}
        <div className="header-right">
          {isGuest ? (
            <button className="login-header-btn" onClick={onRequestLogin}>
              ログイン
            </button>
          ) : (
            <>
              <button className="header-edit-btn" onClick={onEditProfile} title="プロフィール編集">
                ✏️
              </button>
              <button className="logout-btn" onClick={handleLogout}>
                ログアウト
              </button>
            </>
          )}
        </div>
      </header>

      {/* チャット */}
      <section className="chat-section">
        <div className="chat-messages">
          {messages.map((msg) => {
            if (msg.isSystem) {
              return (
                <div key={msg.id} className="system-message">
                  <span className="system-text">{msg.text}</span>
                </div>
              );
            }
            const avatarUrl = profileMap[msg.uid]?.photoURL || msg.photoURL;
            return (
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
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="chat-avatar" />
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
          );
          })}
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
          <div className="chat-input-wrapper">
            {!isGuest && !messageText && (
              <span className="chat-input-label">{profile.nickname} としてメッセージを送信</span>
            )}
            <input
              type="text"
              value={messageText}
              onChange={(e) => onMessageTextChange(e.target.value)}
              placeholder={isGuest ? "メッセージを入力" : ""}
              maxLength={200}
            />
          </div>
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
      {showAreaSelector && (
        <div className="area-selector-overlay" onClick={() => setShowAreaSelector(false)}>
          <div className="area-selector" onClick={(e) => e.stopPropagation()}>
            <h3>エリアを選択</h3>
            <div className="area-selector-list">
              {AREA_NAMES.map((a) => (
                <button
                  key={a}
                  className={`area-selector-item ${currentArea === a ? "active" : ""}`}
                  onClick={() => { onAreaChange(a); setShowAreaSelector(false); }}
                >
                  📍 {a}
                  {(areaDrinkCounts[a] ?? 0) > 0 && (
                    <span className="area-drink-count">🍺 {areaDrinkCounts[a]}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* 飲みたいFAB */}
      <button
        className={`drink-fab ${myDrink ? "active" : ""} ${countBounce ? "bounce" : ""}`}
        style={{ left: fabPos.x, top: fabPos.y, right: "auto", bottom: "auto" }}
        onClick={handleFabClick}
        onPointerDown={handleFabPointerDown}
        onPointerMove={handleFabPointerMove}
        onPointerUp={handleFabPointerUp}
        disabled={!isGuest && drinking}
      >
        🍺
        {drinkList.length > 0 && (
          <span className="drink-fab-badge">{drinkList.length}</span>
        )}
      </button>
    </div>
  );
}
