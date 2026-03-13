// NGワードリスト（部分一致でチェック）
const NG_WORDS = [
  // 暴力・脅迫
  "殺す", "殺してやる", "死ね", "殴る", "ぶっ殺",
  // 差別・侮辱
  "ガイジ", "キチガイ", "池沼", "障害者",
  // 詐欺・勧誘
  "儲かる", "稼げる", "LINE交換", "ライン交換",
  "副業", "投資案件", "マルチ",
  // 出会い系・性的
  "セフレ", "ヤれる", "ホテル行こ", "援助",
  // 個人情報誘導
  "電話番号教えて", "住所教えて",
];

// 正規化: 全角→半角、大文字→小文字
function normalize(text: string): string {
  return text
    .replace(/[\uFF01-\uFF5E]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)
    )
    .replace(/\u3000/g, " ")
    .toLowerCase();
}

/**
 * NGワードが含まれていればtrueを返す
 */
export function containsNgWord(text: string): boolean {
  const normalized = normalize(text);
  return NG_WORDS.some((word) => normalized.includes(normalize(word)));
}
