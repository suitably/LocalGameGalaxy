/**
 * Hint line and action buttons for the current Cabo phase [ID: UI-CABO-ACTIONS]
 */
import React from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { CaboAction, CaboState, Power } from '../logic/types';

interface CaboActionsProps {
  game: CaboState;
  startPeek: boolean;
  /** Own card picked as the first half of a blind swap. */
  pendingOwn: number | null;
  onAct: (action: CaboAction) => void;
  onAckStartPeek: () => void;
}

const POWER_HINT_KEY: Record<Power, string> = {
  peek_own: 'games.cabo.hint.power.peek_own',
  peek_other: 'games.cabo.hint.power.peek_other',
  blind_swap: 'games.cabo.hint.power.blind_swap',
};

export const CaboActions: React.FC<CaboActionsProps> = ({
  game,
  startPeek,
  pendingOwn,
  onAct,
  onAckStartPeek,
}) => {
  const { t } = useTranslation();
  const { phase, power, drawn } = game;
  const canDrawDeck = game.deck.length > 0 || game.discard.length > 1;

  let hint: string;
  if (startPeek) hint = t('games.cabo.hint.start_peek');
  else if (phase === 'turn') hint = t('games.cabo.hint.turn');
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
  else if (phase === 'reveal') hint = t('games.cabo.hint.reveal');
  else hint = '';

  return (
    <Stack spacing={1.5} alignItems="center">
      {hint && (
        <Typography textAlign="center" color="text.secondary" role="status">
          {hint}
        </Typography>
      )}
      <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
        {startPeek && (
          <Button variant="contained" onClick={onAckStartPeek}>
            {t('games.cabo.actions.got_it')}
          </Button>
        )}
        {!startPeek && phase === 'turn' && (
          <>
            <Button
              variant="contained"
              disabled={!canDrawDeck}
              onClick={() => onAct({ type: 'draw', source: 'deck' })}
            >
              {t('games.cabo.actions.draw_deck')}
            </Button>
            <Button
              variant="outlined"
              disabled={game.discard.length === 0}
              onClick={() => onAct({ type: 'draw', source: 'discard' })}
            >
              {t('games.cabo.actions.draw_discard')}
            </Button>
            {!game.callerId && (
              <Button
                variant="outlined"
                color="warning"
                onClick={() => onAct({ type: 'call_cabo' })}
              >
                {t('games.cabo.actions.call_cabo')}
              </Button>
            )}
          </>
        )}
        {phase === 'drawn' && drawn?.source === 'deck' && (
          <Button variant="outlined" onClick={() => onAct({ type: 'discard_drawn' })}>
            {t('games.cabo.actions.discard')}
          </Button>
        )}
        {phase === 'power' && (
          <Button variant="outlined" onClick={() => onAct({ type: 'skip_power' })}>
            {t('games.cabo.actions.skip_power')}
          </Button>
        )}
        {phase === 'reveal' && (
          <Button variant="contained" onClick={() => onAct({ type: 'end_turn' })}>
            {t('games.cabo.actions.end_turn')}
          </Button>
        )}
      </Stack>
    </Stack>
  );
};
