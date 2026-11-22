/**
 * Ask to see cards in another player's hand [ID: GAME-TABLETOP-VIEW-REQUEST-DIALOG]
 *
 * #557: pick a player, then cards by position (backs) or "any N cards". Sending again while the
 * request is pending extends or reduces it; "Withdraw" cancels it.
 */
import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { TabletopWidget } from '../../logic/types';
import { toggleAskedCard, type ViewAsk, type ViewRequest } from '../../logic/handRequests';
import type { HandSeat } from '../../hooks/useHandRequests';
import { MiniCardRow } from './MiniCardRow';

interface ViewRequestDialogProps {
  open: boolean;
  onClose: () => void;
  others: HandSeat[];
  /** This seat's pending requests. */
  outgoing: ViewRequest[];
  widgets: Record<string, TabletopWidget>;
  onAsk: (to: number, ask: ViewAsk | null) => void;
}

const pendingAsk = (r: ViewRequest | undefined): ViewAsk | null =>
  r?.status === 'pending' ? r.ask : null;

export const ViewRequestDialog: React.FC<ViewRequestDialogProps> = ({
  open,
  onClose,
  others,
  outgoing,
  widgets,
  onAsk,
}) => {
  const { t } = useTranslation();
  const [to, setTo] = useState<number | null>(null);
  const owner = others.find((o) => o.seat === to) ?? others[0];
  const pending = outgoing.find((r) => r.to === owner?.seat);
  // The draft starts from the pending request and is kept per player while the dialog is open.
  const [drafts, setDrafts] = useState<Record<number, ViewAsk | null>>({});
  if (!owner) return null;
  const draft = owner.seat in drafts ? drafts[owner.seat] : pendingAsk(pending);
  const setDraft = (ask: ViewAsk | null) => setDrafts((d) => ({ ...d, [owner.seat]: ask }));
  const mode = draft?.mode ?? 'cards';
  const handSize = owner.cardIds.length;

  const close = () => {
    setDrafts({});
    onClose();
  };
  const send = (ask: ViewAsk | null) => {
    onAsk(owner.seat, ask);
    close();
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle>{t('games.tabletop.handRequests.askTitle')}</DialogTitle>
      <DialogContent>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={owner.seat}
          onChange={(_, seat: number | null) => seat !== null && setTo(seat)}
          sx={{ flexWrap: 'wrap', mb: 1 }}
        >
          {others.map((o) => (
            <ToggleButton key={o.seat} value={o.seat}>
              {o.name} ({o.cardIds.length})
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={mode}
          onChange={(_, next: ViewAsk['mode'] | null) =>
            next && setDraft(next === 'count' ? { mode: 'count', count: 1 } : null)
          }
        >
          <ToggleButton value="cards">{t('games.tabletop.handRequests.modeCards')}</ToggleButton>
          <ToggleButton value="count" disabled={handSize === 0}>
            {t('games.tabletop.handRequests.modeCount')}
          </ToggleButton>
        </ToggleButtonGroup>

        {mode === 'cards' ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              {t('games.tabletop.handRequests.pickHint', { name: owner.name })}
            </Typography>
            <MiniCardRow
              cardIds={owner.cardIds}
              widgets={widgets}
              faceUp={false}
              selected={draft?.mode === 'cards' ? draft.cardIds : []}
              onToggle={(id) => setDraft(toggleAskedCard(draft, id))}
            />
          </>
        ) : (
          <Box sx={{ px: 1.5, pt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {t('games.tabletop.handRequests.countLabel', {
                count: draft?.mode === 'count' ? draft.count : 1,
              })}
            </Typography>
            <Slider
              min={1}
              max={Math.max(1, handSize)}
              step={1}
              marks
              value={draft?.mode === 'count' ? draft.count : 1}
              onChange={(_, v) => setDraft({ mode: 'count', count: v as number })}
              valueLabelDisplay="auto"
              aria-label={t('games.tabletop.handRequests.modeCount')}
            />
          </Box>
        )}

        {pending && (
          <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
            {t('games.tabletop.handRequests.waiting', { name: owner.name })}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        {pending && (
          <Button color="inherit" onClick={() => send(null)}>
            {t('games.tabletop.handRequests.withdraw')}
          </Button>
        )}
        <Button color="inherit" onClick={close}>
          {t('common.cancel')}
        </Button>
        <Button variant="contained" onClick={() => send(draft)} disabled={!draft}>
          {pending
            ? t('games.tabletop.handRequests.update')
            : t('games.tabletop.handRequests.send')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
