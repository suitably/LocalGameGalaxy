import { serverConfig } from '../../../config';
import { httpsPost } from '../../../utils/http';

export interface UsdbSongResult {
  usdbId: string;
  artist: string;
  title: string;
  genre: string;
  year: string;
  edition: string;
  goldenNotes: string;
  language: string;
  creator: string;
  rating: string;
  views: string;
}

export interface UsdbSearchResult {
  songs: UsdbSongResult[];
  totalResults: number;
  totalPages: number;
}

let USDB_SESSION_COOKIE: string | null = null;

export const getUsdbSessionCookie = (): string | null => USDB_SESSION_COOKIE;
export const setUsdbSessionCookie = (val: string | null): void => {
  USDB_SESSION_COOKIE = val;
};

export async function usdbLogin(username?: string | null, password?: string | null): Promise<string> {
  if (!username || !password) {
    throw new Error('USDB credentials not set. Please provide username and password.');
  }
  const body = new URLSearchParams({ user: username, pass: password, login: 'Login' }).toString();
  const res = await httpsPost('https://usdb.animux.de/index.php?link=login', body);
  if (!res.body.includes('logout')) {
    throw new Error('USDB login failed – check username/password.');
  }
  const cookie = (res.cookies || []).map((c) => c.split(';')[0]).join('; ');
  if (!cookie || !cookie.includes('PHPSESSID')) {
    throw new Error('USDB login failed – session cookie not set.');
  }
  return cookie;
}

export async function getUsdbCookie(forceRefresh = false): Promise<string> {
  if (!serverConfig.usdbUsername || !serverConfig.usdbPassword) {
    throw new Error('USDB credentials not set. Please save your credentials above.');
  }
  if (!USDB_SESSION_COOKIE || forceRefresh) {
    USDB_SESSION_COOKIE = await usdbLogin(serverConfig.usdbUsername, serverConfig.usdbPassword);
  }
  return USDB_SESSION_COOKIE;
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

export function parseUsdbSearch(html: string): UsdbSearchResult {
  const songs: UsdbSongResult[] = [];

  const clean = (s: string): string =>
    s
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim();

  const starCount = (s: string): string => {
    const imgs = (s.match(/star(?:_on|_off)?\.(?:gif|png|jpg)/gi) || []).filter(
      (x) => x.includes('on') || !x.includes('off')
    );
    if (imgs.length) return '★'.repeat(imgs.length);
    const stars = (s.match(/★/g) || []).length;
    return stars ? '★'.repeat(stars) : clean(s).substring(0, 5);
  };

  const getTds = (rowHtml: string): string[] => {
    const tds: string[] = [];
    const re = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let m: RegExpExecArray | null = re.exec(rowHtml);
    while (m !== null) {
      tds.push(m[1]);
      m = re.exec(rowHtml);
    }
    return tds;
  };

  const buildSong = (usdbId: string, tds: string[]): UsdbSongResult | null => {
    let titleIdx = -1;
    for (let i = 0; i < tds.length; i++) {
      if (/[?&]id=\d+/i.test(tds[i]) || /link=detail/i.test(tds[i]) || /view=detail/i.test(tds[i])) {
        titleIdx = i;
        break;
      }
    }
    if (titleIdx <= 0 || titleIdx >= tds.length) {
      return null;
    }

    const artistIdx = titleIdx - 1;
    const artist = clean(tds[artistIdx]);
    const title = clean(tds[titleIdx]);
    if (!artist || !title || artist === 'Artist' || artist === 'Interpret') {
      return null;
    }

    const o = titleIdx;
    return {
      usdbId,
      artist,
      title,
      genre: clean(tds[o + 1] || ''),
      year: clean(tds[o + 2] || ''),
      edition: clean(tds[o + 3] || ''),
      goldenNotes: /yes|ja|true|1/i.test(clean(tds[o + 4] || '')) ? '⭐' : '',
      language: clean(tds[o + 5] || ''),
      creator: clean(tds[o + 6] || ''),
      rating: starCount(tds[o + 7] || ''),
      views: clean(tds[o + 8] || ''),
    };
  };

  // Strategy 1: Find rows matching data-songid attributes
  const dataRe = /<tr[^>]+data-songid="(\d+)"[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null = dataRe.exec(html);
  let usedStrategy1 = false;
  while (m !== null) {
    usedStrategy1 = true;
    const song = buildSong(m[1], getTds(m[2]));
    if (song) songs.push(song);
    m = dataRe.exec(html);
  }

  // Strategy 2: Fallback to rows matching id="entry_XXXX"
  if (!usedStrategy1) {
    const namedRe = /<tr[^>]+id="(?:entry_|row_|song_)(\d+)"[^>]*>([\s\S]*?)<\/tr>/gi;
    m = namedRe.exec(html);
    while (m !== null) {
      usedStrategy1 = true;
      const song = buildSong(m[1], getTds(m[2]));
      if (song) songs.push(song);
      m = namedRe.exec(html);
    }
  }

  // Strategy 3: General fallback checking any <tr> that contains a view=detail link
  if (!usedStrategy1) {
    const anyRowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    m = anyRowRe.exec(html);
    while (m !== null) {
      const rowHtml = m[1];
      const idMatch = rowHtml.match(/view=detail[^"']*[?&]id=(\d+)/i) || rowHtml.match(/[?&]id=(\d+)/);
      if (idMatch) {
        const song = buildSong(idMatch[1], getTds(rowHtml));
        if (song) songs.push(song);
      }
      m = anyRowRe.exec(html);
    }
  }

  const match = html.match(/There are\s+(\d+)\s+results on\s+(\d+)\s+page/i);
  let totalResults = songs.length;
  let totalPages = 1;
  if (match) {
    totalResults = parseInt(match[1], 10);
    totalPages = parseInt(match[2], 10);
  }
  return { songs, totalResults, totalPages };
}

export interface UsdbSearchFilters {
  title?: string;
  artist?: string;
  edition?: string;
  language?: string;
  genre?: string;
  year?: string;
  creator?: string;
  limit?: string;
  order?: string;
  direction?: string;
  golden?: string;
  sc?: string;
  offset?: string;
}

export async function searchUsdb(filters: UsdbSearchFilters): Promise<UsdbSearchResult> {
  let cookie: string;
  try {
    cookie = await getUsdbCookie();
  } catch {
    throw new Error('USDB requires login to search. Please save your credentials above.');
  }

  const {
    title = '',
    artist = '',
    edition = '',
    language = '',
    genre = '',
    year = '',
    creator = '',
    limit = '30',
    order = 'id',
    direction = 'asc',
    golden = '0',
    sc = '0',
    offset = '0',
  } = filters;

  const params = new URLSearchParams({
    interpret: artist,
    title,
    edition,
    language,
    genre,
    year,
    creator,
    user: '',
    order,
    ud: direction,
    limit,
    details: '1',
    start: offset.toString(),
    newsearch: 'Start Search',
    ...(golden === '1' ? { golden: '1' } : {}),
    ...(sc === '1' ? { songcheck: '1' } : {}),
  });

  let res = await httpsPost('https://usdb.animux.de/?link=list', params.toString(), { Cookie: cookie });

  if (res.status === 200 && res.body.includes('You are not logged in')) {
    try {
      cookie = await getUsdbCookie(true);
      res = await httpsPost('https://usdb.animux.de/?link=list', params.toString(), { Cookie: cookie });
    } catch {
      throw new Error('USDB login failed. Please check your credentials.');
    }
  }

  if (res.status !== 200) throw new Error(`USDB search HTTP ${res.status}`);
  if (res.body.includes('You are not logged in')) {
    throw new Error('USDB requires login to search. Please save your credentials above.');
  }
  return parseUsdbSearch(res.body);
}

export async function fetchUsdbTxt(usdbId: string, cookie?: string): Promise<string> {
  const url = `https://usdb.animux.de/?link=gettxt&id=${usdbId}`;
  const body = new URLSearchParams({ wd: '1' }).toString();
  const res = await httpsPost(url, body, cookie ? { Cookie: cookie } : undefined);
  if (res.status !== 200) throw new Error(`USDB txt fetch HTTP ${res.status}`);

  const match = res.body.match(/<textarea[^>]*>([\s\S]*?)<\/textarea>/i);
  if (!match) {
    throw new Error('Could not find lyrics textarea in USDB response. Make sure you are logged in.');
  }
  return stripHtml(match[1]).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}
