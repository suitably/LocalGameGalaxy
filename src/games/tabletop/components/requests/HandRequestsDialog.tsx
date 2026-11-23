/**
 * See or give cards: the request dialog of one seat [ID: GAME-TABLETOP-HAND-REQUESTS-DIALOG]
 *
 * #557: tab "See cards" asks another player to show cards (positions on the backs or any N);
 * tab "Give cards" offers own cards (chosen or N random) to another player. One pending request
 * per player and direction; sending again changes it.
 */
import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { TabletopWidget } from '../../logic/types';
import type { OfferPick, OfferRequest, ViewAsk, ViewRequest } from '../../logic/handRequests';
import type { HandSeat } from '../../hooks/useHandRequests';
import { CardPickPanel, type CardPick } from './CardPickPanel';

interface HandRequestsDialogProps {
  open: boolean;
  onClose: () => void;
  others: HandSeat[];
  myCardIds: string[];
  /** This seat's pending view requests and offers. */
  outgoing: ViewRequest[];
  offersOut: OfferRequest[];
  widgets: Record<string, TabletopWidget>;
  onAsk: (to: number, ask: ViewAsk | null) => void;
  onOffer: (to: number, pick: OfferPick | null) => void;
}

const toOffer = (pick: CardPick | null): OfferPick | null =>
  pick?.mode === 'count' ? { mode: 'random', count: pick.count } : pick;

export const HandRequestsDialog: React.FC<HandRequestsDialogProps> = (props) => {
  const { open, onClose, others, myCardIds, widgets } = props;
  const { t } = useTranslation();
  const [tab, setTab] = useState<'see' | 'give'>('see');
  const [to, setTo] = useState<number | null>(null);
  const player = others.find((o) => o.seat === to) ?? others[0];
  if (!player) return null;

  const view = props.outgoing.find((r) => r.to === player.seat);
  const offer = props.offersOut.find((r) => r.to === player.seat);
  const send = (pick: CardPick | null) => {
    if (tab === 'see') props.onAsk(player.seat, pick);
    else props.onOffer(player.seat, toOffer(pick));
    onClose();
  };
  const k = (key: string) => t(`games.tabletop.handRequests.${key}`, { name: player.name });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ pb: 0 }}>{k('askTitle')}</DialogTitle>
      <DialogContent>
        <Tabs value={tab} onChange={(_, next) => setTab(next)} variant="fullWidth" sx={{ mb: 1 }}>
          <Tab value="see" label={k('tabSee')} />
          <Tab value="give" label={k('tabGive')} disabled={myCardIds.length === 0} />
        </Tabs>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={player.seat}
          onChange={(_, seat: number | null) => seat !== null && setTo(seat)}
          sx={{ flexWrap: 'wrap', mb: 1 }}
        >
          {others.map((o) => (
            <ToggleButton key={o.seat} value={o.seat}>
              {o.name} ({o.cardIds.length})
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        {tab === 'see' ? (
          <CardPickPanel
            key={`see-${player.seat}`}
            cardIds={player.cardIds}
            widgets={widgets}
            faceUp={false}
            pending={view?.status === 'pending' ? view.ask : null}
            labels={{
              pickHint: k('pickHint'),
              countMode: k('modeCount'),
              waiting: k('waiting'),
              send: k('send'),
            }}
            onSend={send}
          />
        ) : (
          <CardPickPanel
            key={`give-${player.seat}`}
            cardIds={myCardIds}
            widgets={widgets}
            faceUp
            pending={offer?.status === 'pending' ? { mode: 'cards', cardIds: offer.cardIds } : null}
            labels={{
              pickHint: k('offerHint'),
              countMode: k('modeRandom'),
              waiting: k('offerWaiting'),
              send: k('offerSend'),
            }}
            onSend={send}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>
          {t('common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
