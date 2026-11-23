/**
 * Catalogue entry of Melodiq Notes (ADR-0011) [ID: CATALOG-MELODIQ-NOTES]
 *
 * Importing this file pulls in no page code; the page loads lazily.
 */
import PianoIcon from '@mui/icons-material/PianoRounded';
import { defineGame, lazyNamed } from '../../lib/catalog/defineGame';

const Page = lazyNamed(() => import('./index'), 'MelodiqNotesEntry');

export const definition = defineGame({
  id: 'melodiq-notes',
  route: 'games/melodiq-notes',
  i18n: 'games.melodiq_notes',
  title: 'Melodiq Notes',
  kind: 'game',
  area: 'music',
  modes: ['solo', 'party_room'],
  listing: 'hub',
  party: { gameType: 'melodiq-notes', descKey: 'party.melodiq_notes_desc' },
  icon: <PianoIcon sx={{ fontSize: 72, mb: 2 }} />,
  component: <Page />,
});
