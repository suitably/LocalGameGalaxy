/**
 * Enlarged view of one hand card or the whole hand [ID: GAME-TABLETOP-CARD-ZOOM]
 *
 * Opened by a tap on a dock card (one card) or the dock's zoom button (whole hand). In the
 * hand view a tap on a card opens it alone; the single view offers play and return actions.
 */
import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/CloseRounded';
import ArrowBackIcon from '@mui/icons-material/ArrowBackRounded';
import PlayArrowIcon from '@mui/icons-material/PlayArrowRounded';
import ReplyIcon from '@mui/icons-material/ReplyRounded';
import { useTranslation } from 'react-i18next';
import type { CardWidget } from '../../logic/types';
import { HandCardItem } from './HandCardItem';

export type CardZoomTarget = { kind: 'card'; cardId: string } | { kind: 'hand' } | null;

interface CardZoomDialogProps {
  target: CardZoomTarget;
  cards: CardWidget[];
  onClose: () => void;
  onPlay?: (cardId: string) => void;
  onReturnToDeck?: (cardId: string, deckId: string) => void;
}

const singleWidth = () =>
  Math.round(Math.min(260, (typeof window !== 'undefined' ? window.innerWidth : 360) * 0.66));

export const CardZoomDialog: React.FC<CardZoomDialogProps> = ({
  target,
  cards,
  onClose,
  onPlay,
  onReturnToDeck,
}) => {
  const { t } = useTranslation();
  // A card picked inside the hand view; the hand view stays underneath for "back".
  const [picked, setPicked] = useState<string | null>(null);
  const close = () => {
    setPicked(null);
    onClose();
  };

  const cardId = picked ?? (target?.kind === 'card' ? target.cardId : null);
  const card = cardId ? cards.find((c) => c.id === cardId) : undefined;
  const showHand = target?.kind === 'hand' && !card;

  return (
    <Dialog open={Boolean(target)} onClose={close} maxWidth="md" fullWidth={showHand}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 6 }}>
        {picked && target?.kind === 'hand' && (
          <IconButton
            size="small"
            onClick={() => setPicked(null)}
            aria-label={t('games.tabletop.backToHand', 'Zurück zur Hand')}
          >
            <ArrowBackIcon />
          </IconButton>
        )}
        {card?.label ||
          (showHand
            ? `${t('games.tabletop.yourHand', 'Deine Hand')} (${cards.length})`
            : t('games.tabletop.cardZoom', 'Karte'))}
        <IconButton
          onClick={close}
          aria-label={t('common.close', 'Schließen')}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', justifyContent: 'center' }}>
        {card ? (
          <HandCardItem card={card} width={singleWidth()} />
        ) : showHand ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))',
              gap: 1.5,
              width: '100%',
              justifyItems: 'center',
            }}
          >
            {cards.map((c) => (
              <Box
                key={c.id}
                role="button"
                tabIndex={0}
                onClick={() => setPicked(c.id)}
                onKeyDown={(e) => e.key === 'Enter' && setPicked(c.id)}
                sx={{ cursor: 'zoom-in' }}
              >
                <HandCardItem card={c} width={112} />
              </Box>
            ))}
          </Box>
        ) : null}
      </DialogContent>
      {card && (onPlay || (card.deckId && onReturnToDeck)) && (
        <DialogActions>
          {card.deckId && onReturnToDeck && (
            <Button
              startIcon={<ReplyIcon />}
              onClick={() => {
                onReturnToDeck(card.id, card.deckId!);
                close();
              }}
            >
              {t('games.tabletop.returnToDeck', 'Zurück ins Deck')}
            </Button>
          )}
          {onPlay && (
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={() => {
                onPlay(card.id);
                close();
              }}
            >
              {t('games.tabletop.play_card', 'Auf Tisch legen')}
            </Button>
          )}
        </DialogActions>
      )}
    </Dialog>
  );
};
