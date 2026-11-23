/**
 * A row of small hand cards for hand requests [ID: GAME-TABLETOP-MINI-CARD-ROW]
 *
 * #557: backs by position (asking), the own hand with asked cards marked (answering) or the
 * shown faces (result). A card with `onToggle` is a toggle button.
 */
import React from 'react';
import { Box, ButtonBase } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { CardWidget, TabletopWidget } from '../../logic/types';
import { PlayingCardFace } from '../widgets/PlayingCardFace';

const W = 48;
const H = 72;

interface MiniCardRowProps {
  cardIds: string[];
  widgets: Record<string, TabletopWidget>;
  /** Faces (own hand, shown cards) or backs (another seat's hand). */
  faceUp: boolean;
  /** Selected cards: raised, primary outline. */
  selected?: string[];
  /** Marked cards (asked for): secondary outline. */
  marked?: string[];
  onToggle?: (cardId: string) => void;
}

export const MiniCardRow: React.FC<MiniCardRowProps> = ({
  cardIds,
  widgets,
  faceUp,
  selected = [],
  marked = [],
  onToggle,
}) => {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: 'flex', gap: 0.75, overflowX: 'auto', py: 1.5, px: 0.5 }}>
      {cardIds.map((id, i) => {
        const card = widgets[id] as CardWidget | undefined;
        if (card?.type !== 'card') return null;
        const isSelected = selected.includes(id);
        const isMarked = marked.includes(id);
        return (
          <ButtonBase
            key={id}
            disabled={!onToggle}
            onClick={() => onToggle?.(id)}
            aria-pressed={onToggle ? isSelected : undefined}
            aria-label={t('games.tabletop.handRequests.cardN', { n: i + 1 })}
            sx={{
              flexShrink: 0,
              width: W,
              height: H,
              borderRadius: 1.5,
              overflow: 'hidden',
              outline: '3px solid',
              outlineColor: isSelected ? 'primary.main' : isMarked ? 'warning.main' : 'transparent',
              transform: isSelected ? 'translateY(-8px)' : 'none',
              transition: 'transform 0.15s',
            }}
          >
            <PlayingCardFace
              frontContent={card.frontContent}
              backContent={card.backContent}
              isFaceUp={faceUp}
              label={faceUp ? card.label : undefined}
              width={W}
              height={H}
            />
          </ButtonBase>
        );
      })}
    </Box>
  );
};
