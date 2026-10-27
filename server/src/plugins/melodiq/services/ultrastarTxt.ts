/**
 * Pure UltraStar .txt helpers used by the download pipeline [ID: SERVER-MELODIQ-ULTRASTAR-TXT]
 */

/** True if the text contains at least one note line (`:`, `*`, `F`, `R`, `G` followed by whitespace). */
export function hasNotes(txt?: string | null): boolean {
  return Boolean(txt && txt.split('\n').some((l) => /^[:*FRG]\s/.test(l.trim())));
}

/** Search term without bracketed suffixes like "(Live)" or "[Remastered]" and with collapsed spaces. */
export function cleanSearchTerm(value: string): string {
  return value
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface MediaHeaders {
  /** Value for `#MP3`. */
  mp3: string;
  /** Value for `#VIDEO` (file name or stream URL); omitted when empty. */
  video?: string;
  /** Value for `#COVER`; omitted when undefined. */
  cover?: string;
}

/** True if the text has the headers needed to keep it (otherwise a minimal .txt is written). */
export function hasSongHeaders(txt?: string | null): txt is string {
  return Boolean(txt && (txt.includes('#TITLE') || txt.includes('#ARTIST')));
}

/**
 * Replaces `#MP3`, `#VIDEO`, `#COVER` and `#BACKGROUND` with the downloaded media. The new headers
 * are inserted after the last header line, in that order.
 */
export function rewriteMediaHeaders(txt: string, media: MediaHeaders): string {
  const lines = txt.split('\n').filter((l) => !/^#(MP3|VIDEO|COVER|BACKGROUND):/i.test(l));
  const lastHeaderIdx = lines.reduce((acc, l, i) => (l.startsWith('#') ? i : acc), 0);
  const inserted = [
    `#MP3:${media.mp3}`,
    media.video ? `#VIDEO:${media.video}` : null,
    media.cover !== undefined ? `#COVER:${media.cover}` : null,
  ].filter((l): l is string => l !== null);
  lines.splice(lastHeaderIdx + 1, 0, ...inserted);
  return lines.join('\n');
}

/** The `#VIDEO` value of a .txt ('' when there is none), so a re-download can keep it. */
export function videoHeader(txt?: string | null): string {
  const line = (txt ?? '').split('\n').find((l) => /^#VIDEO:/i.test(l));
  return line ? line.slice('#VIDEO:'.length).trim() : '';
}

/** Minimal playable .txt (no notes) when no lyrics file could be obtained. */
export function buildMinimalTxt(song: { title: string; artist: string } & MediaHeaders): string {
  return [
    `#TITLE:${song.title}`,
    `#ARTIST:${song.artist}`,
    `#MP3:${song.mp3}`,
    song.video ? `#VIDEO:${song.video}` : null,
    song.cover !== undefined ? `#COVER:${song.cover}` : null,
    `#BPM:200`,
    `#GAP:0`,
    `E`,
  ]
    .filter(Boolean)
    .join('\n');
}

/** YouTube video id in a URL, a USDB `v=`/`a=` value or a bare 11-character id. */
export function extractYouTubeId(str?: string | null): string | null {
  if (!str || typeof str !== 'string') return null;
  let decoded = str;
  try {
    if (str.includes('%')) decoded = decodeURIComponent(str);
  } catch {
    // ignore decode error
  }

  const urlMatch = decoded.match(
    /(?:youtube(?:-nocookie)?\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  if (urlMatch) return urlMatch[1];

  const usdbMatch = decoded.match(/(?:^|[,\s])(?:v|a)=([a-zA-Z0-9_-]{11})(?:[,\s]|$)/);
  if (usdbMatch) return usdbMatch[1];

  const trimmed = decoded.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}
