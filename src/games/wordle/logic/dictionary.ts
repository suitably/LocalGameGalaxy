/**
 * dictionary.ts - Guess validation: targets + curated guesses, plus the lazily loaded full
 * Hunspell list once available (see fullDictionary.ts).
 */

import { ENGLISH_ALLOWED_GUESSES, GERMAN_ALLOWED_GUESSES } from './allowedGuesses';
import { getLoadedFullDictionary } from './fullDictionary';
import { ENGLISH_TARGET_WORDS, GERMAN_TARGET_WORDS } from './wordLists';

const buildSet = (...lists: readonly (readonly string[])[]): ReadonlySet<string> =>
  new Set(lists.flat());

const DICTIONARIES = {
  de: buildSet(GERMAN_TARGET_WORDS, GERMAN_ALLOWED_GUESSES),
  en: buildSet(ENGLISH_TARGET_WORDS, ENGLISH_ALLOWED_GUESSES),
};

/**
 * True if the guess is a known word of the language. The current target always counts,
 * so duel words (free-form) stay solvable.
 */
export function isDictionaryWord(guess: string, lang: string, targetWord?: string): boolean {
  const word = guess.trim().toUpperCase();
  if (targetWord && word === targetWord.toUpperCase()) return true;
  if (DICTIONARIES[lang.startsWith('de') ? 'de' : 'en'].has(word)) return true;
  return getLoadedFullDictionary(lang)?.has(word) ?? false;
}
