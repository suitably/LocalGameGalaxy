/**
 * Title row of the hand dock: cards/supply tabs and the zoom-hand button [ID: GAME-TABLETOP-HAND-DOCK-HEADER]
 */
import React from 'react';
import { Box, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import ZoomOutMapIcon from '@mui/icons-material/ZoomOutMapRounded';
import VisibilityIcon from '@mui/icons-material/VisibilityRounded';
import { useTranslation } from 'react-i18next';

interface HandDockHeaderProps {
  isSpectator: boolean;
  handCount: number;
  /** 0 hides the tabs. */
  supplyCount: number;
  showSupplies: boolean;
  onSelectTab: (tab: 'cards' | 'supplies') => void;
  onZoomHand?: () => void;
}

const chipSx = { height: 22, fontSize: '0.75rem', fontWeight: 700 } as const;

export const HandDockHeader: React.FC<HandDockHeaderProps> = ({
  isSpectator,
  handCount,
  supplyCount,
  showSupplies,
  onSelectTab,
  onZoomHand,
}) => {
  const { t } = useTranslation();

  if (isSpectator) {
    return (
      <Box display="flex" alignItems="center" gap={0.75} mb={0.5} color="text.secondary">
        <VisibilityIcon sx={{ fontSize: 16 }} />
        <Typography variant="caption" sx={{ fontWeight: 600, letterSpacing: 0.5 }}>
          {t('games.tabletop.spectator', 'Zuschauer')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.25}>
      {supplyCount > 0 ? (
        <Box display="flex" gap={1}>
          <Chip
            size="small"
            clickable
            color={!showSupplies ? 'primary' : 'default'}
            onClick={() => onSelectTab('cards')}
            label={`${t('games.tabletop.cards', 'Karten')} (${handCount})`}
            sx={chipSx}
          />
          <Chip
            size="small"
            clickable
            color={showSupplies ? 'primary' : 'default'}
            onClick={() => onSelectTab('supplies')}
            label={`${t('games.tabletop.reserve', 'Vorrat')} (${supplyCount})`}
            sx={chipSx}
          />
        </Box>
      ) : (
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 0.5 }}
        >
          {t('games.tabletop.yourHand', 'Deine Hand')} ({handCount})
        </Typography>
      )}
      {onZoomHand && !showSupplies && (
        <Tooltip title={t('games.tabletop.zoomHand', 'Ganze Hand vergrößern')}>
          <IconButton
            size="small"
            onClick={onZoomHand}
            aria-label={t('games.tabletop.zoomHand', 'Ganze Hand vergrößern')}
            sx={{ p: 0.5 }}
          >
            <ZoomOutMapIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};
