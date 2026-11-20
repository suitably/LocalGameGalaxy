/**
 * One playing card, face up or face down, optionally clickable [ID: MOD-PLAYING-CARDS-CARD]
 *
 * Without `onClick` the card renders as a non-interactive element. Sizes keep cards tappable on
 * phones: `sm` for crowded hands, `md` by default.
 */
import React from 'react';
import { Box, ButtonBase } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { SUIT_SYMBOL, isRed } from './deck';
import type { Card } from './types';

export type PlayingCardSize = 'sm' | 'md';

const SIZES: Record<PlayingCardSize, { w: object; h: object; rank: number; suit: number }> = {
  sm: { w: { xs: 44, sm: 52 }, h: { xs: 64, sm: 74 }, rank: 16, suit: 15 },
  md: { w: { xs: 60, sm: 72 }, h: { xs: 86, sm: 102 }, rank: 22, suit: 20 },
};

export interface PlayingCardProps {
  /** Omitted for a face-down pile. */
  card?: Card;
  faceUp: boolean;
  selected?: boolean;
  highlighted?: boolean;
  /** Greyed out (e.g. not playable now) while still showing its face. */
  dimmed?: boolean;
  size?: PlayingCardSize;
  onClick?: () => void;
  /** Overrides the accessible name (default: the card text or "face-down card"). */
  label?: string;
}

export const PlayingCard: React.FC<PlayingCardProps> = ({
  card,
  faceUp,
  selected = false,
  highlighted = false,
  dimmed = false,
  size = 'md',
  onClick,
  label,
}) => {
  const { t } = useTranslation();
  const shown = faceUp && card ? card : null;
  const dims = SIZES[size];
  const rankText = shown?.rank === 'JOKER' ? '★' : (shown?.rank ?? '');
  const suitText = shown?.suit ? SUIT_SYMBOL[shown.suit] : '';
  const name =
    label ??
    (!shown
      ? t('playingCards.faceDown', 'Verdeckte Karte')
      : shown.rank === 'JOKER'
        ? t('playingCards.joker', 'Joker')
        : `${rankText}${suitText}`);

  return (
    <ButtonBase
      component={onClick ? 'button' : 'div'}
      onClick={onClick}
      disabled={!onClick}
      aria-label={name}
      aria-pressed={onClick ? selected : undefined}
      sx={{
        flexShrink: 0,
        width: dims.w,
        height: dims.h,
        borderRadius: 2,
        border: 2,
        borderColor: selected ? 'primary.main' : highlighted ? 'warning.main' : 'divider',
        boxShadow: selected || highlighted ? 4 : 1,
        transition: 'transform 120ms ease, box-shadow 120ms ease',
        transform: selected ? 'translateY(-4px)' : 'none',
        bgcolor: shown ? 'background.paper' : 'primary.dark',
        color: shown ? (isRed(shown) ? 'error.main' : 'text.primary') : 'primary.contrastText',
        opacity: dimmed ? 0.45 : 1,
        fontWeight: 700,
        '&.Mui-disabled': { opacity: dimmed ? 0.45 : 1 },
        '&:not(.Mui-disabled):active': { transform: 'scale(0.97)' },
      }}
    >
      {shown ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
          <Box component="span" sx={{ fontSize: dims.rank }}>
            {rankText}
          </Box>
          <Box component="span" sx={{ fontSize: dims.suit }}>
            {suitText}
          </Box>
        </Box>
      ) : (
        <Box component="span" sx={{ fontSize: dims.rank, opacity: 0.6 }}>
          ?
        </Box>
      )}
    </ButtonBase>
  );
};
