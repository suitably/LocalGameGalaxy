/**
 * One game on the Spieltisch: tap to play [ID: GAME-TABLETOP-TABLE-GAME-CARD]
 */
import React from 'react';
import { Box, Card, CardActionArea, Chip, Typography, useTheme } from '@mui/material';
import { AreaSymbol } from '../../../../components/brand/AreaSymbol';
import type { AreaId } from '../../../../lib/areas';
import { useTranslation } from 'react-i18next';
import type { PlayMode } from '../../logic/tableCatalog';

export const TableGameCard: React.FC<{
  title: string;
  desc?: string;
  icon: AreaId;
  color: string;
  modes: PlayMode[];
  onPlay: () => void;
}> = ({ title, desc, icon, color, modes, onPlay }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <Card
      variant="outlined"
      sx={{ height: '100%', borderRadius: 3, borderTop: '4px solid', borderTopColor: color }}
    >
      <CardActionArea onClick={onPlay} sx={{ height: '100%', p: 2, display: 'block' }}>
        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
          <AreaSymbol area={icon} color={color} cut={theme.palette.background.paper} size={28} />
          <Typography variant="subtitle1" fontWeight={800}>
            {title}
          </Typography>
        </Box>
        {desc && (
          <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 1 }}>
            {desc}
          </Typography>
        )}
        <Box display="flex" gap={0.5} flexWrap="wrap">
          {modes.includes('shared_device') && (
            <Chip
              size="small"
              label={t('games.tabletop.mode_shared_device', 'Ein Gerät für alle')}
            />
          )}
          {modes.includes('own_devices') && (
            <Chip
              size="small"
              variant="outlined"
              label={t('games.tabletop.mode_own_devices', 'Jeder am eigenen Gerät')}
            />
          )}
        </Box>
      </CardActionArea>
    </Card>
  );
};
