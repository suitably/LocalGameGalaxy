/**
 * Validator for publishing Tabletop games via GitHub PR [ID: GAME-TABLETOP-PUBLISH-VALIDATOR]
 */
import type { TabletopGameDefinition } from './types';
import { sanitizeGameSlug } from './gameValidator';

export interface PublishValidationResult {
  valid: boolean;
  errors: string[];
  /** Why publishing is refused outright (shown translated by the dialog). */
  blocked?: 'third_party_import';
}

/**
 * Imported third-party content (TTS Workshop; `importReport` covers imports made before
 * `format` existed). Such games never leave the device as content (TTS plan D4, ADR-0005 §5).
 */
export const isThirdPartyImport = (game: TabletopGameDefinition): boolean =>
  game.format === 'tts-workshop' || game.importReport?.source === 'tts' || !!game.companionPrivate;

export function validateGameForPublishing(game: TabletopGameDefinition): PublishValidationResult {
  if (isThirdPartyImport(game)) {
    return { valid: false, errors: [], blocked: 'third_party_import' };
  }
  const errors: string[] = [];

  if (!game.name || game.name.trim().length < 3) {
    errors.push('Der Spielname muss mindestens 3 Zeichen lang sein.');
  }

  if (!game.description || game.description.trim().length < 10) {
    errors.push('Bitte gib eine aussagekräftige Beschreibung von mindestens 10 Zeichen an.');
  }

  const widgetCount = Object.keys(game.widgets || {}).length;
  if (widgetCount === 0) {
    errors.push('Das Spiel enthält keine Widgets (Karten, Decks oder Felder).');
  }

  if (!game.supportedModes || game.supportedModes.length === 0) {
    errors.push('Mindestens ein Spielmodus (Party, Lokal oder Solo) muss aktiviert sein.');
  }

  const jsonString = JSON.stringify(game);
  if (jsonString.length > 3 * 1024 * 1024) {
    errors.push('Die Spieldatei ist größer als 3 MB. Bitte reduziere die Bildgrößen.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function buildPublishPrPayload(
  game: TabletopGameDefinition,
  authorName: string,
  extraNotes?: string,
) {
  if (isThirdPartyImport(game)) throw new Error('Imported third-party games cannot be published');
  const slug = sanitizeGameSlug(game.name);
  const filePath = `public/games/tabletop/${slug}.json`;
  const fileContent = JSON.stringify(game, null, 2);
  const branchPrefix = `tabletop/add-${slug}`;
  const commitMessage = `feat(tabletop): add community game ${game.name}`;
  const prTitle = `[Tabletop Game] Add ${game.name}`;
  const prBody = [
    `### Neues Community Tabletop Spiel: ${game.name}`,
    '',
    `- **Autor:** ${authorName || game.author || 'Community'}`,
    `- **Spieler:** ${game.minPlayers} - ${game.maxPlayers}`,
    `- **Unterstützte Modi:** ${game.supportedModes.join(', ')}`,
    `- **Beschreibung:** ${game.description}`,
    extraNotes ? `\n**Zusätzliche Hinweise:**\n${extraNotes}` : '',
    '\n*Automatisch eingereicht über LocalGameGalaxy In-App Tabletop Publisher.*',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    slug,
    filePath,
    fileContent,
    branchPrefix,
    commitMessage,
    prTitle,
    prBody,
  };
}
