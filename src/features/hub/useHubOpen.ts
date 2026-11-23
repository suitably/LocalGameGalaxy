/**
 * Opens a hub tile: Spieltisch games ask how to play when they offer both ways, everything else
 * opens its page [ID: HOOK-HUB-OPEN]
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SPIELTISCH_SECTIONS, type CatalogEntry } from '../../lib/catalog/types';
import {
  routeFor,
  toTableEntry,
  type PlayMode,
  type TableGameEntry,
} from '../../lib/catalog/tableCatalog';

const onSpieltisch = (e: CatalogEntry) =>
  (SPIELTISCH_SECTIONS as readonly string[]).includes(e.listing);

export function useHubOpen() {
  const navigate = useNavigate();
  const [choosing, setChoosing] = useState<TableGameEntry | null>(null);

  const open = (entry: CatalogEntry) => {
    if (onSpieltisch(entry)) {
      const table = toTableEntry(entry);
      // One mode: open straight away (fewest taps); two: ask how to play.
      if (table.modes.length === 1) navigate(routeFor(table, table.modes[0]));
      else setChoosing(table);
      return;
    }
    if (entry.launch.type === 'route') navigate(entry.launch.route);
  };

  const choose = (mode: PlayMode) => {
    if (choosing) navigate(routeFor(choosing, mode));
    setChoosing(null);
  };

  return { open, choosing, choose, close: () => setChoosing(null) };
}
