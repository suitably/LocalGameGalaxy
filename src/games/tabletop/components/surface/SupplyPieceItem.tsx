/**
 * Single supply piece item in HandDockStrip [ID: GAME-TABLETOP-SUPPLY-ITEM]
 */
import React from 'react';
import { Box, Typography, Button, Tooltip } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { useTranslation } from 'react-i18next';
import type { TokenWidget } from '../../logic/types';
import { TokenWidgetView } from '../widgets/TokenWidgetView';

interface SupplyPieceItemProps {
  groupName: string;
  count: number;
  samplePiece: TokenWidget;
  onTake: (pieceId: string) => void;
  onPointerDown?: (e: React.PointerEvent) => void;
}

export const SupplyPieceItem: React.FC<SupplyPieceItemProps> = ({
  groupName,
  count,
  samplePiece,
  onTake,
  onPointerDown,
}) => {
  const { t } = useTranslation();

  return (
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
          width: 40,
          height: 40,
          mt: 0.5,
          pointerEvents: 'none',
        }}
      >
        <TokenWidgetView
          widget={{
            ...samplePiece,
            x: 0,
            y: 0,
            width: 40,
            height: 40,
            zIndex: 1,
          }}
        />
      </Box>

      {/* Label and Place Button */}
      <Box textAlign="center" width="100%">
        <Typography
          variant="caption"
          noWrap
          sx={{ display: 'block', fontWeight: 700, color: 'rgba(255,255,255,0.9)', fontSize: '0.72rem' }}
        >
          {groupName}
        </Typography>

        <Tooltip title={t('games.tabletop.placeOnBoard', 'Aufs Spielbrett legen')}>
          <Button
            size="small"
            variant="contained"
            color="primary"
            onClick={() => onTake(samplePiece.id)}
            sx={{
              minWidth: 0,
              width: '100%',
              py: 0.2,
              px: 0.5,
              mt: 0.5,
              fontSize: '0.65rem',
              fontWeight: 800,
              textTransform: 'none',
            }}
            startIcon={<AddCircleOutlineIcon sx={{ fontSize: '12px !important' }} />}
          >
            {t('games.tabletop.take', 'Nehmen')}
          </Button>
        </Tooltip>
      </Box>
    </Box>
  );
};
