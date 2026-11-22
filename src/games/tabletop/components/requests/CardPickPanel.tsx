/**
 * Pick cards by position or a number of cards [ID: GAME-TABLETOP-CARD-PICK-PANEL]
 *
 * #557: one panel for both directions — asking to see another hand (backs) and offering from the
 * own hand (faces). Sending again while the request is pending changes it; "Withdraw" cancels.
 */
import React, { useState } from 'react';
import { Box, Button, Slider, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { TabletopWidget } from '../../logic/types';
import { toggleAskedCard } from '../../logic/handRequests';
import { MiniCardRow } from './MiniCardRow';

/** Specific cards (by id, chosen by position) or any N cards. */
export type CardPick = { mode: 'cards'; cardIds: string[] } | { mode: 'count'; count: number };

interface CardPickPanelProps {
  cardIds: string[];
  widgets: Record<string, TabletopWidget>;
  /** Own hand (offer) or another seat's backs (view request). */
  faceUp: boolean;
  /** The pick of the pending request, if any; the panel starts from it. */
  pending: CardPick | null;
  labels: { pickHint: string; countMode: string; waiting: string; send: string };
  onSend: (pick: CardPick | null) => void;
}

export const CardPickPanel: React.FC<CardPickPanelProps> = ({
  cardIds,
  widgets,
  faceUp,
  pending,
  labels,
  onSend,
}) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<CardPick | null>(pending);
  const mode = draft?.mode ?? 'cards';
  const count = draft?.mode === 'count' ? draft.count : 1;

  return (
    <>
      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        value={mode}
        onChange={(_, next: CardPick['mode'] | null) =>
          next && setDraft(next === 'count' ? { mode: 'count', count: 1 } : null)
        }
      >
        <ToggleButton value="cards">{t('games.tabletop.handRequests.modeCards')}</ToggleButton>
        <ToggleButton value="count" disabled={cardIds.length === 0}>
          {labels.countMode}
        </ToggleButton>
      </ToggleButtonGroup>

      {mode === 'cards' ? (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            {labels.pickHint}
          </Typography>
          <MiniCardRow
            cardIds={cardIds}
            widgets={widgets}
            faceUp={faceUp}
            selected={draft?.mode === 'cards' ? draft.cardIds : []}
            onToggle={(id) => setDraft(toggleAskedCard(draft, id))}
          />
        </>
      ) : (
        <Box sx={{ px: 1.5, pt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {t('games.tabletop.handRequests.countLabel', { count })}
          </Typography>
          <Slider
            min={1}
            max={Math.max(1, cardIds.length)}
            step={1}
            marks
            value={count}
            onChange={(_, v) => setDraft({ mode: 'count', count: v as number })}
            valueLabelDisplay="auto"
            aria-label={labels.countMode}
          />
        </Box>
      )}

      {pending && (
        <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
          {labels.waiting}
        </Typography>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1.5 }}>
        {pending && (
          <Button color="inherit" onClick={() => onSend(null)}>
            {t('games.tabletop.handRequests.withdraw')}
          </Button>
        )}
        <Button variant="contained" onClick={() => onSend(draft)} disabled={!draft}>
          {pending ? t('games.tabletop.handRequests.update') : labels.send}
        </Button>
      </Box>
    </>
  );
};
