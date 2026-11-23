/**
 * Notices for card offers between seats [ID: GAME-TABLETOP-OFFER-NOTICES]
 *
 * #557: the receiver sees how many cards another player offers (backs only) and accepts — the
 * cards move into the own hand — or rejects; the giver sees a rejection until dismissed.
 */
import React from 'react';
import { Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { TabletopWidget } from '../../logic/types';
import type { OfferAnswer, OfferRequest } from '../../logic/handRequests';
import { MiniCardRow } from './MiniCardRow';
import { NoticeShell } from './NoticeShell';

interface OfferNoticesProps {
  /** The oldest offer waiting for this seat's answer. */
  incoming: OfferRequest | undefined;
  /** The oldest rejection of this seat's own offers. */
  rejected: OfferRequest | undefined;
  nameOf: (seat: number) => string;
  widgets: Record<string, TabletopWidget>;
  onAnswer: (from: number, answer: OfferAnswer) => void;
  onDismiss: (to: number) => void;
}

export const OfferNotices: React.FC<OfferNoticesProps> = ({
  incoming,
  rejected,
  nameOf,
  widgets,
  onAnswer,
  onDismiss,
}) => {
  const { t } = useTranslation();
  if (incoming?.status === 'pending') {
    const { from, cardIds } = incoming;
    return (
      <NoticeShell
        title={t('games.tabletop.handRequests.offerIncoming', {
          name: nameOf(from),
          count: cardIds.length,
        })}
        actions={
          <>
            <Button size="small" color="inherit" onClick={() => onAnswer(from, { type: 'reject' })}>
              {t('games.tabletop.handRequests.reject')}
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={() => onAnswer(from, { type: 'accept' })}
            >
              {t('games.tabletop.handRequests.offerAccept')}
            </Button>
          </>
        }
      >
        <MiniCardRow cardIds={cardIds} widgets={widgets} faceUp={false} />
      </NoticeShell>
    );
  }
  if (!rejected) return null;
  return (
    <NoticeShell
      title={t('games.tabletop.handRequests.offerRejected', { name: nameOf(rejected.to) })}
      actions={
        <Button size="small" variant="contained" onClick={() => onDismiss(rejected.to)}>
          {t('common.close')}
        </Button>
      }
    />
  );
};
