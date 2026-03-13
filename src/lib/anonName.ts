const ADJECTIVES = [
  "元気な", "眠い", "陽気な", "静かな", "勇敢な",
  "優しい", "面白い", "真面目な", "自由な", "大胆な",
  "のんびり", "ワイルドな", "シャイな", "熱い", "クールな",
  "ふわふわ", "ピカピカ", "そわそわ", "てきぱき", "のほほん",
  "孤高の", "伝説の", "さすらいの", "無敵の", "謎の",
  "仮面の", "光る", "笑う", "踊る", "歌う",
];

const NOUNS = [
  // 動物
  "パンダ", "キツネ", "タヌキ", "ペンギン", "コアラ",
  "ネコ", "イヌ", "ウサギ", "カワウソ", "ハリネズミ",
  "フクロウ", "カピバラ", "アルパカ", "ラッコ", "オオカミ",
  // 肩書・職業
  "社長", "勇者", "魔王", "忍者", "侍",
  "博士", "船長", "料理長", "師匠", "大臣",
  "隊長", "番長", "貴族", "騎士", "仙人",
];

export function generateAnonName(uid: string): string {
  // uidからハッシュ値を生成して、同じuidなら同じ名前になるようにする
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = ((hash << 5) - hash + uid.charCodeAt(i)) | 0;
  }
  const adjIdx = Math.abs(hash) % ADJECTIVES.length;
  const nounIdx = Math.abs(hash >> 8) % NOUNS.length;
  return ADJECTIVES[adjIdx] + NOUNS[nounIdx] + "(匿名希望)";
}
