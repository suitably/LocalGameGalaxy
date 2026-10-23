import React from 'react';
import { Box, Chip, Stack, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { AreaSymbol } from '../../components/brand/AreaSymbol';
import type { AreaDefinition, AreaId } from '../../lib/areas';

export type AreaFilter = AreaId | 'all';

interface HubAreaFilterProps {
  areas: AreaDefinition[];
  selected: AreaFilter;
  onSelect: (area: AreaFilter) => void;
}

/** Area labels as filter pills (DESIGN.md §8.2): coloured symbol, filled in the area colour when selected. */
export const HubAreaFilter: React.FC<HubAreaFilterProps> = ({ areas, selected, onSelect }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const ink = theme.palette.piece.contrastText;

  const pill = (key: AreaFilter, label: string, fill: string, icon?: React.ReactNode) => {
    const isSelected = selected === key;
    return (
      <Chip
        key={key}
        clickable
        onClick={() => onSelect(key)}
        aria-pressed={isSelected}
        label={
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
            {icon}
            {label}
          </Box>
        }
        sx={{
          fontWeight: 700,
          fontSize: { xs: '0.875rem', sm: '0.95rem' },
          height: 40,
          px: 0.5,
          borderRadius: 50,
          border: 1,
          borderColor: isSelected ? fill : 'divider',
          bgcolor: isSelected ? fill : 'transparent',
          color: isSelected ? ink : 'text.primary',
          transition: 'background-color 150ms, border-color 150ms',
          '&:hover': { bgcolor: isSelected ? fill : 'action.hover' },
        }}
      />
    );
  };

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        mb: 3.5,
        overflowX: 'auto',
        pb: 1,
        justifyContent: { xs: 'flex-start', sm: 'center' },
        px: { xs: 1, sm: 0 },
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      {pill('all', t('hub.categories.all'), theme.palette.primary.main)}
      {areas.map((area) => {
        const fill = theme.palette.piece[area.color];
        const isSelected = selected === area.id;
        return pill(
          area.id,
          t(area.labelKey),
          fill,
          <AreaSymbol
            area={area.id}
            color={isSelected ? ink : fill}
            cut={isSelected ? fill : theme.palette.background.default}
          />,
        );
      })}
    </Stack>
  );
};
