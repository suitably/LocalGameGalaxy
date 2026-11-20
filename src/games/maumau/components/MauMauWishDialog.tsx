/**
 * Suit chooser shown after a jack; cannot be dismissed without a choice [ID: UI-MAUMAU-WISH]
 */
import React from 'react';
import { Button, Dialog, DialogContent, DialogTitle, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { SUITS, SUIT_SYMBOL, type Suit } from '../../../modules/playing-cards';

interface MauMauWishDialogProps {
  open: boolean;
  onPick: (suit: Suit) => void;
}

export const MauMauWishDialog: React.FC<MauMauWishDialogProps> = ({ open, onPick }) => {
  const { t } = useTranslation();
  return (
    <Dialog open={open} aria-labelledby="maumau-wish-title">
      <DialogTitle id="maumau-wish-title">{t('games.maumau.wish_dialog.title')}</DialogTitle>
      <DialogContent>
        <Stack spacing={1} sx={{ minWidth: 220, pt: 1 }}>
          {SUITS.map((suit) => (
            <Button
              key={suit}
              variant="outlined"
              size="large"
              color={suit === 'hearts' || suit === 'diamonds' ? 'error' : 'inherit'}
              onClick={() => onPick(suit)}
            >
              {SUIT_SYMBOL[suit]} {t(`games.maumau.suit.${suit}`)}
            </Button>
          ))}
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
