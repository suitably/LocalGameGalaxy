import React from 'react';
import { Box, Typography } from '@mui/material';
import type { CardContent } from '../../logic/types';
import { StandardSuitCardFace, parseCardText } from './StandardSuitCardFace';

interface PlayingCardFaceProps {
  frontContent: CardContent;
  backContent?: CardContent;
  isFaceUp: boolean;
  label?: string;
  width?: number;
  height?: number;
}

const renderSpriteSheetBox = (sheet: NonNullable<CardContent['spriteSheet']>) => {
  const { url, col, row, numWidth, numHeight } = sheet;
  const posX = numWidth > 1 ? (col / (numWidth - 1)) * 100 : 0;
  const posY = numHeight > 1 ? (row / (numHeight - 1)) * 100 : 0;
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        backgroundImage: `url(${url})`,
        backgroundSize: `${numWidth * 100}% ${numHeight * 100}%`,
        backgroundPosition: `${posX}% ${posY}%`,
        backgroundRepeat: 'no-repeat',
      }}
    />
  );
};

export const PlayingCardFace: React.FC<PlayingCardFaceProps> = ({
  frontContent,
  backContent,
  isFaceUp,
  label,
}) => {
  if (!isFaceUp) {
    if (backContent?.type === 'image' && backContent.value) {
      if (backContent.spriteSheet) {
        return renderSpriteSheetBox(backContent.spriteSheet);
      }
      return (
        <Box
          component="img"
          src={backContent.value}
          alt="Card back"
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      );
    }
    const backColor = backContent?.color || '#1e3a8a';
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          bgcolor: '#fff',
          p: 0.6,
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >
        <Box
          sx={{
            flex: 1,
            borderRadius: 1,
            bgcolor: backColor,
            border: '2px solid rgba(255,255,255,0.85)',
            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.15) 15%, transparent 16%),
              radial-gradient(circle, rgba(255,255,255,0.15) 15%, transparent 16%)`,
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0, 8px 8px',
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 48,
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(0,0,0,0.25)',
              color: '#fff',
              fontSize: '1.2rem',
              fontWeight: 900,
            }}
          >
            ★
          </Box>
        </Box>
      </Box>
    );
  }

  if (frontContent.type === 'image' && frontContent.spriteSheet) {
    return renderSpriteSheetBox(frontContent.spriteSheet);
  }

  if (frontContent.type === 'image') {
    return (
      <Box
        component="img"
        src={frontContent.value}
        alt={label || 'Card'}
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
        }}
      />
    );
  }

  const parsed = parseCardText(frontContent.value);
  if (parsed) {
    return <StandardSuitCardFace suit={parsed.suit} color={parsed.color} rank={parsed.rank} />;
  }

  // Custom text card (e.g. Action/UNO style)
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        bgcolor: frontContent.color || '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 1,
        textAlign: 'center',
        boxSizing: 'border-box',
      }}
    >
      <Typography
        variant="body2"
        fontWeight={800}
        sx={{
          wordBreak: 'break-word',
          fontSize: '1rem',
          color: frontContent.color ? '#fff' : '#1e293b',
        }}
      >
        {frontContent.value}
      </Typography>
    </Box>
  );
};
