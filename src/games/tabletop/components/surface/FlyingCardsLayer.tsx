import React from 'react';
import { Box } from '@mui/material';
import type { CardWidget, TabletopWidget } from '../../logic/types';
import type { FlyingCardAnimation } from '../../logic/tabletopReducer';
import { PlayingCardFace } from '../widgets/PlayingCardFace';

interface FlyingCardsLayerProps {
  flyingCards: FlyingCardAnimation[];
  widgets: Record<string, TabletopWidget>;
  tableWidth: number;
  tableHeight: number;
  onFinishAnimation: (animationId: string) => void;
}

export const FlyingCardsLayer: React.FC<FlyingCardsLayerProps> = ({
  flyingCards,
  widgets,
  tableWidth,
  tableHeight,
  onFinishAnimation,
}) => {
  if (flyingCards.length === 0) return null;

  return (
    <>
      {flyingCards.map((f) => {
        const card = widgets[f.cardId] as CardWidget | undefined;
        const holder = widgets[f.targetHolderId];
        const targetX = holder ? holder.x + holder.width / 2 - 40 : tableWidth / 2;
        const targetY = holder ? holder.y + holder.height / 2 - 60 : tableHeight / 2;

        return (
          <Box
            key={f.id}
            onAnimationEnd={() => onFinishAnimation(f.id)}
            sx={{
              position: 'absolute',
              left: targetX,
              top: targetY,
              width: 80,
              height: 120,
              borderRadius: 2,
              boxShadow: 10,
              zIndex: 999,
              animation: 'flickFlyIn 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
              '@keyframes flickFlyIn': {
                '0%': { transform: 'translateY(800px) scale(0.5) rotate(15deg)', opacity: 0 },
                '100%': { transform: 'translateY(0) scale(1) rotate(0deg)', opacity: 1 },
              },
              border: '1.5px solid rgba(0,0,0,0.2)',
              overflow: 'hidden',
              bgcolor: '#fff',
            }}
          >
            {card && (
              <PlayingCardFace
                frontContent={card.frontContent}
                backContent={card.backContent}
                isFaceUp={true}
                label={card.label}
                width={80}
                height={120}
              />
            )}
          </Box>
        );
      })}
    </>
  );
};
