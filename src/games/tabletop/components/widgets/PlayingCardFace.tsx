import React from 'react';
import { Box, Typography } from '@mui/material';
import type { CardContent } from '../../logic/types';

interface PlayingCardFaceProps {
  frontContent: CardContent;
  backContent?: CardContent;
  isFaceUp: boolean;
  label?: string;
  width?: number;
  height?: number;
}

const SUIT_DATA: Record<string, { symbol: string; color: string; name: string }> = {
  '♠': { symbol: '♠', color: '#1e293b', name: 'spade' },
  '♠️': { symbol: '♠', color: '#1e293b', name: 'spade' },
  '♣': { symbol: '♣', color: '#1e293b', name: 'club' },
  '♣️': { symbol: '♣', color: '#1e293b', name: 'club' },
  '♥': { symbol: '♥', color: '#dc2626', name: 'heart' },
  '♥️': { symbol: '♥', color: '#dc2626', name: 'heart' },
  '♦': { symbol: '♦', color: '#dc2626', name: 'diamond' },
  '♦️': { symbol: '♦', color: '#dc2626', name: 'diamond' },
};

function parseCardText(value: string) {
  const trimmed = value.trim();
  for (const [key, data] of Object.entries(SUIT_DATA)) {
    if (trimmed.includes(key)) {
      const rankRaw = trimmed.replace(key, '').trim();
      let rank = rankRaw.toUpperCase();
      if (rank === 'ASS') rank = 'A';
      else if (rank === 'BUBE') rank = 'J';
      else if (rank === 'DAME') rank = 'Q';
      else if (rank === 'KÖNIG') rank = 'K';
      return { suit: data.symbol, color: data.color, rank: rank || 'A' };
    }
  }
  return null;
}

export const PlayingCardFace: React.FC<PlayingCardFaceProps> = ({
  frontContent,
  backContent,
  isFaceUp,
  label,
}) => {
  if (!isFaceUp) {
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
    const { suit, color, rank } = parsed;
    const isCourt = ['J', 'Q', 'K'].includes(rank);
    const isAce = rank === 'A';

    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          bgcolor: '#fff',
          p: 0.8,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          userSelect: 'none',
          boxSizing: 'border-box',
        }}
      >
        {/* Top-Left Index */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 22, lineHeight: 1 }}>
          <Typography sx={{ fontSize: '0.95rem', fontWeight: 900, color, lineHeight: 1 }}>
            {rank}
          </Typography>
          <Typography sx={{ fontSize: '0.85rem', color, lineHeight: 1 }}>
            {suit}
          </Typography>
        </Box>

        {/* Center Graphic */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isAce ? (
            <Typography sx={{ fontSize: '3rem', color, lineHeight: 1, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}>
              {suit}
            </Typography>
          ) : isCourt ? (
            <Box sx={{ textAlign: 'center', border: `1.5px solid ${color}`, borderRadius: 1.5, px: 1, py: 0.2 }}>
              <Typography sx={{ fontSize: '1.6rem', fontWeight: 900, color, lineHeight: 1 }}>
                {rank}
              </Typography>
              <Typography sx={{ fontSize: '1.2rem', color, lineHeight: 1 }}>
                {suit}
              </Typography>
            </Box>
          ) : (
            <Typography sx={{ fontSize: '2.2rem', color, lineHeight: 1 }}>
              {suit}
            </Typography>
          )}
        </Box>

        {/* Bottom-Right Inverted Index */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: 22,
            alignSelf: 'flex-end',
            transform: 'rotate(180deg)',
            lineHeight: 1,
          }}
        >
          <Typography sx={{ fontSize: '0.95rem', fontWeight: 900, color, lineHeight: 1 }}>
            {rank}
          </Typography>
          <Typography sx={{ fontSize: '0.85rem', color, lineHeight: 1 }}>
            {suit}
          </Typography>
        </Box>
      </Box>
    );
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
