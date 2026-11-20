/**
 * The play board for the player whose hand is revealed [ID: UI-MAUMAU-TABLE]
 *
 * Render this only while no handover cover is shown. Unplayable cards are dimmed and inert.
 */
import React from 'react';
import { Alert, Box, Button, Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { PlayingCard, SUIT_SYMBOL } from '../../../modules/playing-cards';
import { canDraw, drawableCount, playableCards, topCard } from '../logic/engine';
import type { MauMauAction, MauMauState } from '../logic/types';
import { MauMauOpponents } from './MauMauOpponents';
import { MauMauWishDialog } from './MauMauWishDialog';

interface MauMauTableProps {
  game: MauMauState;
  onAct: (action: MauMauAction) => void;
}

export const MauMauTable: React.FC<MauMauTableProps> = ({ game, onAct }) => {
  const { t } = useTranslation();
  const current = game.players[game.currentIndex];
  const { phase, pendingDraw, wishedSuit } = game;
  const playableIds = new Set(playableCards(game).map((c) => c.id));
  const drawEnabled = canDraw(game);
  const stuck = phase === 'turn' && pendingDraw === 0 && drawableCount(game) === 0;
  const canPass = phase === 'drawn' || stuck;

  let hint = t('games.maumau.hint.turn');
  if (phase === 'drawn')
    hint =
      game.drawnId === null ? t('games.maumau.hint.drawn_empty') : t('games.maumau.hint.drawn');
  else if (phase === 'wish') hint = t('games.maumau.hint.wish');

  return (
    <Stack spacing={2} sx={{ width: '100%' }}>
      <Typography variant="h6" textAlign="center" fontWeight={700} aria-live="polite">
        {t('games.maumau.table.turn_of', { name: current.name })}
      </Typography>

      <MauMauOpponents game={game} />

      <Stack direction="row" spacing={3} justifyContent="center" alignItems="flex-start">
        <Stack alignItems="center" spacing={0.5}>
          <PlayingCard
            faceUp={false}
            onClick={drawEnabled ? () => onAct({ type: 'draw' }) : undefined}
          />
          <Typography variant="caption" color="text.secondary">
            {t('games.maumau.table.draw_pile', { count: game.deck.length })}
          </Typography>
        </Stack>
        <Stack alignItems="center" spacing={0.5}>
          <PlayingCard card={topCard(game)} faceUp />
          <Typography variant="caption" color="text.secondary">
            {t('games.maumau.table.discard_pile')}
          </Typography>
          {wishedSuit && (
            <Chip
              size="small"
              color="primary"
              label={`${t('games.maumau.table.wish')}: ${SUIT_SYMBOL[wishedSuit]}`}
            />
          )}
        </Stack>
      </Stack>

      {pendingDraw > 0 && (
        <Alert severity="warning">{t('games.maumau.table.penalty', { count: pendingDraw })}</Alert>
      )}
      <Typography variant="body2" color="text.secondary" textAlign="center">
        {hint}
      </Typography>

      <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
        <Button variant="outlined" disabled={!drawEnabled} onClick={() => onAct({ type: 'draw' })}>
          {t('games.maumau.actions.draw')}
        </Button>
        {pendingDraw > 0 && (
          <Button
            variant="contained"
            color="warning"
            onClick={() => onAct({ type: 'take_penalty' })}
          >
            {t('games.maumau.actions.take_penalty', { count: pendingDraw })}
          </Button>
        )}
        <Button variant="contained" disabled={!canPass} onClick={() => onAct({ type: 'pass' })}>
          {t('games.maumau.actions.pass')}
        </Button>
      </Stack>

      <Box>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          {t('games.maumau.table.own_hand', { name: current.name })}
          {current.hand.length === 1 && ` – ${t('games.maumau.table.mau')}`}
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 0.75,
            maxHeight: '40dvh',
            overflowY: 'auto',
            p: 0.5,
          }}
        >
          {current.hand.map((card) => {
            const playable = playableIds.has(card.id);
            return (
              <PlayingCard
                key={card.id}
                card={card}
                faceUp
                size="sm"
                highlighted={card.id === game.drawnId}
                dimmed={!playable}
                onClick={playable ? () => onAct({ type: 'play', cardId: card.id }) : undefined}
              />
            );
          })}
        </Box>
      </Box>

      <MauMauWishDialog open={phase === 'wish'} onPick={(suit) => onAct({ type: 'wish', suit })} />
    </Stack>
  );
};
