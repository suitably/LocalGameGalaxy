/**
 * The public play board: piles, every player's cards and the current player's actions
 * [ID: UI-GOLF-TABLE]
 */
import React, { useState } from 'react';
import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { PlayingCard } from '../../../modules/playing-cards';
import { START_FLIPS } from '../logic/engine';
import type { GolfAction, GolfState } from '../logic/types';
import { GolfHand } from './GolfHand';

interface GolfTableProps {
  game: GolfState;
  onAct: (action: GolfAction) => void;
}

export const GolfTable: React.FC<GolfTableProps> = ({ game, onAct }) => {
  const { t } = useTranslation();
  // Deck card is being discarded: the next tap on a face-down card flips it.
  const [flipMode, setFlipMode] = useState(false);

  const act = (action: GolfAction) => {
    setFlipMode(false);
    onAct(action);
  };

  const { phase, drawn } = game;
  const current = game.players[game.currentIndex];
  const closer = game.closerIndex === null ? null : game.players[game.closerIndex];
  const topDiscard = game.discard[game.discard.length - 1];
  const hasHidden = current.faceUp.some((f) => !f);
  const canDiscard = phase === 'drawn' && drawn?.source === 'deck';

  const pickable = (slot: number): boolean => {
    if (phase === 'flip_start') return !current.faceUp[slot];
    if (phase === 'drawn') return flipMode ? !current.faceUp[slot] : true;
    return false;
  };
  const onPick = (slot: number) => {
    if (phase === 'flip_start') act({ type: 'flip_start', slot });
    else if (flipMode) act({ type: 'discard_drawn', slot });
    else act({ type: 'swap', slot });
  };

  let hint = '';
  if (phase === 'flip_start')
    hint = t('games.golf.hint.flip_start', {
      name: current.name,
      count: START_FLIPS - game.startFlips,
    });
  else if (phase === 'turn') hint = t('games.golf.hint.turn');
  else if (flipMode) hint = t('games.golf.hint.pick_flip');
  else if (drawn?.source === 'discard') hint = t('games.golf.hint.must_swap');
  else hint = t('games.golf.hint.swap_or_discard');

  return (
    <Stack spacing={2} sx={{ width: '100%' }}>
      <Typography variant="caption" textAlign="center" color="text.secondary">
        {t('games.golf.table.hole', { n: game.roundNumber, total: game.totalRounds })}
      </Typography>
      <Typography variant="h6" textAlign="center" fontWeight={700} aria-live="polite">
        {t('games.golf.table.turn_of', { name: current.name })}
      </Typography>
      {closer && (
        <Alert severity="warning">{t('games.golf.table.final_lap', { name: closer.name })}</Alert>
      )}

      <Stack direction="row" spacing={3} justifyContent="center" alignItems="flex-start">
        <Stack alignItems="center" spacing={0.5}>
          <Typography variant="caption">
            {t('games.golf.table.draw_pile', { count: game.deck.length })}
          </Typography>
          <PlayingCard
            faceUp={false}
            label={t('games.golf.card.draw_pile')}
            highlighted={phase === 'turn'}
            onClick={phase === 'turn' ? () => act({ type: 'draw', source: 'deck' }) : undefined}
          />
        </Stack>
        <Stack alignItems="center" spacing={0.5}>
          <Typography variant="caption">{t('games.golf.table.discard_pile')}</Typography>
          {topDiscard ? (
            <PlayingCard
              card={topDiscard}
              faceUp
              highlighted={phase === 'turn'}
              onClick={
                phase === 'turn' ? () => act({ type: 'draw', source: 'discard' }) : undefined
              }
            />
          ) : (
            <Box sx={{ width: 60, height: 86 }} />
          )}
        </Stack>
        {drawn && (
          <Stack alignItems="center" spacing={0.5}>
            <Typography variant="caption">{t('games.golf.table.drawn')}</Typography>
            <PlayingCard card={drawn.card} faceUp selected />
          </Stack>
        )}
      </Stack>

      <Typography textAlign="center" color="text.secondary" aria-live="polite">
        {hint}
      </Typography>

      <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
        {phase === 'turn' && (
          <>
            <Button variant="contained" onClick={() => act({ type: 'draw', source: 'deck' })}>
              {t('games.golf.actions.draw_deck')}
            </Button>
            <Button
              variant="outlined"
              disabled={!topDiscard}
              onClick={() => act({ type: 'draw', source: 'discard' })}
            >
              {t('games.golf.actions.draw_discard')}
            </Button>
          </>
        )}
        {canDiscard &&
          (flipMode ? (
            <Button variant="outlined" onClick={() => setFlipMode(false)}>
              {t('games.golf.actions.cancel')}
            </Button>
          ) : (
            <Button
              variant="outlined"
              onClick={() => (hasHidden ? setFlipMode(true) : act({ type: 'discard_drawn' }))}
            >
              {hasHidden ? t('games.golf.actions.discard_flip') : t('games.golf.actions.discard')}
            </Button>
          ))}
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
        {game.players.map((p, i) => {
          const isCurrent = i === game.currentIndex;
          return (
            <Paper
              key={p.id}
              variant="outlined"
              sx={{
                p: 1.5,
                borderWidth: 2,
                borderColor: isCurrent ? 'primary.main' : 'divider',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Typography fontWeight={isCurrent ? 700 : 400}>
                {t('games.golf.table.player_score', {
                  name: p.name,
                  score: p.totalScore,
                })}
              </Typography>
              <GolfHand
                player={p}
                size="sm"
                pickable={isCurrent ? pickable : undefined}
                onPick={isCurrent ? onPick : undefined}
              />
            </Paper>
          );
        })}
      </Box>
    </Stack>
  );
};
