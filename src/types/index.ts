export type AgeGroup = "20代" | "30代" | "40代" | "50代〜";
export type Gender = "男性" | "女性" | "その他";

export interface UserProfile {
  uid: string;
  nickname: string;
  ageGroup: AgeGroup;
  gender: Gender;
  area: string;
  photoURL?: string;
  createdAt: number;
}

export interface WantToDrink {
  uid: string;
  nickname: string;
  ageGroup: AgeGroup;
  gender: Gender;
  createdAt: number;
}

// reactions: { "👍": ["uid1", "uid2"], "😂": ["uid3"] }
export type Reactions = Record<string, string[]>;

export interface ChatMessage {
  id: string;
  uid: string;
  nickname: string; // ニックネーム or "匿名"
  photoURL?: string;
  text: string;
  imageUrl?: string;
  isSystem?: boolean;
  reactions?: Reactions;
  createdAt: number;
}
