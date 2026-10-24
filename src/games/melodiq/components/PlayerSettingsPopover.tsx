import React from 'react';
import { Box, Typography, Slider, Popover, Divider, Switch, FormControlLabel } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { ActivePlayer } from '../types';
import { LatencyCalibrator } from './LatencyCalibrator';

interface PlayerSettingsPopoverProps {
  anchorEl: HTMLElement | null;
  player: ActivePlayer | undefined;
  onClose: () => void;
  onUpdate: (updates: Partial<ActivePlayer>) => void;
}

/** Per-singer latency, blind mode and calibration. */
export const PlayerSettingsPopover: React.FC<PlayerSettingsPopoverProps> = ({
  anchorEl,
  player,
  onClose,
  onUpdate,
}) => {
  const { t } = useTranslation();
  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      transformOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Box sx={{ p: 2, minWidth: 250 }}>
        <Typography variant="subtitle2" gutterBottom>
          {t('melodiq.setup.player_settings', 'Player Settings')}
        </Typography>

        {player && (
          <Box>
            <Typography variant="caption" gutterBottom sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {t('melodiq.setup.latency_compensation', 'Latency Compensation: {{ms}}ms', {
                ms: player.latency || 0,
              })}
            </Typography>
            <Slider
              size="small"
              value={player.latency || 0}
              min={0}
              max={500}
              step={10}
              onChange={(_, val) => onUpdate({ latency: val as number })}
              valueLabelDisplay="auto"
            />
            <Typography variant="caption" color="text.secondary" display="block">
              {t('melodiq.setup.latency_hint', 'Compensates for input delay.')}
            </Typography>

            <Divider sx={{ my: 1 }} />

            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={!!player.hidePitch}
                  onChange={(e) => onUpdate({ hidePitch: e.target.checked })}
                />
              }
              label={
                <Typography variant="body2">
                  {t('melodiq.setup.hide_pitch', 'Hide Pitch Curve')}
                </Typography>
              }
            />
            <Typography variant="caption" color="text.secondary" display="block">
              {t(
                'melodiq.setup.hide_pitch_hint',
                'Blind Mode: Player sings and gets points, but their pitch curve is not shown on screen.',
              )}
            </Typography>

            <Divider sx={{ my: 1 }} />
            <LatencyCalibrator
              deviceId={player.deviceId}
              onComplete={(calibratedMs) => onUpdate({ latency: calibratedMs })}
            />
          </Box>
        )}
      </Box>
    </Popover>
  );
};
