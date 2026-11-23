/**
 * Script log of the experimental Lua runtime [ID: COMP-TABLETOP-LUA-LOG]
 *
 * Shows the runtime's status, the chat lines and errors the scripts printed, and the TTS calls
 * the shim does not cover yet (#705). Host only; phones never run scripts.
 */
import React from 'react';
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { LuaRuntimeHost } from '../../logic/luaRuntimeHost';

interface LuaScriptLogDialogProps {
  host: LuaRuntimeHost;
  onClose: () => void;
}

export const LuaScriptLogDialog: React.FC<LuaScriptLogDialogProps> = ({ host, onClose }) => {
  const { t } = useTranslation();
  const unshimmed = [...host.unshimmed];
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('games.tabletop.lua.log_title')}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            {t(`games.tabletop.lua.status_${host.status}`)}
          </Typography>
          {host.log.length === 0 ? (
            <Typography variant="body2">{t('games.tabletop.lua.log_empty')}</Typography>
          ) : (
            <Stack spacing={0.5} sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
              {host.log.map((line, i) => (
                <Typography
                  key={i}
                  variant="body2"
                  component="div"
                  color={line.to === 'error' ? 'error' : 'text.primary'}
                  sx={{ fontFamily: 'inherit', wordBreak: 'break-word' }}
                >
                  {line.text}
                </Typography>
              ))}
            </Stack>
          )}
          {unshimmed.length > 0 && (
            <>
              <Typography variant="subtitle2">
                {t('games.tabletop.lua.unshimmed', { count: unshimmed.length })}
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {unshimmed.map((name) => (
                  <Chip key={name} label={name} size="small" variant="outlined" />
                ))}
              </Stack>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  );
};
