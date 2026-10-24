import React from 'react';
import {
  alpha,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  TextField,
  Typography,
} from '@mui/material';
import KeyIcon from '@mui/icons-material/KeyRounded';
import type { Theme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { ComposeHostPaths } from './composeYamlGenerator';
import type { ComposeGeneratorState, ComposeToggle } from './useComposeGenerator';

const SERVICE_TOGGLES: { key: ComposeToggle; label: string }[] = [
  { key: 'melodiq', label: 'settings.compose_service_melodiq' },
  { key: 'notes', label: 'settings.compose_service_notes' },
  { key: 'tabletop', label: 'settings.compose_service_tabletop' },
  { key: 'signaling', label: 'settings.compose_service_signaling' },
  { key: 'tunnel', label: 'settings.compose_service_tunnel' },
];

const groupSx = {
  gap: 1,
  p: 1.5,
  mb: 2.5,
  bgcolor: (theme: Theme) => alpha(theme.palette.text.primary, 0.03),
  borderRadius: 2,
  border: 1,
  borderColor: 'divider',
} as const;

const sectionTitle = (text: string) => (
  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1, color: 'text.secondary' }}>
    {text}
  </Typography>
);

/** The choices behind the generated compose file: services, ports, token and host folders. */
export const ComposeOptionsForm: React.FC<{ state: ComposeGeneratorState }> = ({ state }) => {
  const { t } = useTranslation();
  const { options } = state;

  const folders: { key: keyof ComposeHostPaths; label: string; show: boolean }[] = [
    { key: 'config', label: 'settings.compose_path_config', show: state.companion },
    { key: 'music', label: 'settings.compose_path_music', show: options.melodiq },
    { key: 'models', label: 'settings.compose_path_models', show: options.melodiq },
    { key: 'notes', label: 'settings.compose_path_notes', show: options.notes },
    { key: 'tabletop', label: 'settings.compose_path_tabletop', show: options.tabletop },
  ];
  const visibleFolders = folders.filter((f) => f.show);

  return (
    <>
      {sectionTitle(t('settings.compose_services_title'))}
      <FormGroup row sx={groupSx}>
        {SERVICE_TOGGLES.map(({ key, label }) => (
          <FormControlLabel
            key={key}
            control={
              <Checkbox checked={options[key]} onChange={() => state.toggle(key)} size="small" />
            }
            label={<Typography variant="body2">{t(label)}</Typography>}
          />
        ))}
        {options.melodiq && (
          <FormControlLabel
            control={
              <Checkbox
                checked={options.aiImage}
                onChange={() => state.toggle('aiImage')}
                size="small"
              />
            }
            label={<Typography variant="body2">{t('settings.compose_ai_image')}</Typography>}
          />
        )}
      </FormGroup>

      {sectionTitle(t('settings.compose_connection_title'))}
      <Box sx={{ ...groupSx, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        {state.companion && (
          <TextField
            size="small"
            type="number"
            label={t('settings.compose_port')}
            value={options.port}
            onChange={(e) => state.update({ port: Number(e.target.value) })}
          />
        )}
        {options.signaling && (
          <TextField
            size="small"
            type="number"
            label={t('settings.compose_signaling_port')}
            value={options.signalingPort}
            onChange={(e) => state.update({ signalingPort: Number(e.target.value) })}
          />
        )}
        {state.companion && (
          <Box sx={{ display: 'flex', gap: 1, gridColumn: '1 / -1' }}>
            <TextField
              size="small"
              fullWidth
              label={t('settings.compose_token')}
              helperText={t('settings.compose_token_hint')}
              value={options.token}
              onChange={(e) => state.update({ token: e.target.value })}
            />
            <Button
              variant="outlined"
              startIcon={<KeyIcon />}
              onClick={state.generateToken}
              sx={{ alignSelf: 'flex-start', whiteSpace: 'nowrap', textTransform: 'none' }}
            >
              {t('settings.compose_token_generate')}
            </Button>
          </Box>
        )}
      </Box>

      {visibleFolders.length > 0 && (
        <>
          {sectionTitle(t('settings.compose_folders_title'))}
          <Box
            sx={{ ...groupSx, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}
          >
            {visibleFolders.map(({ key, label }) => (
              <TextField
                key={key}
                size="small"
                label={t(label)}
                value={options.paths[key]}
                onChange={(e) => state.setPath(key, e.target.value)}
                slotProps={{ htmlInput: { spellCheck: false } }}
              />
            ))}
          </Box>
        </>
      )}
    </>
  );
};
