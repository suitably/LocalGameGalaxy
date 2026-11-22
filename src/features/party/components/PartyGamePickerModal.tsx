import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  Box,
  Grid,
} from '@mui/material';
import StyleIcon from '@mui/icons-material/StyleRounded';
import FolderOpenIcon from '@mui/icons-material/FolderOpenRounded';
import { useTranslation } from 'react-i18next';
import { listTabletopGames } from '../../../games/tabletop/logic/tabletopStorage';
import type { TabletopGameSummary } from '../../../games/tabletop/logic/types';
import { partyPickerEntries, type PartyPickerTab } from '../../../lib/catalog/views';
import type { CatalogEntry } from '../../../lib/catalog/types';
import type { PartyGameType } from '../logic/universalPartyManager';
import { EmptyState } from '../../../components/common/EmptyState';
import { ListSkeleton } from '../../../components/common/ListSkeleton';
import { PartyPickerCard } from './PartyPickerCard';
import { PartyCatalogCard } from './PartyCatalogCard';

interface PartyGamePickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelectGame: (gameType: PartyGameType, tabletopGameId?: string) => void;
}

export const PartyGamePickerModal: React.FC<PartyGamePickerModalProps> = ({
  open,
  onClose,
  onSelectGame,
}) => {
  const { t } = useTranslation();
  const [tabIndex, setTabIndex] = useState(0);
  const [customGames, setCustomGames] = useState<TabletopGameSummary[]>([]);
  const [loadingCustom, setLoadingCustom] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (open && tabIndex === 2) {
      listTabletopGames()
        .then((games) => {
          if (!cancelled) {
            setCustomGames(games.filter((g) => g.supportedModes.includes('party_multi_device')));
            setLoadingCustom(false);
          }
        })
        .catch(() => {
          if (!cancelled) setLoadingCustom(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [open, tabIndex]);

  const pick = (gameType: PartyGameType, id?: string) => () => {
    onSelectGame(gameType, id);
    onClose();
  };
  const pickEntry = (entry: CatalogEntry) =>
    entry.launch.type === 'tabletop'
      ? pick('tabletop', entry.id)
      : pick(entry.party?.gameType ?? 'tabletop');
  const catalogTab = (tab: PartyPickerTab) =>
    grid(
      partyPickerEntries(tab).map((entry) => (
        <PartyCatalogCard key={entry.id} entry={entry} onClick={pickEntry(entry)} />
      )),
    );
  const grid = (cards: React.ReactNode[]) => (
    <Grid container spacing={2}>
      {cards.map((card, i) => (
        <Grid size={{ xs: 12 }} key={i}>
          {card}
        </Grid>
      ))}
    </Grid>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('party.select_game_title', 'Spiel für die Party wählen')}</DialogTitle>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
        <Tabs
          value={tabIndex}
          onChange={(_, v) => {
            setTabIndex(v);
            if (v === 2) setLoadingCustom(true);
          }}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label={t('party.tab_party', 'Party-Spiele')} />
          <Tab label={t('party.tab_tabletop', 'Karten, Brett & Würfel')} />
          <Tab label={t('party.tab_custom', 'Eigene Spiele')} />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 2.5 }}>
        {tabIndex === 0 && catalogTab('party')}
        {tabIndex === 1 && catalogTab('table')}

        {tabIndex === 2 &&
          (loadingCustom ? (
            <ListSkeleton rows={3} rowHeight={72} />
          ) : customGames.length === 0 ? (
            <EmptyState
              icon={<FolderOpenIcon sx={{ fontSize: 48 }} />}
              message={t(
                'party.no_custom_tabletop',
                'Noch keine eigenen Party-fähigen Tabletop-Spiele importiert.',
              )}
            />
          ) : (
            grid(
              customGames.map((g) => (
                <PartyPickerCard
                  icon={<StyleIcon sx={{ fontSize: 36, color: 'piece.green' }} />}
                  title={g.name}
                  desc={t('party.custom_game_info', '{{min}}-{{max}} Spieler • {{cards}} Karten', {
                    min: g.minPlayers,
                    max: g.maxPlayers,
                    cards: g.cardCount,
                  })}
                  chip={t('party.party_ready', 'Party bereit')}
                  onClick={pick('tabletop', g.id)}
                />
              )),
            )
          ))}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel', 'Abbrechen')}</Button>
      </DialogActions>
    </Dialog>
  );
};
