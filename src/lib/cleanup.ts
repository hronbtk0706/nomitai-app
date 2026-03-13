import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "./firebase";

const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6時間に1回だけ実行
const STALE_ANON_MS = 24 * 60 * 60 * 1000; // 24時間以上前の匿名ユーザーを削除
const STALE_DATA_DAYS = 3; // 3日以上前のドリンクデータを削除

/**
 * アプリ起動時に古い匿名ユーザーと古いチャット・ドリンクデータを掃除する。
 * 6時間に1回だけ実行（localStorageでタイムスタンプ管理）。
 */
export async function cleanupStaleData() {
  const lastCleanup = localStorage.getItem("nomitai_last_cleanup");
  if (lastCleanup && Date.now() - Number(lastCleanup) < CLEANUP_INTERVAL_MS) {
    return; // まだ実行間隔内
  }

  try {
    await Promise.all([
      cleanupStaleAnonymousUsers(),
      cleanupOldRoomData(),
    ]);
  } catch (err) {
    console.error("クリーンアップエラー:", err);
  } finally {
    localStorage.setItem("nomitai_last_cleanup", String(Date.now()));
  }
}

/** 24時間以上前に作成された匿名ユーザーのFirestoreデータを削除 */
async function cleanupStaleAnonymousUsers() {
  const cutoff = Date.now() - STALE_ANON_MS;
  const q = query(
    collection(db, "users"),
    where("isAnonymous", "==", true),
    where("createdAt", "<", cutoff)
  );
  const snap = await getDocs(q);
  if (snap.empty) return;

  const promises: Promise<void>[] = [];
  for (const d of snap.docs) {
    const uid = d.data().uid as string;
    // ユーザープロフィール削除
    promises.push(deleteDoc(doc(db, "users", uid)));
    // そのユーザーのdrinks削除
    promises.push(deleteUserDrinks(uid));
  }
  await Promise.all(promises);
}

async function deleteUserDrinks(uid: string) {
  const q = query(collection(db, "drinks"), where("uid", "==", uid));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

/** 3日以上前のドリンクデータを削除（チャットは保持） */
async function cleanupOldRoomData() {
  const cutoffTs = Date.now() - STALE_DATA_DAYS * 24 * 60 * 60 * 1000;

  const drinksQ = query(
    collection(db, "drinks"),
    where("createdAt", "<", cutoffTs)
  );
  const drinksSnap = await getDocs(drinksQ);
  await Promise.all(drinksSnap.docs.map((d) => deleteDoc(d.ref)));
}
