/**
 * The play board for the player whose hand is revealed: piles, opponents, own hand and actions
 * [ID: UI-CABO-TABLE]
 *
 * Taps map to engine actions: a hand card swaps (after a draw), peeks (7/8) or is the first
 * half of a blind swap (J/Q); an opponent card completes a 9/10 peek or the blind swap.
 */
import React, { useState } from 'react';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { CaboAction, CaboState, Power } from '../logic/types';
import { CaboCard } from './CaboCard';
import { CaboOpponent } from './CaboOpponent';

interface CaboTableProps {
  game: CaboState;
  onAct: (action: CaboAction) => void;
}

const POWER_HINT_KEY: Record<Power, string> = {
  peek_own: 'games.cabo.hint.power.peek_own',
  peek_other: 'games.cabo.hint.power.peek_other',
  blind_swap: 'games.cabo.hint.power.blind_swap',
};

export const CaboTable: React.FC<CaboTableProps> = ({ game, onAct }) => {
  const { t } = useTranslation();
  // First half of a blind swap: the own card picked, waiting for an opponent card.
  const [pendingOwn, setPendingOwn] = useState<number | null>(null);

  const act = (action: CaboAction) => {
    setPendingOwn(null);
    onAct(action);
  };

  const current = game.players[game.currentIndex];
  const { phase, power, drawn } = game;
  const caller = game.players.find((p) => p.id === game.callerId);
  const topDiscard = game.discard[game.discard.length - 1];

  const ownPickable =
    phase === 'drawn' || (phase === 'power' && (power === 'peek_own' || power === 'blind_swap'));
  const opponentPickable =
    phase === 'power' &&
    (power === 'peek_other' || (power === 'blind_swap' && pendingOwn !== null));

  const onOwnSlot = (slot: number) => {
    if (phase === 'drawn') act({ type: 'swap', slot });
    else if (power === 'peek_own') act({ type: 'power_peek_own', slot });
    else if (power === 'blind_swap') setPendingOwn(slot);
  };

  const onOpponentSlot = (targetId: string, slot: number) => {
    if (power === 'peek_other') act({ type: 'power_peek_other', targetId, slot });
    else if (power === 'blind_swap' && pendingOwn !== null) {
      act({ type: 'power_blind_swap', slot: pendingOwn, targetId, targetSlot: slot });
    }
  };

  let hint = '';
  if (phase === 'turn') hint = t('games.cabo.hint.turn');
  else if (phase === 'drawn')
    hint =
      drawn?.source === 'discard'
        ? t('games.cabo.hint.must_swap')
        : t('games.cabo.hint.swap_or_discard');
  else if (phase === 'power' && power)
    hint =
      power === 'blind_swap' && pendingOwn !== null
        ? t('games.cabo.hint.power.blind_pick_other')
        : t(POWER_HINT_KEY[power]);

  return (
    <Stack spacing={2} sx={{ width: '100%' }}>
      <Typography variant="h6" textAlign="center" fontWeight={700} aria-live="polite">
        {t('games.cabo.table.turn_of', { name: current.name })}
      </Typography>

      {caller && (
        <Alert severity="warning">{t('games.cabo.table.cabo_called', { name: caller.name })}</Alert>
      )}

      <Stack spacing={1}>
        {game.players.map((p, i) =>
          i === game.currentIndex ? null : (
            <CaboOpponent
              key={p.id}
              player={p}
              isActive={false}
              isCaller={p.id === game.callerId}
              selectable={opponentPickable}
              onPickCard={(slot) => onOpponentSlot(p.id, slot)}
            />
          ),
        )}
      </Stack>

      <Stack direction="row" spacing={3} justifyContent="center" alignItems="center">
        <Stack alignItems="center" spacing={0.5}>
          <CaboCard
            faceUp={false}
            onClick={phase === 'turn' ? () => act({ type: 'draw', source: 'deck' }) : undefined}
          />
          <Typography variant="caption" color="text.secondary">
            {t('games.cabo.table.draw_pile', { count: game.deck.length })}
          </Typography>
        </Stack>
        <Stack alignItems="center" spacing={0.5}>
          {topDiscard && (
            <CaboCard
              card={topDiscard}
              faceUp
              onClick={
                phase === 'turn' ? () => act({ type: 'draw', source: 'discard' }) : undefined
              }
            />
          )}
          <Typography variant="caption" color="text.secondary">
            {t('games.cabo.table.discard_pile')}
          </Typography>
        </Stack>
        {phase === 'drawn' && drawn && (
          <Stack alignItems="center" spacing={0.5}>
            <CaboCard card={drawn.card} faceUp highlighted />
            <Typography variant="caption" color="text.secondary">
              {t('games.cabo.table.drawn')}
            </Typography>
          </Stack>
        )}
      </Stack>

      {hint && (
        <Typography textAlign="center" color="text.secondary" role="status">
          {hint}
        </Typography>
      )}

      <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
        {phase === 'turn' && (
          <>
            <Button variant="contained" onClick={() => act({ type: 'draw', source: 'deck' })}>
              {t('games.cabo.actions.draw_deck')}
            </Button>
            <Button variant="outlined" onClick={() => act({ type: 'draw', source: 'discard' })}>
              {t('games.cabo.actions.draw_discard')}
            </Button>
            {!game.callerId && (
              <Button variant="outlined" color="warning" onClick={() => act({ type: 'call_cabo' })}>
                {t('games.cabo.actions.call_cabo')}
              </Button>
            )}
          </>
        )}
        {phase === 'drawn' && drawn?.source === 'deck' && (
          <Button variant="outlined" onClick={() => act({ type: 'discard_drawn' })}>
            {t('games.cabo.actions.discard')}
          </Button>
        )}
        {phase === 'power' && (
          <Button variant="outlined" onClick={() => act({ type: 'skip_power' })}>
            {t('games.cabo.actions.skip_power')}
          </Button>
        )}
      </Stack>

      <Box sx={{ textAlign: 'center' }}>
        <Typography fontWeight={700}>
          {t('games.cabo.table.own_hand', { name: current.name, score: current.totalScore })}
        </Typography>
      </Box>
      <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
        {current.hand.map((card, slot) => (
          <CaboCard
            key={card.id}
            card={card}
            faceUp={current.memory.includes(card.id)}
            selected={pendingOwn === slot}
            highlighted={ownPickable}
            onClick={ownPickable ? () => onOwnSlot(slot) : undefined}
          />
        ))}
      </Stack>
    </Stack>
  );
};
