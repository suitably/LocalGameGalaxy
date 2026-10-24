import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { MicrophoneManager, type PitchResult } from '../audio/MicrophoneManager';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const getNoteName = (midiNote: number): string => {
  const note = Math.round(midiNote);
  const octave = Math.floor(note / 12) - 1;
  return `${NOTE_NAMES[note % 12]}${octave}`;
};

/** Volume meter and detected note for the selected microphone. */
export const LiveMicTest: React.FC<{ deviceId: string }> = ({ deviceId }) => {
  const { t } = useTranslation();
  const [volume, setVolume] = useState(0);
  const [pitch, setPitch] = useState<PitchResult | null>(null);

  useEffect(() => {
    let mounted = true;
    let animFrame = 0;
    let lastTime = 0;
    const mic = new MicrophoneManager();

    mic
      .start(deviceId || undefined)
      .then(() => {
        if (!mounted) {
          mic.stop();
          return;
        }

        const loop = () => {
          if (!mounted) return;
          const now = performance.now();
          if (now - lastTime > 33) {
            setVolume(mic.getCurrentVolume());
            setPitch(mic.getPitch());
            lastTime = now;
          }
          animFrame = requestAnimationFrame(loop);
        };
        loop();
      })
      .catch((err) => {
        console.warn('MicTest failed to start:', err);
      });

    return () => {
      mounted = false;
      cancelAnimationFrame(animFrame);
      mic.stop();
    };
  }, [deviceId]);

  return (
    <Box sx={{ mt: 3, p: 2, bgcolor: 'action.disabledBackground', borderRadius: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        {t('melodiq.settings.live_test', 'Live Test')}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            flex: 1,
            height: 10,
            bgcolor: 'action.selected',
            borderRadius: 5,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              width: `${Math.min(100, volume * 100)}%`,
              height: '100%',
              bgcolor: 'success.main',
              transition: 'width 0.1s',
            }}
          />
        </Box>
        <Typography
          sx={{
            minWidth: 50,
            textAlign: 'right',
            fontFamily: 'monospace',
            fontVariantNumeric: 'tabular-nums',
            color: pitch ? 'secondary.main' : 'text.disabled',
          }}
        >
          {pitch ? getNoteName(pitch.note) : '--'}
        </Typography>
      </Box>
    </Box>
  );
};
