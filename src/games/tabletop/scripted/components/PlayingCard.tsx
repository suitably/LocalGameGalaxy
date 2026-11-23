/**
 * One standard playing card, scaled by its width [ID: COMP-TABLETOP-SCRIPT-CARD]
 */
import React from 'react';
import { alpha, Box, ButtonBase } from '@mui/material';
import { SUIT_DATA } from '../../components/widgets/standardSuitCardFaceCore';
import { SUIT_SYMBOL, cardText, isJoker, rankOf, suitOf, type CardId } from '../logic/cardDeck';
import { transitionOf } from '../../../../lib/motion';

export const CARD_RATIO = 1.45;

interface PlayingCardProps {
  /** `undefined`: the back. */
  card?: CardId;
  width: number;
  selected?: boolean;
  /** Tappable target of a move. */
  highlighted?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  label?: string;
}

const JokerFace: React.FC = () => (
  <Box
    sx={{
      position: 'absolute',
      inset: 0,
      bgcolor: 'common.white',
      color: 'secondary.main',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 800,
      lineHeight: 1,
    }}
  >
    <Box sx={{ fontSize: '2.2em' }}>🃏</Box>
    <Box sx={{ fontSize: '0.6em', letterSpacing: '0.04em' }}>JOKER</Box>
  </Box>
);

const Face: React.FC<{ card: CardId }> = ({ card }) => {
  if (isJoker(card)) return <JokerFace />;
  const symbol = SUIT_SYMBOL[suitOf(card)];
  const color = SUIT_DATA[symbol].color;
  return (
    <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'common.white', color }}>
      <Box
        sx={{
          position: 'absolute',
          top: '0.18em',
          left: '0.22em',
          lineHeight: 1,
          textAlign: 'center',
          fontWeight: 800,
        }}
      >
        <Box sx={{ fontSize: '1.05em', letterSpacing: '-0.04em' }}>{rankOf(card)}</Box>
        <Box sx={{ fontSize: '0.95em' }}>{symbol}</Box>
      </Box>
      <Box
        sx={{
          position: 'absolute',
          right: '0.2em',
          bottom: '0.1em',
          fontSize: '2.1em',
          lineHeight: 1,
        }}
      >
        {symbol}
      </Box>
    </Box>
  );
};

const Back: React.FC = () => (
  <Box
    sx={(theme) => ({
      position: 'absolute',
      inset: 0,
      bgcolor: 'primary.main',
      border: '0.18em solid',
      borderColor: 'common.white',
      borderRadius: 'inherit',
      backgroundImage: `repeating-linear-gradient(45deg, ${alpha(
        theme.palette.common.white,
        0.18,
      )} 0 0.22em, transparent 0.22em 0.5em)`,
    })}
  />
);

export const PlayingCard: React.FC<PlayingCardProps> = ({
  card,
  width,
  selected = false,
  highlighted = false,
  dimmed = false,
  onClick,
  label,
}) => {
  const sx = {
    position: 'relative',
    display: 'block',
    flexShrink: 0,
    width,
    height: Math.round(width * CARD_RATIO),
    fontSize: width / 3.6,
    borderRadius: `${Math.max(4, Math.round(width / 9))}px`,
    overflow: 'hidden',
    boxShadow: selected ? 6 : 2,
    outline: selected || highlighted ? '3px solid' : 'none',
    outlineColor: selected ? 'primary.main' : 'warning.main',
    opacity: dimmed ? 0.55 : 1,
    transition: transitionOf(['opacity', 'box-shadow']),
    userSelect: 'none',
  } as const;
  const content = card ? <Face card={card} /> : <Back />;
  if (!onClick) return <Box sx={sx}>{content}</Box>;
  return (
    <ButtonBase
      onClick={onClick}
      aria-label={label ?? (card ? cardText(card) : undefined)}
      aria-pressed={selected}
      sx={sx}
    >
      {content}
    </ButtonBase>
  );
};
