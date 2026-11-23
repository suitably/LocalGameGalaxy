import React from 'react';
import { Tab, Tabs } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { LIBRARY_TABS, type LibraryTab } from '../../logic/songLibrary';

interface LibraryTabsProps {
  value: LibraryTab;
  onChange: (tab: LibraryTab) => void;
  /** Tabs left out (e.g. playlists on a phone client). */
  hidden?: readonly LibraryTab[];
}

/** All / Artists / Albums / Favourites / Playlists; scrolls sideways on a phone. */
export const LibraryTabs: React.FC<LibraryTabsProps> = ({ value, onChange, hidden = [] }) => {
  const { t } = useTranslation();
  return (
    <Tabs
      value={value}
      onChange={(_, tab: LibraryTab) => onChange(tab)}
      variant="scrollable"
      scrollButtons={false}
      aria-label={t('melodiq.library.tabs_label')}
      sx={{ px: { xs: 1, sm: 2 }, minHeight: 40, borderBottom: 1, borderColor: 'divider' }}
    >
      {LIBRARY_TABS.filter((tab) => !hidden.includes(tab)).map((tab) => (
        <Tab
          key={tab}
          value={tab}
          label={t(`melodiq.library.tab_${tab}`)}
          sx={{ minHeight: 40, minWidth: 0, px: 1.5 }}
        />
      ))}
    </Tabs>
  );
};
