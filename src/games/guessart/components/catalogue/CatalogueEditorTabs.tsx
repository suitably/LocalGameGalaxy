import React from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import AbcRoundedIcon from '@mui/icons-material/AbcRounded';
import GitHubIcon from '@mui/icons-material/GitHub';
import { useTranslation } from 'react-i18next';

interface CatalogueEditorTabsProps {
  value: number;
  categoryCount: number;
  wordCount: number;
  onChange: (index: number) => void;
}

export const CatalogueEditorTabs: React.FC<CatalogueEditorTabsProps> = ({
  value,
  categoryCount,
  wordCount,
  onChange,
}) => {
  const { t } = useTranslation();
  return (
    <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', px: { xs: 0.5, sm: 2 } }}>
      <Tabs
        value={value}
        onChange={(_, val) => onChange(val)}
        indicatorColor="primary"
        textColor="primary"
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          minHeight: 44,
          '& .MuiTab-root': {
            minWidth: { xs: 48, sm: 120 },
            px: { xs: 1, sm: 2 },
            py: 0.8,
            minHeight: 44,
            textTransform: 'none',
            fontWeight: 700,
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
          },
        }}
      >
        <Tab
          icon={<CategoryRoundedIcon fontSize="small" />}
          iconPosition="start"
          label={
            <Box component="span" display="flex" alignItems="center" gap={0.5}>
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                {t('guessart.catalogueCategories', 'Kategorien')}
              </Box>
              <Box component="span">({categoryCount})</Box>
            </Box>
          }
        />
        <Tab
          icon={<AbcRoundedIcon fontSize="small" />}
          iconPosition="start"
          label={
            <Box component="span" display="flex" alignItems="center" gap={0.5}>
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                {t('guessart.catalogueWords', 'Wörter')}
              </Box>
              <Box component="span">({wordCount})</Box>
            </Box>
          }
        />
        <Tab
          icon={<GitHubIcon fontSize="small" />}
          iconPosition="start"
          label={
            <Box component="span">
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                {t('guessart.publishPrTab', 'Veröffentlichen (Git PR)')}
              </Box>
              <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                PR
              </Box>
            </Box>
          }
        />
      </Tabs>
    </Box>
  );
};
