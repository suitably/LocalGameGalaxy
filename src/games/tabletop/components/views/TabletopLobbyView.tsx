/**
 * The Spieltisch: card, board and dice games, played on one device or everyone on their own [ID: GAME-TABLETOP-LOBBY]
 */
import React, { useEffect, useState } from 'react';
import { Box, Button, Container, Grid, Paper, Typography } from '@mui/material';
import SettingsIcon from '@mui/icons-material/SettingsRounded';
import { useTranslation } from 'react-i18next';
import { GameManagerDialog } from '../manager/GameManagerDialog';
import type { TabletopGameSummary } from '../../logic/types';
import { listTabletopGames } from '../../logic/tabletopStorage';
import {
  playModesOf,
  spieltischSection,
  routeFor,
  type PlayMode,
  type TableGameEntry,
} from '../../logic/tableCatalog';
import { TableGameCard } from './TableGameCard';
import { PlayModeSheet } from './PlayModeSheet';
import { piecePalette } from '../../../../themeTokens';

interface TabletopLobbyViewProps {
  /** Opens a route (local tabletop, party lobby with the game, or a dice game). */
  onOpen: (route: string) => void;
}

export const TabletopLobbyView: React.FC<TabletopLobbyViewProps> = ({ onOpen }) => {
  const { t } = useTranslation();
  const [managerOpen, setManagerOpen] = useState(false);
  const [installedGames, setInstalledGames] = useState<TabletopGameSummary[]>([]);
  const [choosing, setChoosing] = useState<TableGameEntry | null>(null);

  useEffect(() => {
    listTabletopGames()
      .then(setInstalledGames)
      .catch(() => {});
  }, [managerOpen]);

  const titleOf = (g: TableGameEntry) => t(g.titleKey, g.title);
  // One mode: open straight away (fewest taps); two: ask how to play.
  const play = (g: TableGameEntry) =>
    g.modes.length === 1 ? onOpen(routeFor(g, g.modes[0])) : setChoosing(g);
  const custom: TableGameEntry[] = installedGames.map((g) => ({
    id: g.id,
    kind: 'tabletop',
    titleKey: '',
    title: g.name,
    desc: t('games.tabletop.custom_game_meta', {
      min: g.minPlayers,
      max: g.maxPlayers,
    }),
    icon: 'puzzle',
    color: piecePalette.purple,
    modes: playModesOf(g.supportedModes),
  }));

  const section = (title: string, games: TableGameEntry[]) =>
    games.length > 0 && (
      <Box mb={3}>
        <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>
          {title}
        </Typography>
        <Grid container spacing={1.5}>
          {games.map((g) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={g.id}>
              <TableGameCard
                title={g.titleKey ? titleOf(g) : g.title}
                desc={g.descKey ? t(g.descKey, g.desc ?? '') : g.desc}
                icon={g.icon}
                color={g.color}
                modes={g.modes}
                onPlay={() => play(g)}
              />
            </Grid>
          ))}
        </Grid>
      </Box>
    );

  const byId = (id: string) => ({ id, kind: 'tabletop' as const });
  return (
    <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: { xs: 1.5, sm: 3 } }}>
      <Container maxWidth="md" disableGutters>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 4 },
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            flexWrap="wrap"
            gap={1.5}
            mb={2.5}
          >
            <Box>
              <Typography variant="body2" color="text.secondary">
                {t('games.tabletop.subtitle')}
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<SettingsIcon />}
              onClick={() => setManagerOpen(true)}
            >
              {t('games.tabletop.manage_games')}
            </Button>
          </Box>

          {section(t('games.tabletop.starter_games'), spieltischSection('starters'))}
          {section(t('games.tabletop.card_games'), spieltischSection('cards'))}
          {section(t('games.tabletop.dice_games'), spieltischSection('dice'))}
          {section(t('games.tabletop.score_trackers'), spieltischSection('trackers'))}
          {section(t('games.tabletop.custom_games'), custom)}
        </Paper>
      </Container>

      <PlayModeSheet
        gameTitle={choosing ? (choosing.titleKey ? titleOf(choosing) : choosing.title) : null}
        onClose={() => setChoosing(null)}
        onChoose={(mode: PlayMode) => {
          if (choosing) onOpen(routeFor(choosing, mode));
          setChoosing(null);
        }}
      />

      <GameManagerDialog
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
        onPlayParty={(id) => onOpen(routeFor(byId(id), 'own_devices'))}
        onPlayLocal={(id) => onOpen(routeFor(byId(id), 'shared_device'))}
      />
    </Box>
  );
};
