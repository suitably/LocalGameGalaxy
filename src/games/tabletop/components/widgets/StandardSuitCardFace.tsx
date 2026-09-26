import React from 'react';
import { Box, Typography } from '@mui/material';

export const SUIT_DATA: Record<string, { symbol: string; color: string; name: string }> = {
  '♠': { symbol: '♠', color: '#1e293b', name: 'spade' },
  '♠️': { symbol: '♠', color: '#1e293b', name: 'spade' },
  '♣': { symbol: '♣', color: '#1e293b', name: 'club' },
  '♣️': { symbol: '♣', color: '#1e293b', name: 'club' },
  '♥': { symbol: '♥', color: '#dc2626', name: 'heart' },
  '♥️': { symbol: '♥', color: '#dc2626', name: 'heart' },
  '♦': { symbol: '♦', color: '#dc2626', name: 'diamond' },
  '♦️': { symbol: '♦', color: '#dc2626', name: 'diamond' },
};

export function parseCardText(value: string) {
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

interface StandardSuitCardFaceProps {
  suit: string;
  color: string;
  rank: string;
}

export const StandardSuitCardFace: React.FC<StandardSuitCardFaceProps> = ({
  suit,
  color,
  rank,
}) => {
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
};
