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
  Card,
  CardActionArea,
  Typography,
  Grid,
  Chip,
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

interface PartyGamePickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelectGame: (gameType: 'garticphone' | 'guessart' | 'tabletop', tabletopGameId?: string) => void;
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
      desc: t('games.tabletop.standard_cards_desc', 'Mau-Mau, Skat, Poker oder Rommé mit geteiltem Tisch und Smartphone-Handkarten.'),
      icon: <StyleIcon sx={{ fontSize: 36, color: '#1976d2' }} />,
    },
    {
      id: 'liars-dice',
      title: t('games.tabletop.liars_dice_title', "Liar's Dice / Perudo"),
      desc: t('games.tabletop.liars_dice_desc', 'Bluff-Würfelspiel mit 3D-Würfeln und verdeckten Bechern auf jedem Handy.'),
      icon: <CasinoIcon sx={{ fontSize: 36, color: '#f57c00' }} />,
    },
    {
      id: 'checkers',
      title: t('games.tabletop.checkers_title', 'Dame / Checkers'),
      desc: t('games.tabletop.checkers_desc', 'Klassisches Brettspiel auf 8x8 Spielfeld.'),
      icon: <GridOnIcon sx={{ fontSize: 36, color: '#388e3c' }} />,
    },
  ];

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
          <Tab label={t('party.tab_tabletop', 'Karten & Brett')} />
          <Tab label={t('party.tab_custom', 'Eigene Spiele')} />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 2.5 }}>
        {tabIndex === 0 && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Card variant="outlined" sx={{ borderRadius: 3, '&:hover': { borderColor: 'primary.main' } }}>
                <CardActionArea onClick={() => { onSelectGame('garticphone'); onClose(); }} sx={{ p: 2 }}>
                  <PhoneForwardedIcon sx={{ fontSize: 40, color: '#7c4dff', mb: 1 }} />
                  <Typography variant="h6" fontWeight={700}>Gartic Phone</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('party.gartic_desc', 'Stille Post mit Zeichnen und Raten auf allen Handys gleichzeitig.')}
                  </Typography>
                </CardActionArea>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Card variant="outlined" sx={{ borderRadius: 3, '&:hover': { borderColor: 'primary.main' } }}>
                <CardActionArea onClick={() => { onSelectGame('guessart'); onClose(); }} sx={{ p: 2 }}>
                  <DrawIcon sx={{ fontSize: 40, color: '#00bcd4', mb: 1 }} />
                  <Typography variant="h6" fontWeight={700}>GuessArt</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('party.guessart_desc', 'Montagsmaler mit Pass-and-Play oder Peer-Synchronisation.')}
                  </Typography>
                </CardActionArea>
              </Card>
            </Grid>
          </Grid>
        )}

        {tabIndex === 1 && (
          <Grid container spacing={2}>
            {BUILTIN_TABLETOP.map((g) => (
              <Grid size={{ xs: 12 }} key={g.id}>
                <Card variant="outlined" sx={{ borderRadius: 3, '&:hover': { borderColor: 'primary.main' } }}>
                  <CardActionArea onClick={() => { onSelectGame('tabletop', g.id); onClose(); }} sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Box>{g.icon}</Box>
                    <Box flex={1}>
                      <Typography variant="subtitle1" fontWeight={700}>{g.title}</Typography>
                      <Typography variant="caption" color="text.secondary">{g.desc}</Typography>
                    </Box>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {tabIndex === 2 && (
          <Box>
            {loadingCustom ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress size={32} />
              </Box>
            ) : customGames.length === 0 ? (
              <Box textAlign="center" py={4}>
                <FolderOpenIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  {t('party.no_custom_tabletop', 'Noch keine eigenen Party-fähigen Tabletop-Spiele importiert.')}
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {customGames.map((g) => (
                  <Grid size={{ xs: 12 }} key={g.id}>
                    <Card variant="outlined" sx={{ borderRadius: 3, '&:hover': { borderColor: 'primary.main' } }}>
                      <CardActionArea onClick={() => { onSelectGame('tabletop', g.id); onClose(); }} sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography variant="subtitle1" fontWeight={700}>{g.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t('party.custom_game_info', '{{min}}-{{max}} Spieler • {{cards}} Karten', { min: g.minPlayers, max: g.maxPlayers, cards: g.cardCount })}
                          </Typography>
                        </Box>
                        <Chip label={t('party.party_ready', 'Party bereit')} size="small" color="success" variant="outlined" />
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel', 'Abbrechen')}</Button>
      </DialogActions>
    </Dialog>
  );
};
