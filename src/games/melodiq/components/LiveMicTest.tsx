import React, { useEffect, useRef, useState } from 'react';
import { Box, Slider, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { MicrophoneManager, type PitchResult } from '../audio/MicrophoneManager';
import { getNoteName } from '../gameplay/logic/pitchLayout';
import { MIC_GAIN_MAX, MIC_GAIN_MIN, micGainFactor } from '../logic/clientProfile';

interface LiveMicTestProps {
  deviceId: string;
  /** Input gain in percent (0–200). */
  gain: number;
  onGainChange: (percent: number) => void;
}

/** Volume meter, detected note and input-gain slider for the selected microphone. */
export const LiveMicTest: React.FC<LiveMicTestProps> = ({ deviceId, gain, onGainChange }) => {
  const { t } = useTranslation();
  const [volume, setVolume] = useState(0);
  const [pitch, setPitch] = useState<PitchResult | null>(null);
  const micRef = useRef<MicrophoneManager | null>(null);
  const gainRef = useRef(micGainFactor(gain));

  useEffect(() => {
    gainRef.current = micGainFactor(gain);
    micRef.current?.setGain(gainRef.current);
  }, [gain]);

  useEffect(() => {
    let mounted = true;
    let animFrame = 0;
    let lastTime = 0;
    const mic = new MicrophoneManager();
    micRef.current = mic;

    mic
      .start(deviceId || undefined, gainRef.current)
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
      if (micRef.current === mic) micRef.current = null;
      mic.stop();
    };
  }, [deviceId]);

  return (
    <Box sx={{ mt: 3, p: 2, bgcolor: 'action.disabledBackground', borderRadius: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        {t('melodiq.settings_panel.live_test', 'Live Test')}
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
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        {t('melodiq.settings_panel.mic_gain', 'Microphone gain: {{percent}} %', {
          percent: gain,
        })}
      </Typography>
      <Slider
        value={gain}
        min={MIC_GAIN_MIN}
        max={MIC_GAIN_MAX}
        step={5}
        marks={[{ value: 100 }]}
        onChange={(_, v) => onGainChange(Array.isArray(v) ? v[0] : v)}
        aria-label={t('melodiq.settings_panel.mic_gain_label', 'Microphone gain')}
        valueLabelDisplay="auto"
        valueLabelFormat={(v) => `${v} %`}
      />
      <Typography variant="caption" color="text.secondary">
        {t(
          'melodiq.settings_panel.mic_gain_hint',
          'Raise it if the meter barely moves while you sing; lower it if it is always full.',
        )}
      </Typography>
    </Box>
  );
};
