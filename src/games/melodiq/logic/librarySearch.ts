/**
 * Library search over room events [ID: GAME-MELODIQ-LIBRARY-SEARCH]
 *
 * A phone asks the host's song list with `library.search` (room events channel, phone to host);
 * the host answers only that phone with `library.results` (`to` = the request's `from`, same
 * `reqId`). The phone keeps just the reply of its latest request.
 */
import type { SongMeta } from '../db';

export const LIBRARY_SEARCH_LIMIT = 50;

export interface LibrarySearchFilters {
  genre?: string;
  /** Exact year (`2010`) or decade (`2010s`). */
  year?: string | number;
  language?: string;
}

/** A song as sent to a phone (no file references). */
export interface LibrarySearchResult {
  id: string;
  title: string;
  artist: string;
  year?: SongMeta['year'];
  genre?: SongMeta['genre'];
  language?: SongMeta['language'];
}

export interface LibrarySearchEvent {
  type: 'library.search';
  /** Phone device id. */
  from: string;
  reqId: string;
  query: string;
  filters: LibrarySearchFilters;
}

export interface LibraryResultsEvent {
  type: 'library.results';
  /** Host id. */
  from: string;
  /** The request's `from`; other devices ignore the event. */
  to: string;
  reqId: string;
  results: LibrarySearchResult[];
}

export type LibraryEvent = LibrarySearchEvent | LibraryResultsEvent;

const nonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

/** Filters the song list: genre, year/decade, language, then title/artist text (all case-insensitive). */
export function searchLibrary(
  songs: SongMeta[],
  query: string,
  filters: LibrarySearchFilters = {},
): LibrarySearchResult[] {
  const q = (query || '').toLowerCase();
  let results = songs;

  if (filters.genre && filters.genre !== 'All') {
    const genre = filters.genre.toLowerCase();
    results = results.filter((s) => s.genre && s.genre.toLowerCase() === genre);
  }
  if (filters.year && filters.year !== 'All') {
    // Decades: 2010s -> years starting with 201; otherwise exact match.
    const yearStr = String(filters.year);
    if (yearStr.endsWith('s')) {
      const prefix = yearStr.substring(0, 3);
      results = results.filter((s) => s.year && String(s.year).startsWith(prefix));
    } else {
      results = results.filter((s) => s.year && String(s.year) === yearStr);
    }
  }
  if (filters.language && filters.language !== 'All') {
    const language = filters.language.toLowerCase();
    results = results.filter((s) => s.language && s.language.toLowerCase() === language);
  }
  if (q) {
    results = results.filter(
      (s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q),
    );
  }

  return results.slice(0, LIBRARY_SEARCH_LIMIT).map((s) => ({
    id: s.id,
    title: s.title,
    artist: s.artist,
    year: s.year,
    genre: s.genre,
    language: s.language,
  }));
}

/** Narrows a received room event to a search request, or null. */
export function parseLibrarySearch(data: unknown): LibrarySearchEvent | null {
  if (!data || typeof data !== 'object') return null;
  const msg = data as Record<string, unknown>;
  if (msg.type !== 'library.search') return null;
  if (!nonEmptyString(msg.reqId) || !nonEmptyString(msg.from)) return null;
  const filters =
    msg.filters && typeof msg.filters === 'object' ? (msg.filters as LibrarySearchFilters) : {};
  return {
    type: 'library.search',
    from: msg.from,
    reqId: msg.reqId,
    query: typeof msg.query === 'string' ? msg.query : '',
    filters,
  };
}

/** Narrows a received room event to a search reply, or null. */
export function parseLibraryResults(data: unknown): LibraryResultsEvent | null {
  if (!data || typeof data !== 'object') return null;
  const msg = data as Record<string, unknown>;
  if (msg.type !== 'library.results') return null;
  if (!nonEmptyString(msg.reqId) || !nonEmptyString(msg.to) || !Array.isArray(msg.results)) {
    return null;
  }
  return {
    type: 'library.results',
    from: typeof msg.from === 'string' ? msg.from : '',
    to: msg.to,
    reqId: msg.reqId,
    results: msg.results as LibrarySearchResult[],
  };
}

export interface LibrarySearchHostDeps {
  getSongs: () => SongMeta[];
  send: (event: LibraryResultsEvent) => void;
  selfId: string;
}

/** Host handler: ignores everything but a valid `library.search`; answers its sender only. */
export function handleLibrarySearchEvent(event: unknown, deps: LibrarySearchHostDeps): void {
  const rpc = parseLibrarySearch(event);
  if (!rpc) return;
  deps.send({
    type: 'library.results',
    from: deps.selfId,
    to: rpc.from,
    reqId: rpc.reqId,
    results: searchLibrary(deps.getSongs(), rpc.query, rpc.filters),
  });
}

export interface LibrarySearchPhoneDeps {
  selfId: string;
  /** The `reqId` of the phone's latest request, or null if none. */
  getLatestReqId: () => string | null;
  onResults: (results: LibrarySearchResult[]) => void;
}

/** Phone handler: keeps a reply only if it is for this phone and its latest request. */
export function handleLibraryResultsEvent(event: unknown, deps: LibrarySearchPhoneDeps): void {
  const reply = parseLibraryResults(event);
  if (!reply || reply.to !== deps.selfId || reply.reqId !== deps.getLatestReqId()) return;
  deps.onResults(reply.results);
}
