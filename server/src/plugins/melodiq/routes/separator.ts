import { Hono } from 'hono';
import {
  checkSeparatorInstalled,
  addSeparatorInstallJob,
  getSeparatorJobsList,
  getSeparatorJob,
  clearSeparatorJobs,
  addSeparatorJobs,
  type SeparatorJobRequest,
} from '../services/queueManager';
import type { HonoEnv } from '../../../core/types';

export const separatorRouter = new Hono<HonoEnv>();

// GET /api/separator/status — Installation status
separatorRouter.get('/api/separator/status', async (c) => {
  try {
    const isInstalled = await checkSeparatorInstalled();
    return c.json({ installed: isInstalled });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: msg }, 500);
  }
});

// POST /api/separator/install — Install Python deps
separatorRouter.post('/api/separator/install', async (c) => {
  try {
    const isInstalled = await checkSeparatorInstalled();
    if (isInstalled) {
      return c.json({ success: true, message: 'Already installed' });
    }
    const jobId = addSeparatorInstallJob();
    return c.json({ jobId });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: msg }, 500);
  }
});

// GET /api/separator/jobs — List separator jobs
separatorRouter.get('/api/separator/jobs', (c) => {
  return c.json(getSeparatorJobsList());
});

// GET /api/separator/status/:jobId — Single job status
separatorRouter.get('/api/separator/status/:jobId', (c) => {
  const jobId = c.req.param('jobId');
  const job = getSeparatorJob(jobId);
  if (!job) return c.json({ error: 'Job not found' }, 404);
  return c.json({
    status: job.status,
    progress: job.progress,
    log: job.log.slice(-30),
    error: job.error,
  });
});

// DELETE /api/separator/jobs/:jobId? — Clear/cancel jobs
separatorRouter.delete('/api/separator/jobs/:jobId?', (c) => {
  try {
    const jobId = c.req.param('jobId');
    clearSeparatorJobs(jobId);
    return c.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: msg }, 500);
  }
});

// POST /api/separator/job — Create separation or full-sync job
separatorRouter.post('/api/separator/job', async (c) => {
  try {
    const body = (await c.req.json().catch(() => ({}))) as SeparatorJobRequest | SeparatorJobRequest[];
    const jobIds = addSeparatorJobs(body);
    if (jobIds.length === 0) {
      return c.json({ error: 'No valid jobs provided' }, 400);
    }
    return c.json({ jobIds });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: msg }, 500);
  }
});
