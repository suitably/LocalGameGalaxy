/**
 * Single card item inside HandDockStrip [ID: GAME-TABLETOP-HAND-CARD-ITEM]
 */
import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import ReplyIcon from '@mui/icons-material/Reply';
import { useTranslation } from 'react-i18next';
import type { CardWidget } from '../../logic/types';
import { CardFaceContent } from '../widgets/CardFaceContent';

export const CARD_W = 72;
export const CARD_H = 108;

interface HandCardItemProps {
  card: CardWidget;
  count?: number;
  onReturnToDeck?: (cardId: string, deckId: string) => void;
  onPointerDown?: (e: React.PointerEvent) => void;
}

export const HandCardItem: React.FC<HandCardItemProps> = ({
  card,
  count,
  onReturnToDeck,
  onPointerDown,
}) => {
  const { t } = useTranslation();
  const showFaceObjects = Boolean(card.faceObjects && card.faceObjects.length > 0);
  const showBackFaceObjects = Boolean(!showFaceObjects && card.backFaceObjects && card.backFaceObjects.length > 0);
  const hasClipPath = Boolean(card.clipPath);
  const isUnstyled = Boolean(showFaceObjects || showBackFaceObjects || hasClipPath || card.isTransparent);
  const scale = CARD_W / (card.width || 80);

  return (
    <Box
      onPointerDown={onPointerDown}
      sx={{
        position: 'relative',
        width: CARD_W,
        height: CARD_H,
        flexShrink: 0,
        borderRadius: isUnstyled ? 0 : 1.5,
        cursor: 'grab',
        boxShadow: isUnstyled ? 'none' : '0 4px 10px rgba(0,0,0,0.5)',
        border: isUnstyled ? 'none' : '1.5px solid rgba(255,255,255,0.25)',
        overflow: isUnstyled ? 'visible' : 'hidden',
        bgcolor: isUnstyled ? 'transparent' : '#fff',
        filter: isUnstyled ? 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' : 'none',
        touchAction: 'none',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: isUnstyled ? 'none' : '0 8px 18px rgba(0,0,0,0.7)',
          filter: isUnstyled ? 'drop-shadow(0 8px 18px rgba(0,0,0,0.7))' : 'none',
          borderColor: 'primary.light',
        },
      }}
    >
      <Box
        sx={{
          width: card.width || 80,
          height: card.height || 120,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          pointerEvents: 'none',
        }}
      >
        <CardFaceContent card={card} isFaceUp={true} />
      </Box>

      {card.deckId && onReturnToDeck && (
        <Tooltip title={t('games.tabletop.returnToDeck', 'Zurück ins Deck')}>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onReturnToDeck(card.id, card.deckId!);
            }}
            sx={{
              position: 'absolute',
              top: 2,
              left: 2,
              p: 0.3,
              bgcolor: 'rgba(0,0,0,0.65)',
              color: '#fff',
              zIndex: 25,
              '&:hover': { bgcolor: 'rgba(0,0,0,0.9)' },
            }}
          >
            <ReplyIcon sx={{ fontSize: 13 }} />
          </IconButton>
        </Tooltip>
      )}

      {count && count > 1 ? (
        <Box
          sx={{
            position: 'absolute',
            top: 4,
            right: 4,
            bgcolor: 'primary.main',
            color: '#fff',
            borderRadius: '10px',
            px: 0.7,
            py: 0.1,
            fontSize: '0.72rem',
            fontWeight: 800,
            zIndex: 20,
            pointerEvents: 'none',
            boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
          }}
        >
          {`×${count}`}
        </Box>
      ) : null}
    </Box>
  );
};
