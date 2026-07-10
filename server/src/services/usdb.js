const config = require('../../config');
const { httpsPost } = require('../utils/http');

let USDB_SESSION_COOKIE = null;

const getUsdbSessionCookie = () => USDB_SESSION_COOKIE;
const setUsdbSessionCookie = (val) => { USDB_SESSION_COOKIE = val; };

async function getUsdbCookie(forceRefresh = false) {
    if (!config.usdbUsername || !config.usdbPassword) {
        throw new Error('USDB credentials not set. Please save your credentials above.');
    }
    if (!USDB_SESSION_COOKIE || forceRefresh) {
        USDB_SESSION_COOKIE = await usdbLogin(config.usdbUsername, config.usdbPassword);
    }
    return USDB_SESSION_COOKIE;
}

async function usdbLogin(username, password) {
    // Login via POST to index.php?link=login
    const body = new URLSearchParams({ user: username, pass: password, login: 'Login' }).toString();
    const res = await httpsPost('https://usdb.animux.de/index.php?link=login', body);
    if (!res.body.includes('logout')) {
        throw new Error('USDB login failed – check username/password.');
    }
    const cookie = (res.cookies || []).map(c => c.split(';')[0]).join('; ');
    if (!cookie || !cookie.includes('PHPSESSID')) {
        throw new Error('USDB login failed – session cookie not set.');
    }
    return cookie;
}

/**
 * Strips HTML tags and decodes common HTML entities from a string.
 * Used to clean lyrics text fetched from USDB textareas.
 * 
 * @param {string} s - Raw HTML/Text string.
 * @returns {string} Cleaned plain-text string.
 */
function stripHtml(s) {
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

/**
 * Scrapes and parses the HTML of the USDB list page to extract search results.
 * 
 * ## Table Structure and Parsing Offsets
 * The scraper dynamically finds the index of the column containing the song's title
 * by searching for detail links (like `?id=123`). This index acts as the anchor `titleIdx`.
 * 
 * Mappings relative to the title index:
 * - `titleIdx - 1` : Artist name
 * - `titleIdx`     : Song Title
 * - `titleIdx + 1` : Genre
 * - `titleIdx + 2` : Year
 * - `titleIdx + 3` : Edition
 * - `titleIdx + 4` : Golden Notes boolean check
 * - `titleIdx + 5` : Language
 * - `titleIdx + 6` : Creator / Uploader
 * - `titleIdx + 7` : Rating (GIF stars or unicode stars)
 * - `titleIdx + 8` : View count
 * 
 * @param {string} html - Raw HTML from USDB list request.
 * @returns {Object} Result object containing:
 *   - songs {Array} Array of parsed song objects.
 *   - totalResults {number} Total results reported by USDB.
 *   - totalPages {number} Total pages of results.
 */
function parseUsdbSearch(html) {
    const songs = [];

    /** Cleans and trims HTML entities. */
    const clean = (s) => s
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
        .trim();

    /** Parses rating column images or unicode symbols to generate a star string. */
    const starCount = (s) => {
        const imgs = (s.match(/star(?:_on|_off)?\.(?:gif|png|jpg)/gi) || []).filter(x => x.includes('on') || !x.includes('off'));
        if (imgs.length) return '★'.repeat(imgs.length);
        const stars = (s.match(/★/g) || []).length;
        return stars ? '★'.repeat(stars) : clean(s).substring(0, 5);
    };

    /** Extracts content of all <td> elements in a row. */
    const getTds = (rowHtml) => {
        const tds = [];
        const re = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        let m;
        while ((m = re.exec(rowHtml)) !== null) tds.push(m[1]);
        return tds;
    };

    /** Constructs a song object from td elements using anchor-relative offsets. */
    const buildSong = (usdbId, tds) => {
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
        const title  = clean(tds[titleIdx]);
        if (!artist || !title || artist === 'Artist' || artist === 'Interpret') {
            return null;
        }

        const o = titleIdx;
        return {
            usdbId,
            artist,
            title,
            genre:       clean(tds[o + 1] || ''),
            year:        clean(tds[o + 2] || ''),
            edition:     clean(tds[o + 3] || ''),
            goldenNotes: /yes|ja|true|1/i.test(clean(tds[o + 4] || '')) ? '⭐' : '',
            language:    clean(tds[o + 5] || ''),
            creator:     clean(tds[o + 6] || ''),
            rating:      starCount(tds[o + 7] || ''),
            views:       clean(tds[o + 8] || ''),
        };
    };

    // Strategy 1: Find rows matching data-songid attributes
    const dataRe = /<tr[^>]+data-songid="(\d+)"[^>]*>([\s\S]*?)<\/tr>/gi;
    let m;
    let usedStrategy1 = false;
    while ((m = dataRe.exec(html)) !== null) {
        usedStrategy1 = true;
        const song = buildSong(m[1], getTds(m[2]));
        if (song) songs.push(song);
    }

    // Strategy 2: Fallback to rows matching id="entry_XXXX"
    if (!usedStrategy1) {
        const namedRe = /<tr[^>]+id="(?:entry_|row_|song_)(\d+)"[^>]*>([\s\S]*?)<\/tr>/gi;
        while ((m = namedRe.exec(html)) !== null) {
            usedStrategy1 = true;
            const song = buildSong(m[1], getTds(m[2]));
            if (song) songs.push(song);
        }
    }

    // Strategy 3: General fallback checking any <tr> that contains a view=detail link
    if (!usedStrategy1) {
        const anyRowRe = /<tr[^]*>([\s\S]*?)<\/tr>/gi;
        while ((m = anyRowRe.exec(html)) !== null) {
            const rowHtml = m[1];
            const idMatch = rowHtml.match(/view=detail[^"']*[?&]id=(\d+)/i)
                         || rowHtml.match(/[?&]id=(\d+)/);
            if (!idMatch) continue;
            const song = buildSong(idMatch[1], getTds(rowHtml));
            if (song) songs.push(song);
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

async function searchUsdb(filters) {
    let cookie;
    try {
        cookie = await getUsdbCookie();
    } catch (e) {
        throw new Error('USDB requires login to search. Please save your credentials above.');
    }

    const {
        title = '', artist = '', edition = '', language = '',
        genre = '', year = '', creator = '',
        limit = '30', order = 'id', direction = 'asc',
        golden = '0', sc = '0', offset = '0'
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
        ...(sc     === '1' ? { songcheck: '1' } : {}),
    });

    let res = await httpsPost(
        'https://usdb.animux.de/?link=list',
        params.toString(),
        { Cookie: cookie }
    );

    if (res.status === 200 && res.body.includes('You are not logged in')) {
        try {
            cookie = await getUsdbCookie(true);
            res = await httpsPost(
                'https://usdb.animux.de/?link=list',
                params.toString(),
                { Cookie: cookie }
            );
        } catch (e) {
            throw new Error('USDB login failed. Please check your credentials.');
        }
    }

    if (res.status !== 200) throw new Error(`USDB search HTTP ${res.status}`);
    if (res.body.includes('You are not logged in')) {
        throw new Error('USDB requires login to search. Please save your credentials above.');
    }
    return parseUsdbSearch(res.body);
}

async function fetchUsdbTxt(usdbId, cookie) {
    const url = `https://usdb.animux.de/?link=gettxt&id=${usdbId}`;
    const body = new URLSearchParams({ wd: '1' }).toString();
    const res = await httpsPost(url, body, cookie ? { Cookie: cookie } : {});
    if (res.status !== 200) throw new Error(`USDB txt fetch HTTP ${res.status}`);
    
    const match = res.body.match(/<textarea[^>]*>([\s\S]*?)<\/textarea>/i);
    if (!match) {
        throw new Error('Could not find lyrics textarea in USDB response. Make sure you are logged in.');
    }
    return stripHtml(match[1]).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

module.exports = {
    getUsdbSessionCookie,
    setUsdbSessionCookie,
    getUsdbCookie,
    usdbLogin,
    searchUsdb,
    fetchUsdbTxt
};
