import { useState, useEffect, useRef, useCallback } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, getDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import type { UserProfile } from "../types";

const ANON_SESSION_MS = 60 * 60 * 1000; // 1時間

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profileRef = useRef<(UserProfile & { isAnonymous?: boolean }) | null>(null);

  // プロフィールの最新値をrefで保持
  useEffect(() => {
    profileRef.current = profile as (UserProfile & { isAnonymous?: boolean }) | null;
  }, [profile]);

  // 匿名ユーザーのデータをクリーンアップ
  const cleanupAnonymous = useCallback(async () => {
    const uid = profileRef.current?.uid;
    if (!uid) return;

    // drinks コレクションから該当ユーザーのエントリを削除
    const drinksQuery = query(collection(db, "drinks"), where("uid", "==", uid));
    const drinksSnap = await getDocs(drinksQuery);
    const deletePromises = drinksSnap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);

    // users コレクションからプロフィールを削除
    await deleteDoc(doc(db, "users", uid));

    // Firebase Auth アカウントを削除
    const currentUser = auth.currentUser;
    if (currentUser?.isAnonymous) {
      await currentUser.delete();
    } else {
      await signOut(auth);
    }
  }, []);

  // タイマーをリセットする関数
  const resetAnonTimer = useCallback(() => {
    if (!profileRef.current?.isAnonymous) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => cleanupAnonymous(), ANON_SESSION_MS);
  }, []);

  useEffect(() => {
    // プリレンダリング時はFirebase接続をスキップ
    if (navigator.userAgent.includes("ReactSnap")) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const docRef = doc(db, "users", firebaseUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setUser(firebaseUser);
          setProfile(docSnap.data() as UserProfile);
        } else {
          setUser(firebaseUser);
          setProfile(null);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 匿名ユーザーの無操作タイマー
  useEffect(() => {
    const p = profile as (UserProfile & { isAnonymous?: boolean }) | null;
    if (!p?.isAnonymous) return;

    // 初回タイマーセット
    resetAnonTimer();

    // ユーザー操作でタイマーリセット
    const events = ["mousedown", "touchstart", "keydown", "scroll"] as const;
    const handler = () => resetAnonTimer();
    events.forEach((e) => window.addEventListener(e, handler));

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [profile, resetAnonTimer]);

  return { user, profile, setProfile, loading, cleanupAnonymous };
}
