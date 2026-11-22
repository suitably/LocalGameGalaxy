import React from 'react';
import { Box, Chip, Tooltip } from '@mui/material';
import StyleIcon from '@mui/icons-material/StyleRounded';
import ShuffleIcon from '@mui/icons-material/ShuffleRounded';
import { useTranslation } from 'react-i18next';

interface QwixxSheetChipsProps {
  sheetName: string;
  onOpenSheetSelector: () => void;
  onPickRandomSheet: () => void;
}

/** Phones: the random chip shows only its icon so both chips fit next to the lucky numbers. */
const iconOnlyChipOnPhone = {
  fontWeight: 'bold',
  '& .MuiChip-label': { display: { xs: 'none', sm: 'block' } },
  '& .MuiChip-icon': { mx: { xs: 0.75, sm: undefined } },
};

/** Current sheet (opens the selector) and random-sheet chips, shown in the score panel. */
export const QwixxSheetChips: React.FC<QwixxSheetChipsProps> = ({
  sheetName,
  onOpenSheetSelector,
  onPickRandomSheet,
}) => {
  const { t } = useTranslation();
  const randomLabel = t('games.qwixx.random_mode');

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
      <Chip
        icon={<StyleIcon />}
        label={sheetName}
        color="secondary"
        onClick={onOpenSheetSelector}
        size="small"
        clickable
        sx={{ fontWeight: 'bold', minWidth: 0 }}
      />
      <Tooltip title={randomLabel}>
        <Chip
          icon={<ShuffleIcon />}
          label={randomLabel}
          aria-label={randomLabel}
          variant="outlined"
          color="secondary"
          onClick={onPickRandomSheet}
          size="small"
          clickable
          sx={iconOnlyChipOnPhone}
        />
      </Tooltip>
    </Box>
  );
};
