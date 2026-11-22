/**
 * The answer to the own view request [ID: GAME-TABLETOP-REQUEST-RESULT]
 *
 * #557: shows the cards another player revealed to this seat only (their faces arrive in this
 * seat's sealed box), or that the request was rejected. Closing dismisses it on the host, which
 * stops sealing those faces for this seat.
 */
import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { TabletopWidget } from '../../logic/types';
import type { ViewRequest } from '../../logic/handRequests';
import { MiniCardRow } from './MiniCardRow';

interface RequestResultDialogProps {
  result: ViewRequest | undefined;
  ownerName: string;
  widgets: Record<string, TabletopWidget>;
  onDismiss: (to: number) => void;
}

export const RequestResultDialog: React.FC<RequestResultDialogProps> = ({
  result,
  ownerName,
  widgets,
  onDismiss,
}) => {
  const { t } = useTranslation();
  if (!result || result.status === 'pending') return null;
  const dismiss = () => onDismiss(result.to);
  return (
    <Dialog open onClose={dismiss} fullWidth maxWidth="xs">
      <DialogTitle>
        {result.status === 'shown'
          ? t('games.tabletop.handRequests.shownTitle', { name: ownerName })
          : t('games.tabletop.handRequests.rejectedTitle', { name: ownerName })}
      </DialogTitle>
      <DialogContent>
        {result.status === 'shown' ? (
          <>
            <MiniCardRow cardIds={result.cardIds} widgets={widgets} faceUp />
            <Typography variant="caption" color="text.secondary">
              {t('games.tabletop.handRequests.onlyYou')}
            </Typography>
          </>
        ) : (
          <Typography variant="body2">
            {t('games.tabletop.handRequests.rejectedBody', { name: ownerName })}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={dismiss}>
          {t('common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
