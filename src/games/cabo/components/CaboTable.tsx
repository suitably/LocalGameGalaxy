/**
 * The play board for the player whose turn it is: piles, opponents, own hand and actions
 * [ID: UI-CABO-TABLE]
 *
 * Taps map to engine actions: a hand card swaps (after a draw), peeks (7/8) or is the first
 * half of a blind swap (J/Q); an opponent card completes a 9/10 peek or the blind swap. Which
 * cards are face up comes from `isCardVisible` (classic play shows only what is being looked at).
 */
import React, { useState } from 'react';
import { Alert, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { PlayingCard } from '../../../modules/playing-cards';
import { isCardVisible } from '../logic/visibility';
import type { CaboAction, CaboState } from '../logic/types';
import { CaboActions } from './CaboActions';
import { CaboOpponent } from './CaboOpponent';

interface CaboTableProps {
  game: CaboState;
  /** The current player still has to look at their bottom two cards. */
  startPeek: boolean;
  onAct: (action: CaboAction) => void;
  onAckStartPeek: () => void;
}

export const CaboTable: React.FC<CaboTableProps> = ({ game, startPeek, onAct, onAckStartPeek }) => {
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
  const canDrawDeck = game.deck.length > 0 || game.discard.length > 1;
  const visible = (ownerId: string, slot: number) =>
    isCardVisible(game, current.id, ownerId, slot, startPeek);

  const ownPickable =
    !startPeek &&
    (phase === 'drawn' || (phase === 'power' && (power === 'peek_own' || power === 'blind_swap')));
  const opponentPickable =
    phase === 'power' &&
    (power === 'peek_other' || (power === 'blind_swap' && pendingOwn !== null));
  const pileAction = phase === 'turn' && !startPeek;

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
              isCaller={p.id === game.callerId}
              selectable={opponentPickable}
              isVisible={(slot) => visible(p.id, slot)}
              onPickCard={(slot) => onOpponentSlot(p.id, slot)}
            />
          ),
        )}
      </Stack>

      <Stack direction="row" spacing={3} justifyContent="center" alignItems="center">
        <Stack alignItems="center" spacing={0.5}>
          <PlayingCard
            faceUp={false}
            label={t('games.cabo.table.draw_pile', { count: game.deck.length })}
            onClick={
              pileAction && canDrawDeck ? () => act({ type: 'draw', source: 'deck' }) : undefined
            }
          />
          <Typography variant="caption" color="text.secondary">
            {t('games.cabo.table.draw_pile', { count: game.deck.length })}
          </Typography>
        </Stack>
        <Stack alignItems="center" spacing={0.5}>
          {topDiscard && (
            <PlayingCard
              card={topDiscard}
              faceUp
              onClick={pileAction ? () => act({ type: 'draw', source: 'discard' }) : undefined}
            />
          )}
          <Typography variant="caption" color="text.secondary">
            {t('games.cabo.table.discard_pile')}
          </Typography>
        </Stack>
        {phase === 'drawn' && drawn && (
          <Stack alignItems="center" spacing={0.5}>
            <PlayingCard card={drawn.card} faceUp highlighted />
            <Typography variant="caption" color="text.secondary">
              {t('games.cabo.table.drawn')}
            </Typography>
          </Stack>
        )}
      </Stack>

      <CaboActions
        game={game}
        startPeek={startPeek}
        pendingOwn={pendingOwn}
        onAct={act}
        onAckStartPeek={onAckStartPeek}
      />

      <Typography fontWeight={700} textAlign="center">
        {t('games.cabo.table.own_hand', { name: current.name, score: current.totalScore })}
      </Typography>
      <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
        {current.hand.map((card, slot) => {
          const faceUp = visible(current.id, slot);
          return (
            <PlayingCard
              key={card.id}
              card={card}
              faceUp={faceUp}
              selected={pendingOwn === slot}
              highlighted={ownPickable}
              label={faceUp ? undefined : t('games.cabo.card.own_slot', { n: slot + 1 })}
              onClick={ownPickable ? () => onOwnSlot(slot) : undefined}
            />
          );
        })}
      </Stack>
    </Stack>
  );
};
