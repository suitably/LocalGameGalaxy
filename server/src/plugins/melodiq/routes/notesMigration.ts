import { Hono } from 'hono';
import { requireMasterToken } from '../../../core/auth';
import {
  confirmNotesMigration,
  migrateNotesPieces,
  notesMigrationStatus,
} from '../services/notesMigration';
import type { HonoEnv } from '../../../core/types';

/** Status and manual control of the move of the old Notes library into song folders (#568). */
export const notesMigrationRouter = new Hono<HonoEnv>();

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

// GET /api/notes/migration — pieces still in NOTES_DIR, migrated count, completed / confirmed
notesMigrationRouter.get('/api/notes/migration', async (c) => {
  c.header('Cache-Control', 'no-store');
  return c.json(await notesMigrationStatus());
});

// POST /api/notes/migration/run — move pieces not migrated yet, without a restart
notesMigrationRouter.post('/api/notes/migration/run', requireMasterToken, async (c) => {
  try {
    return c.json(await migrateNotesPieces());
  } catch (e: unknown) {
    return c.json({ error: `Migration failed: ${errorText(e)}` }, 500);
  }
});

// POST /api/notes/migration/confirm — remove the originals of migrated pieces from NOTES_DIR
notesMigrationRouter.post('/api/notes/migration/confirm', requireMasterToken, async (c) => {
  try {
    return c.json({ removed: await confirmNotesMigration() });
  } catch (e: unknown) {
    return c.json({ error: `Confirming the migration failed: ${errorText(e)}` }, 500);
  }
});
