import React from 'react';
import { Box, Button } from '@mui/material';

interface HostPartToggleProps {
  trackNames: string[];
  value: number;
  hue: number;
  onChange: (trackIndex: number) => void;
}

/**
 * Duet part switch in a local singer's row on the host. Phone singers pick their part (or join)
 * with the mics in their own lyrics, so their rows do not show this.
 */
export const HostPartToggle: React.FC<HostPartToggleProps> = ({
  trackNames,
  value,
  hue,
  onChange,
}) => (
  <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 10, pointerEvents: 'auto' }}>
    <Box sx={{ bgcolor: 'rgba(0,0,0,0.6)', borderRadius: 2, p: 0.5, display: 'flex', gap: 0.5 }}>
      {trackNames.map((name, tIdx) => (
        <Button
          key={tIdx}
          variant={value === tIdx ? 'contained' : 'text'}
          size="small"
          sx={{
            minWidth: 30,
            p: '2px 8px',
            fontSize: '0.75rem',
            bgcolor: value === tIdx ? `hsl(${hue}, 80%, 40%)` : 'transparent',
            color: 'text.primary',
            '&:hover': {
              bgcolor: value === tIdx ? `hsl(${hue}, 80%, 50%)` : 'action.hover',
            },
          }}
          onClick={() => onChange(tIdx)}
        >
          {name || `P${tIdx + 1}`}
        </Button>
      ))}
    </Box>
  </Box>
);
