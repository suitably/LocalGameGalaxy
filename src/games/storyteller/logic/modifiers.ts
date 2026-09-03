import type {
  BlindModeSettings,
  StoryContextView,
  StoryEntry,
  StoryModifierSettings,
  WordRouletteWordCheck,
} from '../types';

export const DEFAULT_MODIFIER_SETTINGS: StoryModifierSettings = {
  blindMode: {
    enabled: false,
    visibleWordCount: 10,
  },
  timeAttack: {
    enabled: false,
    timeLimitSeconds: 45,
  },
  wordRoulette: {
    enabled: false,
    wordsPerTurn: 3,
  },
};

/**
 * Extracts visible preceding context based on Blind Mode settings.
 */
export const extractPrecedingContext = (
  entries: StoryEntry[],
  settings: BlindModeSettings,
): StoryContextView => {
  if (entries.length === 0) {
    return {
      isBlind: settings.enabled,
      text: '',
      fullHistoryAvailable: !settings.enabled,
    };
  }

  const lastEntry = entries[entries.length - 1];

  if (!settings.enabled) {
    const fullText = entries.map((e) => e.text).join('\n\n');
    return {
      isBlind: false,
      text: fullText,
      precedingAuthorName: lastEntry.authorName,
      precedingTurnNumber: lastEntry.turnNumber,
      fullHistoryAvailable: true,
    };
  }

  const cleanLastText = lastEntry.text.trim();
  const words = cleanLastText.split(/\s+/).filter(Boolean);
  const wordLimit = Math.max(1, settings.visibleWordCount || 10);

  let snippet = '';
  if (words.length <= wordLimit) {
    snippet = cleanLastText;
  } else {
    snippet = '... ' + words.slice(-wordLimit).join(' ');
  }

  return {
    isBlind: true,
    text: snippet,
    precedingAuthorName: lastEntry.authorName,
    precedingTurnNumber: lastEntry.turnNumber,
    fullHistoryAvailable: false,
  };
};

/**
 * Checks if a specific word (or its root) exists within the input text.
 * Robust to hyphens, spaces, and grammatical inflections.
 */
export const checkWordInText = (text: string, targetWord: string): boolean => {
  if (!text || !targetWord) return false;

  const normalizedText = text.toLowerCase();
  const normalizedTarget = targetWord.toLowerCase().trim();

  // Direct match or standard word boundary match
  const escaped = normalizedTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(^|\\b|\\s)${escaped}`, 'i');
  if (regex.test(normalizedText)) {
    return true;
  }

  // Handle hyphenated words (e.g. "U-Boot" / "uboot")
  const strippedText = normalizedText.replace(/[-_]/g, '');
  const strippedTarget = normalizedTarget.replace(/[-_]/g, '');
  if (strippedTarget.length > 2 && strippedText.includes(strippedTarget)) {
    return true;
  }

  // Substring match for compound words (especially common in German like "Piratenschiffskapitän")
  return normalizedText.includes(normalizedTarget);
};

/**
 * Evaluates all required words against the current text.
 */
export const evaluateRouletteWords = (
  text: string,
  requiredWords: string[] = [],
): WordRouletteWordCheck[] => {
  return requiredWords.map((word) => ({
    word,
    matched: checkWordInText(text, word),
  }));
};
