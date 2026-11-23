/**
 * Catalogue entry of Gartic Phone (ADR-0011) [ID: CATALOG-GARTICPHONE]
 *
 * Importing this file pulls in no page code; the page loads lazily.
 */
import PhoneForwardedIcon from '@mui/icons-material/PhoneForwardedRounded';
import { defineGame, lazyNamed } from '../../lib/catalog/defineGame';

const Page = lazyNamed(() => import('./index'), 'GarticPhoneGame');

export const definition = defineGame({
  id: 'garticphone',
  route: 'games/garticphone',
  i18n: 'games.garticphone',
  title: 'Zeichen-Stille-Post',
  kind: 'game',
  area: 'party',
  color: 'pink',
  modes: ['party_room'],
  listing: 'hub',
  // No page of its own outside a room: the tile opens the party lobby with the game chosen.
  opens: '/party?launch=garticphone',
  party: { gameType: 'garticphone', descKey: 'party.gartic_desc' },
  icon: <PhoneForwardedIcon sx={{ fontSize: 72, mb: 2 }} />,
  component: <Page />,
});
