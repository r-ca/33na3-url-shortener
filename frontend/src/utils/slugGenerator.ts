/**
 * ランダムなslugを生成する
 */
export function generateRandomSlug(length: number = 6): string {
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
}

/**
 * より読みやすいランダムslugを生成（数字と小文字のみ）
 */
export function generateSimpleSlug(length: number = 6): string {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
}

/**
 * 単語ベースのランダムslugを生成
 */
export function generateWordSlug(): string {
  const adjectives = ['quick', 'bright', 'calm', 'bold', 'smart', 'cool', 'warm', 'soft', 'hard', 'fast'];
  const nouns = ['cat', 'dog', 'bird', 'fish', 'tree', 'star', 'moon', 'sun', 'rock', 'wave'];
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 100);
  
  return `${adjective}-${noun}-${number}`;
} 