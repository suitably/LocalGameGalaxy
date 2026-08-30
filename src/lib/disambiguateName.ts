/**
 * Ensures a player name is unique among a list of existing players.
 * If the name is already taken by another player (case-insensitive),
 * it appends a numeric suffix like "(2)", "(3)", etc.
 */
export function ensureUniquePlayerName(
  desiredName: string,
  existingPlayers: Array<{ id: string; name: string }>,
  currentPlayerId?: string,
): string {
  const baseName = desiredName.trim() || 'Spieler';
  const otherPlayerNames = existingPlayers
    .filter((p) => !currentPlayerId || p.id !== currentPlayerId)
    .map((p) => p.name.trim().toLowerCase());

  if (!otherPlayerNames.includes(baseName.toLowerCase())) {
    return baseName;
  }

  // Strip existing (N) suffix if present to find the root name
  const rootMatch = baseName.match(/^(.*?)(?:\s*\(\d+\))?$/);
  const root = rootMatch && rootMatch[1] ? rootMatch[1].trim() : baseName;

  let counter = 2;
  while (otherPlayerNames.includes(`${root} (${counter})`.toLowerCase())) {
    counter++;
  }

  return `${root} (${counter})`;
}
