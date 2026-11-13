import React, { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Radio,
  Stack,
  Typography,
} from '@mui/material';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { useTranslation } from 'react-i18next';
import type { DeviceChannelStatus, NotificationChoice } from '../../lib/push/notificationChannels';

interface NotificationChannelChooserProps {
  status: DeviceChannelStatus;
  recommended: NotificationChoice;
  showNtfy: boolean;
  ntfySelected: boolean;
  ntfyUrl: string;
  /** Must trigger the system permission prompt directly (it needs the tap as user gesture). */
  onEnableDevice: () => void;
  onChooseNtfy: () => void;
  onDismiss: () => void;
}

const buttonSx = { textTransform: 'none', fontWeight: 700 } as const;

interface OptionRowProps {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  text: string;
  selected: boolean;
  selectable: boolean;
  onSelect: () => void;
}

const OptionRow: React.FC<OptionRowProps> = ({
  icon,
  title,
  badge,
  text,
  selected,
  selectable,
  onSelect,
}) => (
  <ListItemButton
    role="radio"
    aria-checked={selected}
    aria-disabled={!selectable}
    selected={selected}
    disableRipple={!selectable}
    onClick={selectable ? onSelect : undefined}
    sx={{ alignItems: 'flex-start', gap: 1.5, px: 2, py: 1.5 }}
  >
    <Box sx={{ display: 'flex', pt: 0.25, opacity: selectable ? 1 : 0.5 }}>{icon}</Box>
    <ListItemText
      sx={{ m: 0 }}
      primary={
        <Stack
          direction="row"
          useFlexGap
          sx={{ alignItems: 'center', flexWrap: 'wrap', columnGap: 1, rowGap: 0.5 }}
        >
          <Typography
            variant="body1"
            sx={{ fontWeight: 600, color: selectable ? 'text.primary' : 'text.secondary' }}
          >
            {title}
          </Typography>
          {badge && <Chip size="small" color="primary" variant="outlined" label={badge} />}
        </Stack>
      }
      secondary={text}
    />
    <Radio
      checked={selected}
      disabled={!selectable}
      tabIndex={-1}
      disableRipple
      sx={{ p: 0, mt: 0.25 }}
      slotProps={{ input: { 'aria-hidden': true } }}
    />
  </ListItemButton>
);

/**
 * Asks how the user wants to be notified before the browser's own permission prompt appears, so
 * a "no" here never burns the one-time system prompt.
 */
export const NotificationChannelChooser: React.FC<NotificationChannelChooserProps> = ({
  status,
  recommended,
  showNtfy,
  ntfySelected,
  ntfyUrl,
  onEnableDevice,
  onChooseNtfy,
  onDismiss,
}) => {
  const { t } = useTranslation();
  const deviceSelectable = status === 'available';
  const [selected, setSelected] = useState<NotificationChoice | null>(() => {
    if (ntfySelected && showNtfy) return 'ntfy';
    if (recommended === 'device') return deviceSelectable ? 'device' : null;
    return showNtfy ? 'ntfy' : null;
  });
  const recommendedLabel = t('settings.notify_recommended', 'Empfohlen');

  const deviceText: Record<Exclude<DeviceChannelStatus, 'active'>, string> = {
    available: t(
      'settings.notify_device_desc',
      'Nutzt die Benachrichtigungen deines Geräts (Apple, Google oder dein Browser). Dein Gerät fragt danach nach der Erlaubnis.',
    ),
    'install-first': t(
      'guessart.pushIosInstall',
      'Auf dem iPhone kommen Benachrichtigungen nur in der installierten App: Teilen-Symbol → „Zum Home-Bildschirm“, dann von dort öffnen und hier aktivieren.',
    ),
    blocked: t(
      'settings.notify_device_blocked',
      'Benachrichtigungen sind für diese Seite blockiert. Erlaube sie in den Website-Einstellungen deines Browsers und komm zurück.',
    ),
    unsupported: t(
      'settings.notify_device_unsupported',
      'Dieser Browser kann keine Benachrichtigungen anzeigen.',
    ),
  };

  return (
    <Stack spacing={2} sx={{ width: '100%' }}>
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {t('settings.notify_choice_title', 'Wie möchtest du benachrichtigt werden?')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t(
            'settings.notify_choice_hint',
            'Du erfährst, wenn du dran bist – auch bei geschlossener App.',
          )}
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <List role="radiogroup" disablePadding>
          <OptionRow
            icon={<NotificationsActiveRoundedIcon color="primary" />}
            title={t('settings.notify_device_title', 'Auf diesem Gerät')}
            badge={recommended === 'device' ? recommendedLabel : undefined}
            text={deviceText[status === 'active' ? 'available' : status]}
            selected={selected === 'device'}
            selectable={deviceSelectable}
            onSelect={() => setSelected('device')}
          />
          {showNtfy && (
            <>
              <Divider component="li" />
              <OptionRow
                icon={<ShieldRoundedIcon color="info" />}
                title={t('settings.notify_ntfy_title', 'Über die ntfy-App')}
                badge={recommended === 'ntfy' ? recommendedLabel : undefined}
                text={t(
                  'settings.notify_ntfy_desc',
                  'Funktioniert ohne Apple- oder Google-Dienste: kostenlose ntfy-App installieren und dein persönliches Topic abonnieren.',
                )}
                selected={selected === 'ntfy'}
                selectable
                onSelect={() => setSelected('ntfy')}
              />
            </>
          )}
        </List>
      </Paper>

      <Stack spacing={0.5}>
        {selected === 'ntfy' ? (
          <Button
            fullWidth
            size="large"
            variant="contained"
            component="a"
            href={ntfyUrl}
            target="_blank"
            rel="noopener noreferrer"
            endIcon={<OpenInNewRoundedIcon />}
            onClick={onChooseNtfy}
            sx={buttonSx}
          >
            {t('settings.ntfy_subscribe_btn', 'In ntfy abonnieren')}
          </Button>
        ) : (
          <Button
            fullWidth
            size="large"
            variant="contained"
            disabled={selected !== 'device'}
            onClick={onEnableDevice}
            sx={buttonSx}
          >
            {t('settings.notify_continue', 'Weiter')}
          </Button>
        )}
        <Button fullWidth color="inherit" onClick={onDismiss} sx={buttonSx}>
          {t('settings.notify_not_now', 'Nicht jetzt')}
        </Button>
      </Stack>
    </Stack>
  );
};
