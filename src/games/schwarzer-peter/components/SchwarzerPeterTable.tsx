/**
 * The current drawer's table: pick a face-down card from the source, see the drawn card, then
 * end the turn explicitly [ID: UI-SP-TABLE]
 */
import React from 'react';
import { Alert, Button, Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { PlayingCard, cardText } from '../../../modules/playing-cards';
import type { SPAction, SPState } from '../logic/types';

interface SchwarzerPeterTableProps {
  game: SPState;
  onAct: (action: SPAction) => void;
}

const K = 'games.schwarzer-peter';

export const SchwarzerPeterTable: React.FC<SchwarzerPeterTableProps> = ({ game, onAct }) => {
  const { t } = useTranslation();
  const me = game.players[game.currentIndex];
  const source = game.players[game.sourceIndex];
  const drawn = game.phase === 'drawn' ? game.drawn : null;

  return (
    <Stack spacing={2} sx={{ width: '100%' }}>
      <Typography variant="h6" textAlign="center" fontWeight={700} aria-live="polite">
        {t(`${K}.table.turn_of`, { name: me.name })}
      </Typography>

      <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center" useFlexGap>
        {game.players.map((p) => (
          <Chip
            key={p.id}
            size="small"
            color={p.id === source.id && !drawn ? 'primary' : 'default'}
            label={`${p.name}: ${
              p.hand.length > 0
                ? t(`${K}.table.cards_left`, { count: p.hand.length })
                : t(`${K}.table.out`)
            }`}
          />
        ))}
      </Stack>

      {!drawn && (
        <Stack spacing={1} alignItems="center">
          <Typography>{t(`${K}.table.source`, { name: source.name })}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t(`${K}.hint.pick`)}
          </Typography>
          <Stack direction="row" flexWrap="wrap" justifyContent="center" gap={0.5}>
            {source.hand.map((card, i) => (
              <PlayingCard
                key={card.id}
                faceUp={false}
                size="sm"
                label={t(`${K}.card.face_down`, { n: i + 1, name: source.name })}
                onClick={() => onAct({ type: 'draw', index: i })}
              />
            ))}
          </Stack>
        </Stack>
      )}

      {drawn && (
        <Stack spacing={1} alignItems="center">
          <Typography fontWeight={700}>{t(`${K}.hint.drawn`)}</Typography>
          <PlayingCard card={drawn.card} faceUp highlighted />
          <Alert severity={drawn.pairedWith ? 'success' : 'info'}>
            {drawn.pairedWith
              ? t(`${K}.hint.pair_discarded`, { card: cardText(drawn.pairedWith) })
              : t(`${K}.hint.no_pair`)}
          </Alert>
          <Button variant="contained" size="large" onClick={() => onAct({ type: 'done' })}>
            {t(`${K}.hint.done`)}
          </Button>
        </Stack>
      )}

      <Stack spacing={1} alignItems="center">
        <Typography fontWeight={700}>{t(`${K}.table.own_hand`, { name: me.name })}</Typography>
        {me.turns === 0 && (
          <Typography variant="body2" color="text.secondary">
            {t(`${K}.table.deal_summary`, { count: me.initialPairs })}
          </Typography>
        )}
        {me.hand.length === 0 && <Typography>{t(`${K}.table.no_cards`)}</Typography>}
        <Stack direction="row" flexWrap="wrap" justifyContent="center" gap={0.5}>
          {me.hand.map((card) => (
            <PlayingCard key={card.id} card={card} faceUp size="sm" />
          ))}
        </Stack>
      </Stack>
    </Stack>
  );
};
