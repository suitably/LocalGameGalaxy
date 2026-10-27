import { useState } from 'react';
import { Box, Button, ListItemText, Menu, MenuItem } from '@mui/material';
import VolumeOffIcon from '@mui/icons-material/VolumeOffRounded';
import VolumeUpIcon from '@mui/icons-material/VolumeUpRounded';
import { useTranslation } from 'react-i18next';
import { TOUCH_TARGET } from '../../../../lib/touchTarget';
import type { StageEngine } from '../engine/StageEngine';
import type { BandMode } from '../engine/types';
import { overlayContainer } from './overlayContainer';

const BAND_MODES: BandMode[] = ['all', 'others', 'none'];

/** What sounds besides the players: the synthesised band, or the recording on or off when there is one. */
export function BackingMenu({ engine }: { engine: StageEngine }) {
  const { t } = useTranslation();
  const k = (key: string) => t(`games.melodiq_notes.stage.${key}`);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const recording = !!engine.recording;
  const silent = recording ? !engine.recordingAudible : engine.band === 'none';
  const label = recording
    ? engine.recordingAudible
      ? k('recording_on')
      : k('recording_off')
    : k(`backing_${engine.band}`);
  const close = () => setAnchor(null);
  return (
    <>
      <Button
        color="inherit"
        startIcon={silent ? <VolumeOffIcon /> : <VolumeUpIcon />}
        aria-haspopup="menu"
        aria-label={`${k('backing')}: ${label}`}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{
          minHeight: TOUCH_TARGET,
          minWidth: TOUCH_TARGET,
          textTransform: 'none',
          whiteSpace: 'nowrap',
          // icon only on phones; the label is in the menu and the button's name
          '& .MuiButton-startIcon': { mr: { xs: 0, sm: 1 }, ml: { xs: 0, sm: -0.5 } },
        }}
      >
        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
          {label}
        </Box>
      </Button>
      <Menu container={overlayContainer} anchorEl={anchor} open={!!anchor} onClose={close}>
        {recording
          ? [true, false].map((on) => (
              <MenuItem
                key={String(on)}
                selected={engine.recordingAudible === on}
                onClick={() => {
                  engine.setRecordingAudible(on);
                  close();
                }}
              >
                <ListItemText primary={on ? k('recording_on') : k('recording_off')} />
              </MenuItem>
            ))
          : BAND_MODES.map((m) => (
              <MenuItem
                key={m}
                selected={engine.band === m}
                onClick={() => {
                  engine.setBand(m);
                  close();
                }}
              >
                <ListItemText primary={k(`backing_${m}`)} />
              </MenuItem>
            ))}
      </Menu>
    </>
  );
}
