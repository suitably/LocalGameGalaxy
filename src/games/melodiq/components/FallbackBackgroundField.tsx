import React from 'react';
import { Box, Typography, TextField, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface FallbackBackgroundFieldProps {
  value: string;
  onChange: (url: string) => void;
}

/** URL field plus local file picker for the background shown when a song has no video. */
export const FallbackBackgroundField: React.FC<FallbackBackgroundFieldProps> = ({
  value,
  onChange,
}) => {
  const { t } = useTranslation();
  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <TextField
          size="small"
          fullWidth
          label={t('melodiq.settings_panel.fallback_background_url', 'Fallback Background URL')}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. https://example.com/loop.mp4"
        />
        <Button variant="outlined" component="label" sx={{ height: 40, whiteSpace: 'nowrap' }}>
          {t('melodiq.settings_panel.browse', 'Browse...')}
          <input
            type="file"
            hidden
            accept="image/*,video/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const url = URL.createObjectURL(file);
                // The suffix hints the media type to the player (the blob URL has no extension)
                const typeHint = file.type.startsWith('video/') ? '#video.mp4' : '#image.jpg';
                onChange(url + typeHint);
              }
              e.target.value = '';
            }}
          />
        </Button>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
        {t(
          'melodiq.settings_panel.fallback_background_desc',
          'Shown when a song has no video. Use a web link or select a local file (local files may reset after reload).',
        )}
      </Typography>
    </Box>
  );
};
