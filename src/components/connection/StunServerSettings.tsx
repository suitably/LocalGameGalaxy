/**
 * STUN server list for this device [ID: COMP-STUN-SERVER-SETTINGS]
 *
 * Shown next to the tracker list. STUN is per device: host and phones may differ.
 */
import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ServerUrlList, type ServerUrlItem } from './ServerUrlList';
import { useStunServerSettings } from './useStunServerSettings';

export const StunServerSettings: React.FC = () => {
  const { t } = useTranslation();
  const { servers, toggleServer, addServer, removeServer, restoreDefaults } =
    useStunServerSettings();

  const items: ServerUrlItem[] = servers.map((s) => ({
    url: s.url,
    enabled: s.enabled,
    chipLabel: s.type === 'custom' ? t('stun.type_custom') : t('stun.type_default'),
    chipColor: s.type === 'custom' ? 'secondary' : 'info',
    switchColor: s.type === 'custom' ? 'secondary' : 'primary',
    removable: s.type === 'custom',
  }));

  return (
    <Box>
      <ServerUrlList
        items={items}
        showEmptyWarning={!servers.some((s) => s.enabled)}
        labels={{
          title: t('stun.title'),
          restoreDefaults: t('signaling.restore_defaults'),
          enable: t('signaling.toggle_enable'),
          disable: t('signaling.toggle_disable'),
          remove: t('stun.remove_tooltip'),
          placeholder: t('stun.placeholder'),
          add: t('signaling.add_button'),
          emptyWarning: t('stun.no_servers_warning'),
        }}
        onToggle={(item) => toggleServer(item.url, !item.enabled)}
        onRemove={removeServer}
        onAdd={(url) => {
          const result = addServer(url);
          if (result === 'invalid') return t('stun.invalid_url');
          if (result === 'duplicate') return t('stun.duplicate_url');
          return null;
        }}
        onRestoreDefaults={restoreDefaults}
      />
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        {t('stun.hint')}
      </Typography>
    </Box>
  );
};
