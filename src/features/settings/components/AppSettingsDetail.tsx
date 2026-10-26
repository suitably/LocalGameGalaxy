import React, { lazy, Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { GeneralSettings } from './GeneralSettings';
import { AudioSettings } from './AudioSettings';
import { IntegrationsSettings } from './IntegrationsSettings';
import { AboutSettings } from './AboutSettings';
import { useSettingsHighlight } from '../hooks/useSettingsHighlight';
import type { AppSettingsSection, SettingsHighlight } from '../settingsRoutes';

const ServerSettingsCategory = lazy(() =>
  import('./ServerSettingsCategory').then((m) => ({ default: m.ServerSettingsCategory })),
);
const NotificationSettingsCategory = lazy(() =>
  import('./NotificationSettingsCategory').then((m) => ({
    default: m.NotificationSettingsCategory,
  })),
);

interface AppSettingsDetailProps {
  section: AppSettingsSection;
  highlight?: SettingsHighlight;
}

/** Detail pane of one fixed app settings group. */
export const AppSettingsDetail: React.FC<AppSettingsDetailProps> = ({ section, highlight }) => {
  useSettingsHighlight(highlight, [section]);
  const fallback = (
    <Box display="flex" justifyContent="center" p={4}>
      <CircularProgress />
    </Box>
  );

  switch (section) {
    case 'general':
      return <GeneralSettings />;
    case 'audio':
      return <AudioSettings />;
    case 'connectivity':
      return (
        <Suspense fallback={fallback}>
          <ServerSettingsCategory autoFocusUsdb={highlight === 'usdb'} />
        </Suspense>
      );
    case 'notifications':
      return (
        <Suspense fallback={fallback}>
          <NotificationSettingsCategory />
        </Suspense>
      );
    case 'integrations':
      return <IntegrationsSettings highlightPat={highlight === 'pat'} />;
    case 'about':
      return <AboutSettings />;
  }
};
