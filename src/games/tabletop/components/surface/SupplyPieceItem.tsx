/**
 * Single supply piece item in HandDockStrip [ID: GAME-TABLETOP-SUPPLY-ITEM]
 */
import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { TokenWidget } from '../../logic/types';
import { TokenWidgetView } from '../widgets/TokenWidgetView';

interface SupplyPieceItemProps {
  groupName: string;
  count: number;
  samplePiece: TokenWidget;
  onPointerDown?: (e: React.PointerEvent) => void;
}

export const SupplyPieceItem: React.FC<SupplyPieceItemProps> = ({
  groupName,
  count,
  samplePiece,
  onPointerDown,
}) => {
  const { t } = useTranslation();

  return (
    <Tooltip title={t('games.tabletop.dragToPlace', 'Ziehen, um aufs Spielbrett zu legen')}>
      <Box
        onPointerDown={onPointerDown}
        sx={{
          width: 88,
          height: 108,
          flexShrink: 0,
          bgcolor: 'rgba(255, 255, 255, 0.05)',
          border: '1.5px solid rgba(255, 255, 255, 0.18)',
          borderRadius: 2,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1,
          boxSizing: 'border-box',
          boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
          cursor: 'grab',
          touchAction: 'none',
          transition: 'transform 0.15s ease, border-color 0.15s ease',
          '&:hover': {
            transform: 'translateY(-3px)',
            borderColor: 'primary.light',
          },
        }}
      >
        {/* Count badge */}
        <Box
          sx={{
            position: 'absolute',
            top: 4,
            right: 4,
            bgcolor: 'primary.main',
            color: '#fff',
            borderRadius: '10px',
            px: 0.6,
            py: 0.1,
            fontSize: '0.7rem',
            fontWeight: 800,
            zIndex: 10,
          }}
        >
          {`×${count}`}
        </Box>

        {/* Mini Piece Preview */}
        <Box
          sx={{
            position: 'relative',
            width: 48,
            height: 48,
            mt: 1.2,
            pointerEvents: 'none',
          }}
        >
          <TokenWidgetView
            widget={{
              ...samplePiece,
              x: 0,
              y: 0,
              width: 48,
              height: 48,
              zIndex: 1,
            }}
          />
        </Box>

        {/* Label */}
        <Box textAlign="center" width="100%" pb={0.5}>
          <Typography
            variant="caption"
            noWrap
            sx={{ display: 'block', fontWeight: 700, color: 'rgba(255,255,255,0.9)', fontSize: '0.75rem' }}
          >
            {groupName}
          </Typography>
        </Box>
      </Box>
    </Tooltip>
  );
};
