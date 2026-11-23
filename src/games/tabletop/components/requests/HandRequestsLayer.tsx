/**
 * Seeing and giving hand cards between players, for one seat [ID: GAME-TABLETOP-HAND-REQUESTS-LAYER]
 *
 * #557: an eye button (rendered where the parent places it) opens the see / give dialog; the
 * notices (one at a time: view requests first, then offers) and the view result are portals. Spectators and seatless views get
 * nothing. In pass and play the parent unmounts it while the handover cover is up.
 */
import React, { useState } from 'react';
import { Badge, IconButton, Tooltip, type SxProps, type Theme } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/VisibilityRounded';
import { useTranslation } from 'react-i18next';
import type { TabletopAction } from '../../logic/tabletopReducer';
import type { TabletopGameDefinition } from '../../logic/types';
import { requestKey } from '../../logic/handRequests';
import { useHandRequests } from '../../hooks/useHandRequests';
import { HandRequestsDialog } from './HandRequestsDialog';
import { IncomingRequestNotice } from './IncomingRequestNotice';
import { RequestResultDialog } from './RequestResultDialog';
import { OfferNotices } from './OfferNotices';

interface HandRequestsLayerProps {
  game: Pick<TabletopGameDefinition, 'widgets' | 'handRequests'>;
  /** This view's seat; `null` = spectator or table only. */
  seat: number | null;
  dispatch: React.Dispatch<TabletopAction>;
  readOnly?: boolean;
  /** Placement of the eye button (e.g. floating in pass and play). */
  buttonSx?: SxProps<Theme>;
}

export const HandRequestsLayer: React.FC<HandRequestsLayerProps> = ({
  game,
  seat,
  dispatch,
  readOnly = false,
  buttonSx,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const requests = useHandRequests(game, readOnly ? null : seat, dispatch);
  const { others, incoming, outgoing, results, nameOf } = requests;
  if (others.length === 0) return null;
  const notice = incoming[0];
  const result = results[0];

  return (
    <>
      <Tooltip title={t('games.tabletop.handRequests.button')}>
        <IconButton
          size="small"
          aria-label={t('games.tabletop.handRequests.button')}
          onClick={() => setOpen(true)}
          sx={buttonSx}
        >
          <Badge badgeContent={outgoing.length + requests.offersOut.length} color="primary">
            <VisibilityIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>
      <HandRequestsDialog
        open={open}
        onClose={() => setOpen(false)}
        others={others}
        myCardIds={requests.myCardIds}
        outgoing={outgoing}
        offersOut={requests.offersOut}
        widgets={game.widgets}
        onAsk={requests.ask}
        onOffer={requests.offer}
      />
      {notice ? (
        <IncomingRequestNotice
          key={requestKey(notice.kind, notice.from, notice.to)}
          request={notice}
          fromName={nameOf(notice.from)}
          myCardIds={requests.myCardIds}
          widgets={game.widgets}
          onAnswer={requests.answer}
        />
      ) : (
        <OfferNotices
          incoming={requests.offersIn[0]}
          rejected={requests.offersRejected[0]}
          nameOf={nameOf}
          widgets={game.widgets}
          onAnswer={requests.answerOffer}
          onDismiss={(to) => requests.close(to, 'offer')}
        />
      )}
      <RequestResultDialog
        result={result}
        ownerName={result ? nameOf(result.to) : ''}
        widgets={game.widgets}
        onDismiss={(to) => requests.close(to, 'view')}
      />
    </>
  );
};
