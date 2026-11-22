/**
 * Non-blocking notice for a request to see the own hand [ID: GAME-TABLETOP-INCOMING-REQUEST]
 *
 * #557: the owner sees who asks and which cards (marked in the own hand) and shows them, a random
 * pick, a chosen subset, or rejects. The table stays usable while it is open.
 */
import React, { useState } from 'react';
import { Button, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { TabletopWidget } from '../../logic/types';
import { askSize, type ViewAnswer, type ViewRequest } from '../../logic/handRequests';
import { MiniCardRow } from './MiniCardRow';
import { NoticeShell } from './NoticeShell';

interface IncomingRequestNoticeProps {
  /** The oldest request waiting for this seat's answer, if any. */
  request: ViewRequest | undefined;
  /** Name of the requesting seat. */
  fromName: string;
  myCardIds: string[];
  widgets: Record<string, TabletopWidget>;
  onAnswer: (from: number, answer: ViewAnswer) => void;
}

export const IncomingRequestNotice: React.FC<IncomingRequestNoticeProps> = ({
  request,
  fromName,
  myCardIds,
  widgets,
  onAnswer,
}) => {
  const { t } = useTranslation();
  /** Cards the owner picks to show instead; `null` = not choosing. */
  const [choice, setChoice] = useState<string[] | null>(null);
  const ask = request?.status === 'pending' ? request.ask : null;
  if (!request || !ask) return null;

  const asked = ask.mode === 'cards' ? ask.cardIds : [];
  const count = askSize(ask);
  const reply = (answer: ViewAnswer) => {
    setChoice(null);
    onAnswer(request.from, answer);
  };
  const toggle = (id: string) =>
    setChoice((c) => (c?.includes(id) ? c.filter((x) => x !== id) : [...(c ?? []), id]));

  return (
    <NoticeShell
      title={
        ask.mode === 'cards'
          ? t('games.tabletop.handRequests.incomingCards', { name: fromName, count })
          : t('games.tabletop.handRequests.incomingCount', { name: fromName, count })
      }
      actions={
        <>
          <Button size="small" color="inherit" onClick={() => reply({ type: 'reject' })}>
            {t('games.tabletop.handRequests.reject')}
          </Button>
          {choice ? (
            <>
              <Button size="small" color="inherit" onClick={() => setChoice(null)}>
                {t('common.cancel')}
              </Button>
              <Button
                size="small"
                variant="contained"
                disabled={choice.length === 0}
                onClick={() => reply({ type: 'subset', cardIds: choice })}
              >
                {t('games.tabletop.handRequests.showSelected', { count: choice.length })}
              </Button>
            </>
          ) : (
            <>
              <Button size="small" color="inherit" onClick={() => setChoice(asked)}>
                {t('games.tabletop.handRequests.choose')}
              </Button>
              {ask.mode === 'cards' && (
                <Button size="small" onClick={() => reply({ type: 'random', count })}>
                  {t('games.tabletop.handRequests.random', { count })}
                </Button>
              )}
              <Button size="small" variant="contained" onClick={() => reply({ type: 'accept' })}>
                {ask.mode === 'cards'
                  ? t('games.tabletop.handRequests.accept')
                  : t('games.tabletop.handRequests.random', { count })}
              </Button>
            </>
          )}
        </>
      }
    >
      {choice && (
        <Typography variant="caption" color="text.secondary">
          {t('games.tabletop.handRequests.chooseHint')}
        </Typography>
      )}
      <MiniCardRow
        cardIds={myCardIds}
        widgets={widgets}
        faceUp
        marked={asked}
        selected={choice ?? []}
        onToggle={choice ? toggle : undefined}
      />
    </NoticeShell>
  );
};
