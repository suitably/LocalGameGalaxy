/**
 * The middle of the table: open cards, tricks, stock [ID: COMP-TABLETOP-SCRIPT-PILES]
 */
import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import type { CardId } from '../logic/cardDeck';
import type { PileView } from '../logic/scriptTypes';
import type { ScriptTextFn } from '../hooks/useScriptText';
import { PlayingCard } from './PlayingCard';

interface TablePilesProps {
  piles: PileView[];
  names: string[];
  targets: CardId[];
  target: CardId | null;
  onTarget: (card: CardId) => void;
  text: ScriptTextFn;
  cardWidth: number;
}

const dealIn = {
  '@keyframes scriptedDealIn': {
    from: { opacity: 0, transform: 'translateY(14px) scale(0.92)' },
    to: { opacity: 1, transform: 'none' },
  },
  animation: 'scriptedDealIn 220ms ease-out',
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
};

export const TablePiles: React.FC<TablePilesProps> = ({
  piles,
  names,
  targets,
  target,
  onTarget,
  text,
  cardWidth,
}) => (
  <Stack direction="row" gap={2.5} alignItems="center" justifyContent="center" flexWrap="wrap">
    {piles.map((pile) =>
      pile.kind === 'stock' ? (
        (pile.count ?? 0) > 0 || pile.cards.length > 0 ? (
          <Stack key={pile.id} alignItems="center" gap={0.5}>
            <Stack direction="row" alignItems="center">
              {pile.cards.map((card) => (
                <Box key={card.id} sx={{ mr: -cardWidth / 16 }}>
                  <PlayingCard card={card.id} width={Math.round(cardWidth * 0.8)} />
                </Box>
              ))}
              {(pile.count ?? 0) > 0 && <PlayingCard width={Math.round(cardWidth * 0.8)} />}
            </Stack>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              {pile.label ? `${text(pile.label)} · ` : ''}
              {pile.count}
            </Typography>
          </Stack>
        ) : null
      ) : (
        <Stack key={pile.id} direction="row" gap={1} flexWrap="wrap" justifyContent="center">
          {pile.cards.map((card) => (
            <Stack key={card.id} alignItems="center" gap={0.25} sx={dealIn}>
              <Box sx={{ position: 'relative', pb: card.cover ? `${cardWidth * 0.35}px` : 0 }}>
                <PlayingCard
                  card={card.id}
                  width={cardWidth}
                  selected={target === card.id}
                  highlighted={targets.includes(card.id)}
                  onClick={targets.includes(card.id) ? () => onTarget(card.id) : undefined}
                />
                {card.cover && (
                  <Box
                    sx={{
                      position: 'absolute',
                      left: cardWidth * 0.18,
                      top: cardWidth * 0.35,
                      ...dealIn,
                    }}
                  >
                    <PlayingCard card={card.cover} width={cardWidth} />
                  </Box>
                )}
              </Box>
              {card.seat !== undefined && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  noWrap
                  sx={{ maxWidth: cardWidth + 8 }}
                >
                  {names[card.seat]}
                </Typography>
              )}
            </Stack>
          ))}
        </Stack>
      ),
    )}
  </Stack>
);
