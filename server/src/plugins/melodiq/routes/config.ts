import { Hono } from 'hono';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { serverConfig } from '../../../config';
import { scanSongs } from '../services/scanner';
import { usdbLogin, setUsdbSessionCookie } from '../services/usdb';
import { requireMasterToken } from '../middleware/auth';
import type { HonoEnv } from '../../../core/types';

export const configRouter = new Hono<HonoEnv>();

// --- DIRECTORIES ---
configRouter.get('/api/config/directories', (c) => {
  return c.json(serverConfig.directories);
});

configRouter.post('/api/config/directories', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { path?: string };
  const newPath = body.path;
  if (newPath && fs.existsSync(newPath)) {
    serverConfig.addDirectory(newPath);
    scanSongs();
    return c.json(serverConfig.directories);
  } else {
    return c.json({ error: 'Invalid path' }, 400);
  }
});

configRouter.delete('/api/config/directories', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { path?: string };
  if (body.path) {
    serverConfig.removeDirectory(body.path);
    scanSongs();
  }
  return c.json(serverConfig.directories);
});

// --- DIRECTORY BROWSER ---
configRouter.get('/api/browse', (c) => {
  const queryPath = c.req.query('path') || os.homedir();
  try {
    if (queryPath.indexOf('\0') !== -1) {
      return c.json({ error: 'Invalid path' }, 400);
    }

    const resolvedPath = path.resolve(queryPath);
    const baseDir = path.parse(os.homedir()).root;

    if (!resolvedPath.startsWith(baseDir)) {
      return c.json({ error: 'Access denied' }, 403);
    }

    if (!fs.existsSync(resolvedPath)) return c.json({ error: 'Path not found' }, 404);
    const entries = fs.readdirSync(resolvedPath, { withFileTypes: true });
    const dirs = entries
      .filter((dirent) => dirent.isDirectory() && !dirent.name.startsWith('.'))
      .map((dirent) => dirent.name);

    const parent = path.resolve(resolvedPath, '..');
    if (parent !== resolvedPath && parent.startsWith(baseDir)) {
      dirs.unshift('..');
    }

    return c.json({ current: resolvedPath, dirs });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: msg }, 500);
  }
});

// --- DOWNLOAD DIRECTORY ---
configRouter.get('/api/config/download-dir', (c) => {
  return c.json({ downloadDir: serverConfig.downloadDir || serverConfig.directories[0] || null });
});

configRouter.post('/api/config/download-dir', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { dir?: string; path?: string };
  const dir = body.dir || body.path;
  if (!dir || !fs.existsSync(dir)) return c.json({ error: 'Directory does not exist' }, 400);
  serverConfig.downloadDir = dir;
  return c.json({ downloadDir: serverConfig.downloadDir });
});

// --- PREFERENCES ---
configRouter.get('/api/config/preferences', (c) => {
  return c.json({
    defaultDownloadMode: serverConfig.defaultDownloadMode || 'stream',
    autoVocalSeparation: Boolean(serverConfig.autoVocalSeparation),
  });
});

configRouter.post('/api/config/preferences', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    defaultDownloadMode?: 'stream' | 'mp4' | 'none';
    autoVocalSeparation?: boolean;
  };
  if (body.defaultDownloadMode) {
    serverConfig.defaultDownloadMode = body.defaultDownloadMode;
  }
  if (typeof body.autoVocalSeparation === 'boolean') {
    serverConfig.autoVocalSeparation = body.autoVocalSeparation;
  }
  return c.json({ ok: true });
});

// --- USDB CREDENTIALS ---
configRouter.get('/api/config/usdb-credentials', (c) => {
  return c.json({
    username: serverConfig.usdbUsername || '',
    hasPassword: Boolean(serverConfig.usdbPassword),
  });
});

configRouter.post('/api/config/usdb-credentials', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { username?: string; password?: string };
  const { username, password } = body;
  if (!username) return c.json({ error: 'username required' }, 400);

  let finalPassword = password;
  if (password === '********' || !password) {
    finalPassword = serverConfig.usdbPassword || undefined;
  }

  try {
    const testCookie = await usdbLogin(username, finalPassword);
    setUsdbSessionCookie(testCookie);
    serverConfig.setUsdbCredentials(username, finalPassword);
    return c.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: msg }, 400);
  }
});

// --- API KEYS (Master token required) ---
configRouter.get('/api/config/apikeys', requireMasterToken, (c) => {
  return c.json(serverConfig.apiKeys);
});

configRouter.post('/api/config/apikeys', requireMasterToken, async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    name?: string;
    allowManagement?: boolean;
    allowSongDeletion?: boolean;
  };
  const { name, allowManagement, allowSongDeletion } = body;
  const newKey = serverConfig.createApiKey(name, allowManagement, allowSongDeletion);
  return c.json(newKey);
});

configRouter.put('/api/config/apikeys/:id', requireMasterToken, async (c) => {
  const id = c.req.param('id');
  const body = (await c.req.json().catch(() => ({}))) as {
    name?: string;
    allowManagement?: boolean;
    allowSongDeletion?: boolean;
  };
  const updatedKey = serverConfig.updateApiKey(id, body);
  if (updatedKey) {
    return c.json(updatedKey);
  } else {
    return c.json({ error: 'API Key not found' }, 404);
  }
});

configRouter.delete('/api/config/apikeys/:id', requireMasterToken, (c) => {
  const id = c.req.param('id');
  const success = serverConfig.deleteApiKey(id);
  if (success) {
    return c.json({ success: true });
  } else {
    return c.json({ error: 'API Key not found' }, 404);
  }
});

// --- FEEDBACK / ISSUE SUBMISSION ---
configRouter.post('/api/feedback', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    title?: string;
    body?: string;
    type?: string;
  };
  const { title, body: issueBody, type } = body;
  if (!title || !issueBody) {
    return c.json({ error: 'Missing title or body' }, 400);
  }

  const token = serverConfig.githubToken;
  const owner = serverConfig.githubOwner;
  const repo = serverConfig.githubRepo;

  if (!token) {
    return c.json(
      {
        error:
          'GitHub Token is not configured on the backend server. Please configure it in the server settings.',
      },
      400,
    );
  }

  const labels = ['user-feedback'];
  let prefix = '[Feedback]';

  if (type === 'bug') {
    labels.push('bug');
    prefix = '[Bug]';
  } else if (type === 'feature') {
    labels.push('enhancement');
    prefix = '[Feature Request]';
  } else if (type === 'suggestion') {
    labels.push('question');
    prefix = '[Suggestion]';
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'LocalGameGalaxy-Server',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `${prefix} ${title}`,
        body: issueBody,
        labels,
      }),
    });

    const data = (await response.json()) as {
      message?: string;
      html_url?: string;
      number?: number;
    };

    if (!response.ok) {
      console.error('[GitHub API Error]', data);
      return c.json(
        { error: data.message || 'Failed to create GitHub issue' },
        response.status as 400 | 500,
      );
    }

    return c.json({ success: true, issueUrl: data.html_url, number: data.number });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[Feedback Error]', msg);
    return c.json({ error: `Failed to submit feedback: ${msg}` }, 500);
  }
});
