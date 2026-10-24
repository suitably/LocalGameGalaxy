import React, { useState } from 'react';
import { Box, Typography, TextField, IconButton, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';

interface CustomLayoutsEditorProps {
  layouts: Record<number, string>;
  onChange: (layouts: Record<number, string>) => void;
}

/** Per-player-count lyric/pitch screen layouts (e.g. "2.2" = two rows of two). */
export const CustomLayoutsEditor: React.FC<CustomLayoutsEditorProps> = ({ layouts, onChange }) => {
  const { t } = useTranslation();
  const [newPlayerCount, setNewPlayerCount] = useState('');
  const [newLayoutStr, setNewLayoutStr] = useState('');

  const handleDelete = (playerCount: number) => {
    const updated = { ...layouts };
    delete updated[playerCount];
    onChange(updated);
  };

  const handleAdd = () => {
    const count = parseInt(newPlayerCount);
    if (!isNaN(count) && count > 0 && newLayoutStr.trim() !== '') {
      onChange({ ...layouts, [count]: newLayoutStr.trim() });
      setNewPlayerCount('');
      setNewLayoutStr('');
    }
  };

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        {t('melodiq.settings_panel.custom_layouts')}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
        {t('melodiq.settings_panel.custom_layouts_desc')}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1 }}>
        {Object.entries(layouts || {}).map(([countStr, layout]) => {
          const count = parseInt(countStr);
          return (
            <Box key={count} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ width: 80 }}>
                {count} {t('melodiq.settings_panel.players')}:
              </Typography>
              <TextField
                size="small"
                value={layout}
                onChange={(e) => onChange({ ...layouts, [count]: e.target.value })}
                sx={{ flex: 1 }}
              />
              <IconButton size="small" color="error" onClick={() => handleDelete(count)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          );
        })}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TextField
          size="small"
          label={t('melodiq.settings_panel.players')}
          type="number"
          value={newPlayerCount}
          onChange={(e) => setNewPlayerCount(e.target.value)}
          sx={{ width: 120 }}
        />
        <TextField
          size="small"
          label={t('melodiq.settings_panel.layout_example')}
          value={newLayoutStr}
          onChange={(e) => setNewLayoutStr(e.target.value)}
          sx={{ flex: 1 }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              handleAdd();
            }
          }}
        />
        <Button variant="contained" size="small" onClick={handleAdd}>
          {t('melodiq.settings_panel.add')}
        </Button>
      </Box>
    </Box>
  );
};
