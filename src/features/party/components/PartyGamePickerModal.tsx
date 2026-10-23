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
  Typography,
  Grid,
  CircularProgress,
} from '@mui/material';
import DrawIcon from '@mui/icons-material/Draw';
import PhoneForwardedIcon from '@mui/icons-material/PhoneForwarded';
import StyleIcon from '@mui/icons-material/Style';
import CasinoIcon from '@mui/icons-material/Casino';
import GridOnIcon from '@mui/icons-material/GridOn';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { useTranslation } from 'react-i18next';
import { listTabletopGames } from '../../../games/tabletop/logic/tabletopStorage';
import type { TabletopGameSummary } from '../../../games/tabletop/logic/types';
import { DICE_GAMES } from '../../../games/tabletop/logic/tableCatalog';
import type { PartyGameType } from '../logic/universalPartyManager';
import { isRoomDiceGame } from '../logic/partyRoutes';
import { PartyPickerCard } from './PartyPickerCard';

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

  const BUILTIN_TABLETOP = [
    {
      id: 'standard-cards',
      title: t('games.tabletop.standard_cards_title', 'Standard Kartendeck (52)'),
      desc: t(
        'games.tabletop.standard_cards_desc',
        'Mau-Mau, Skat, Poker oder Rommé mit geteiltem Tisch und Smartphone-Handkarten.',
      ),
      icon: <StyleIcon sx={{ fontSize: 36, color: '#1976d2' }} />,
    },
    {
      id: 'liars-dice',
      title: t('games.tabletop.liars_dice_title', "Liar's Dice / Perudo"),
      desc: t(
        'games.tabletop.liars_dice_desc',
        'Bluff-Würfelspiel mit 3D-Würfeln und verdeckten Bechern auf jedem Handy.',
      ),
      icon: <CasinoIcon sx={{ fontSize: 36, color: '#f57c00' }} />,
    },
    {
      id: 'checkers',
      title: t('games.tabletop.checkers_title', 'Dame / Checkers'),
      desc: t('games.tabletop.checkers_desc', 'Klassisches Brettspiel auf 8x8 Spielfeld.'),
      icon: <GridOnIcon sx={{ fontSize: 36, color: '#388e3c' }} />,
    },
  ];

  const pick = (gameType: PartyGameType, id?: string) => () => {
    onSelectGame(gameType, id);
    onClose();
  };
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
        {tabIndex === 0 &&
          grid([
            <PartyPickerCard
              icon={<PhoneForwardedIcon sx={{ fontSize: 36, color: '#7c4dff' }} />}
              title="Gartic Phone"
              desc={t(
                'party.gartic_desc',
                'Stille Post mit Zeichnen und Raten auf allen Handys gleichzeitig.',
              )}
              onClick={pick('garticphone')}
            />,
            <PartyPickerCard
              icon={<DrawIcon sx={{ fontSize: 36, color: '#00bcd4' }} />}
              title="GuessArt"
              desc={t(
                'party.guessart_desc',
                'Montagsmaler mit Pass-and-Play oder Peer-Synchronisation.',
              )}
              onClick={pick('guessart')}
            />,
          ])}

        {tabIndex === 1 &&
          grid([
            ...BUILTIN_TABLETOP.map((g) => (
              <PartyPickerCard
                icon={g.icon}
                title={g.title}
                desc={g.desc}
                onClick={pick('tabletop', g.id)}
              />
            )),
            ...DICE_GAMES.filter((g) => isRoomDiceGame(g.id)).map((g) => (
              <PartyPickerCard
                icon={g.icon}
                title={t(g.titleKey, g.title)}
                desc={g.descKey ? t(g.descKey, g.desc ?? '') : (g.desc ?? '')}
                onClick={pick(g.id as PartyGameType)}
              />
            )),
          ])}

        {tabIndex === 2 &&
          (loadingCustom ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress size={32} />
            </Box>
          ) : customGames.length === 0 ? (
            <Box textAlign="center" py={4}>
              <FolderOpenIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                {t(
                  'party.no_custom_tabletop',
                  'Noch keine eigenen Party-fähigen Tabletop-Spiele importiert.',
                )}
              </Typography>
            </Box>
          ) : (
            grid(
              customGames.map((g) => (
                <PartyPickerCard
                  icon={<StyleIcon sx={{ fontSize: 36, color: '#7c3aed' }} />}
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
