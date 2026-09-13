import { Hono } from 'hono';
import { searchUsdb } from '../services/usdb';
import {
  addDownloadJobs,
  getDownloadJobsList,
  getDownloadJob,
  clearDownloadJobs,
  type DownloadJobRequest,
} from '../services/queueManager';
import { ensureYtDlp, spawnYtDlp } from '../services/download';
import type { HonoEnv } from '../../../core/types';

export const usdbRouter = new Hono<HonoEnv>();

// GET /api/usdb/search — USDB song search
usdbRouter.get('/api/usdb/search', async (c) => {
  const {
    q,
    title,
    artist,
    edition,
    language,
    genre,
    year,
    creator,
    limit,
    order,
    direction,
    golden,
    sc,
    offset,
  } = c.req.query();

  try {
    if (q) {
      const queryStr = q.trim();
      if (queryStr.includes('-')) {
        const parts = queryStr.split('-');
        const pArtist = parts[0].trim();
        const pTitle = parts.slice(1).join('-').trim();
        const results = await searchUsdb({ artist: pArtist, title: pTitle, limit, offset });
        return c.json(results);
      } else {
        const [artistResults, titleResults] = await Promise.all([
          searchUsdb({ artist: queryStr, limit, offset }),
          searchUsdb({ title: queryStr, limit, offset }),
        ]);
        const merged = [...artistResults.songs, ...titleResults.songs];
        const uniqueSongs = Array.from(new Map(merged.map((s) => [s.usdbId, s])).values());
        return c.json({
          songs: uniqueSongs,
          totalResults: uniqueSongs.length,
          totalPages: 1,
        });
      }
    }

    if (!title && !artist && !edition && !language && !genre && !year && !creator && golden !== '1' && sc !== '1') {
      return c.json([]);
    }

    const results = await searchUsdb({
      title,
      artist,
      edition,
      language,
      genre,
      year,
      creator,
      limit,
      order,
      direction,
      golden,
      sc,
      offset,
    });
    return c.json(results);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: msg }, 500);
  }
});

// POST /api/usdb/download — Start download job
usdbRouter.post('/api/usdb/download', async (c) => {
  try {
    const body = (await c.req.json().catch(() => ({}))) as DownloadJobRequest | DownloadJobRequest[];
    const jobIds = addDownloadJobs(body);
    if (jobIds.length === 0) {
      return c.json({ error: 'No valid jobs provided' }, 400);
    }
    return c.json({ jobIds });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: msg }, 500);
  }
});

// GET /api/usdb/jobs — List download jobs
usdbRouter.get('/api/usdb/jobs', (c) => {
  return c.json(getDownloadJobsList());
});

// GET /api/usdb/status/:jobId — Single download job status
usdbRouter.get('/api/usdb/status/:jobId', (c) => {
  const jobId = c.req.param('jobId');
  const job = getDownloadJob(jobId);
  if (!job) return c.json({ error: 'Job not found' }, 404);
  return c.json({
    status: job.status,
    progress: job.progress,
    log: job.log.slice(-30),
    error: job.error,
  });
});

// DELETE /api/usdb/jobs/:jobId? — Clear/cancel jobs
usdbRouter.delete('/api/usdb/jobs/:jobId?', (c) => {
  try {
    const jobId = c.req.param('jobId');
    clearDownloadJobs(jobId);
    return c.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: msg }, 500);
  }
});

interface YouTubeSearchResult {
  id: string;
  title: string;
  duration: number;
  duration_string: string;
  uploader: string;
  url: string;
  thumbnail: string;
}

// GET /api/youtube/search — Search YouTube via yt-dlp
usdbRouter.get('/api/youtube/search', async (c) => {
  const query = c.req.query('q');
  if (!query) return c.json({ error: 'Missing search query' }, 400);

  try {
    const mockJob = { log: [] };
    const ytBin = await ensureYtDlp(mockJob);

    const searchLimit = parseInt(c.req.query('limit') || '5', 10) || 5;
    const ytOut = await spawnYtDlp(ytBin, ['--dump-json', '--no-playlist', `ytsearch${searchLimit}:${query}`]);

    const lines = ytOut.split('\n').filter((l) => l.trim() !== '');
    const results: YouTubeSearchResult[] = [];

    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        results.push({
          id: data.id,
          title: data.title,
          duration: data.duration,
          duration_string: data.duration_string,
          uploader: data.uploader,
          url: data.webpage_url,
          thumbnail: data.thumbnail,
        });
      } catch {
        // ignore line parse error
      }
    }

    return c.json(results);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[YouTube Search] Failed:', msg);
    return c.json({ error: `Failed to search YouTube: ${msg}` }, 500);
  }
});
