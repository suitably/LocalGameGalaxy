/**
 * TTS Spritesheet CSS Utilities [ID: GAME-TABLETOP-TTS-SPRITESHEET]
 *
 * Provides CSS-based rendering for TTS card spritesheets.
 * Cards in TTS are stored as grids on a single image (e.g. 7×7 = 49 slots).
 * We use CSS background-position to display individual cards without Canvas slicing,
 * which avoids CORS issues with external image URLs.
 */
import type { TTSSpriteRef } from './ttsTypes';

export interface SpriteSheetStyle {
  backgroundImage: string;
  backgroundSize: string;
  backgroundPosition: string;
  backgroundRepeat: string;
}

/**
 * Resolves a TTS CardID into a spritesheet reference.
 *
 * TTS CardID encoding: `deckIndex * 100 + cardIndex`
 * e.g. CardID 1711 → deck "17", card index 11
 */
export function resolveCardSprite(
  cardId: number,
  customDecks: Record<string, { FaceURL: string; NumWidth: number; NumHeight: number }>,
): TTSSpriteRef | null {
  const deckIndex = Math.floor(cardId / 100);
  const cardIndex = cardId % 100;
  const deckKey = String(deckIndex);
  const deck = customDecks[deckKey];
  if (!deck) return null;

  const col = cardIndex % deck.NumWidth;
  const row = Math.floor(cardIndex / deck.NumWidth);

  return {
    url: deck.FaceURL,
    col,
    row,
    numWidth: deck.NumWidth,
    numHeight: deck.NumHeight,
  };
}

/**
 * Generates CSS styles to display a single card from a spritesheet.
 *
 * Uses background-position percentage to select the correct cell.
 * The percentage formula for N cells: position = (index / (N - 1)) * 100%
 * For a single-column/row, position is 0%.
 */
export function getSpriteSheetStyle(sprite: TTSSpriteRef): SpriteSheetStyle {
  const { url, col, row, numWidth, numHeight } = sprite;

  const posX = numWidth > 1 ? (col / (numWidth - 1)) * 100 : 0;
  const posY = numHeight > 1 ? (row / (numHeight - 1)) * 100 : 0;

  return {
    backgroundImage: `url(${url})`,
    backgroundSize: `${numWidth * 100}% ${numHeight * 100}%`,
    backgroundPosition: `${posX}% ${posY}%`,
    backgroundRepeat: 'no-repeat',
  };
}

/**
 * Resolves a back-face sprite for UniqueBack decks.
 * In UniqueBack mode, each card has its own back from the BackURL spritesheet.
 */
export function resolveBackSprite(
  cardId: number,
  customDecks: Record<string, {
    BackURL: string;
    NumWidth: number;
    NumHeight: number;
    UniqueBack?: boolean;
  }>,
): TTSSpriteRef | null {
  const deckIndex = Math.floor(cardId / 100);
  const cardIndex = cardId % 100;
  const deckKey = String(deckIndex);
  const deck = customDecks[deckKey];
  if (!deck || !deck.UniqueBack) return null;

  const col = cardIndex % deck.NumWidth;
  const row = Math.floor(cardIndex / deck.NumWidth);

  return {
    url: deck.BackURL,
    col,
    row,
    numWidth: deck.NumWidth,
    numHeight: deck.NumHeight,
  };
}
