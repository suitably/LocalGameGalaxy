import type { GalaxyPlugin } from '../../core/types';
import { requireAuth } from '../../core/auth';
import { serverConfig } from '../../config';
import { notesPiecesRouter } from './routes/pieces';
import { notesMediaRouter } from './routes/media';

export const notesPlugin: GalaxyPlugin = {
  id: 'notes',
  name: 'Melodiq Notes Library',
  version: '1.0.0',
  description: 'Stores sheet music (MusicXML/MIDI), recordings and bar marks for Melodiq Notes',
  init: (app) => {
    app.use('/api/notes/*', requireAuth);
    app.use('/notes/media/*', requireAuth);

    app.route('/', notesPiecesRouter);
    app.route('/', notesMediaRouter);
    console.log(`[Notes] Library folder: ${serverConfig.notesDir}`);
  },
};
