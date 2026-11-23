/**
 * Draws the round's word and hint from the chosen categories [ID: GAME-IMPOSTER-PICK-WORD]
 */
import { getWordPairsByCategories } from './imposterRepository';
import type { DbCategory, DbWordPair } from './types';

/** `null` when the categories hold no word pairs. */
export async function pickWordPair(
  categories: DbCategory[],
  language: string,
  random = Math.random,
): Promise<{ word: string; hint: string } | null> {
  const pairs = (await getWordPairsByCategories(categories.map((c) => c.id))) as DbWordPair[];
  if (pairs.length === 0) return null;
  const pair = pairs[Math.floor(random() * pairs.length)];
  const [word, hint] = pair.words[language.startsWith('de') ? 'de' : 'en'];
  return { word, hint };
}
