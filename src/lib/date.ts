/**
 * 朝5時リセットを考慮した「今日のID」を返す
 * 例: "2026-03-13"
 * 0:00〜4:59は前日扱い
 */
export function getTodayId(): string {
  const now = new Date();
  // 5時間引いて日付を算出（5時リセット対応）
  const adjusted = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  const year = adjusted.getFullYear();
  const month = String(adjusted.getMonth() + 1).padStart(2, "0");
  const day = String(adjusted.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
