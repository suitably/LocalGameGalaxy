/**
 * One Cabo card, face up or face down, optionally clickable [ID: UI-CABO-CARD]
 */
import React from 'react';
import { ButtonBase } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { Card, Suit } from '../logic/types';

const SUIT_SYMBOL: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

interface CaboCardProps {
  /** Omitted for the face-down draw pile. */
  card?: Card;
  faceUp: boolean;
  selected?: boolean;
  highlighted?: boolean;
  onClick?: () => void;
}

export const CaboCard: React.FC<CaboCardProps> = ({
  card,
  faceUp,
  selected = false,
  highlighted = false,
  onClick,
}) => {
  const { t } = useTranslation();
  const shown = faceUp && card ? card : null;
  const isRed = shown?.suit === 'hearts' || shown?.suit === 'diamonds';
  const rankText = shown?.rank === 'JOKER' ? '★' : (shown?.rank ?? '');
  const suitText = shown?.suit ? SUIT_SYMBOL[shown.suit] : '';
  const label = !shown
    ? t('games.cabo.card.face_down')
    : shown.rank === 'JOKER'
      ? t('games.cabo.card.joker')
      : `${rankText}${suitText}`;

  return (
    <ButtonBase
      onClick={onClick}
      disabled={!onClick}
      aria-label={label}
      aria-pressed={onClick ? selected : undefined}
      sx={{
        width: { xs: 60, sm: 72 },
        height: { xs: 86, sm: 102 },
        borderRadius: 2,
        border: 2,
        borderColor: selected ? 'primary.main' : highlighted ? 'warning.main' : 'divider',
        boxShadow: selected || highlighted ? 4 : 1,
        transition: 'transform 120ms ease, box-shadow 120ms ease',
        transform: selected ? 'translateY(-4px)' : 'none',
        bgcolor: faceUp ? 'background.paper' : 'primary.dark',
        color: shown ? (isRed ? 'error.main' : 'text.primary') : 'primary.contrastText',
        fontWeight: 700,
        '&.Mui-disabled': { opacity: 1 },
        '&:not(.Mui-disabled):active': { transform: 'scale(0.97)' },
      }}
    >
      {shown ? (
        <span
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}
        >
          <span style={{ fontSize: 22 }}>{rankText}</span>
          <span style={{ fontSize: 20 }}>{suitText}</span>
        </span>
      ) : (
        <span style={{ fontSize: 22, opacity: 0.6 }}>?</span>
      )}
    </ButtonBase>
  );
};
