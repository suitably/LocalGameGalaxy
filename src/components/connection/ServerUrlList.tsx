/**
 * Editable list of server URLs with toggle, type chip, remove and add field [ID: COMP-SERVER-URL-LIST]
 *
 * Shared by the tracker (signaling) and STUN settings so both behave the same.
 */
import React, { useState } from 'react';
import {
  alpha,
  Box,
  Button,
  Typography,
  TextField,
  IconButton,
  Paper,
  Chip,
  Tooltip,
  Switch,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

type ItemColor = 'success' | 'primary' | 'secondary' | 'info';

export interface ServerUrlItem {
  url: string;
  enabled: boolean;
  chipLabel: string;
  chipColor: ItemColor;
  switchColor: ItemColor;
  removable: boolean;
}

export interface ServerUrlListLabels {
  title: string;
  restoreDefaults: string;
  enable: string;
  disable: string;
  remove: string;
  placeholder: string;
  add: string;
  emptyWarning: string;
}

export interface ServerUrlListProps {
  items: ServerUrlItem[];
  labels: ServerUrlListLabels;
  showEmptyWarning: boolean;
  onToggle: (item: ServerUrlItem) => void;
  onRemove: (url: string) => void;
  /** Returns an error message to show, or `null` when the URL was added. */
  onAdd: (url: string) => string | null;
  onRestoreDefaults: () => void;
}

const chipSx = {
  height: 26,
  px: 0.5,
  borderRadius: 1.5,
  fontSize: '0.75rem',
  whiteSpace: 'nowrap',
} as const;

export const ServerUrlList: React.FC<ServerUrlListProps> = ({
  items,
  labels,
  showEmptyWarning,
  onToggle,
  onRemove,
  onAdd,
  onRestoreDefaults,
}) => {
  const [newUrl, setNewUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    const trimmed = newUrl.trim();
    if (!trimmed) return;
    const message = onAdd(trimmed);
    setError(message);
    if (!message) setNewUrl('');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="subtitle2">{labels.title}</Typography>
        <Button
          size="small"
          onClick={onRestoreDefaults}
          variant="outlined"
          sx={{ borderRadius: 50 }}
        >
          {labels.restoreDefaults}
        </Button>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {items.map((item, index) => (
          <Paper
            key={item.url || index}
            elevation={0}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 1,
              px: 1.5,
              borderRadius: 2,
              bgcolor: item.enabled ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.2)',
              border: '1px solid',
              borderColor: item.enabled ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.04)',
              opacity: item.enabled ? 1 : 0.6,
              transition: 'all 0.2s ease',
            }}
          >
            <Tooltip title={item.enabled ? labels.disable : labels.enable}>
              <Switch
                size="small"
                checked={item.enabled}
                onChange={() => onToggle(item)}
                color={item.switchColor}
              />
            </Tooltip>

            <TextField
              value={item.url}
              size="small"
              fullWidth
              variant="standard"
              InputProps={{
                readOnly: true,
                disableUnderline: true,
                sx: {
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  color: item.enabled ? 'text.primary' : 'text.disabled',
                },
              }}
            />

            <Chip
              label={item.chipLabel}
              color={item.chipColor}
              variant="outlined"
              size="small"
              sx={chipSx}
            />

            {item.removable && (
              <Tooltip title={labels.remove}>
                <IconButton color="error" size="small" onClick={() => onRemove(item.url)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Paper>
        ))}

        {showEmptyWarning && (
          <Box
            sx={{
              p: 2,
              bgcolor: (theme) => alpha(theme.palette.error.main, 0.1),
              border: (theme) => `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
              borderRadius: 2,
            }}
          >
            <Typography variant="body2" color="error">
              {labels.emptyWarning}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <TextField
            value={newUrl}
            onChange={(e) => {
              setNewUrl(e.target.value);
              setError(null);
            }}
            placeholder={labels.placeholder}
            size="small"
            fullWidth
            variant="outlined"
            error={Boolean(error)}
            helperText={error ?? undefined}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          <Button
            variant="contained"
            onClick={handleAdd}
            sx={{
              borderRadius: 50,
              px: 4,
              py: 1,
              alignSelf: 'flex-start',
              backgroundImage: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
              boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
              color: 'text.primary',
            }}
          >
            {labels.add}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};
