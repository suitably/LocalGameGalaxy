import React from 'react';
import { Button } from '@mui/material';
import CodeRoundedIcon from '@mui/icons-material/CodeRounded';
import { useTranslation } from 'react-i18next';
import { SettingsSection } from '../../../components/settings';

/** Public repository; AGPL-3.0-or-later §13 asks that network users be offered the source. */
export const SOURCE_CODE_URL = 'https://github.com/suitably/LocalGameGalaxy';

/** About page: licence note and link to the source code. */
export const SourceCodeLink: React.FC = () => {
  const { t } = useTranslation();
  return (
    <SettingsSection
      id="source-code"
      title={t('settings.source_title')}
      description={t('settings.source_desc')}
      icon={<CodeRoundedIcon color="primary" />}
    >
      <Button
        variant="outlined"
        startIcon={<CodeRoundedIcon />}
        href={SOURCE_CODE_URL}
        target="_blank"
        rel="noopener"
      >
        {t('settings.source_open')}
      </Button>
    </SettingsSection>
  );
};
