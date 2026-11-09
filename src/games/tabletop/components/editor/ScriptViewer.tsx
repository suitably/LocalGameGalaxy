/**
 * Read-only view of an imported script layer [ID: COMP-TABLETOP-SCRIPT-VIEWER]
 *
 * Shows Lua, saved Lua state, XML UI, tags and GM notes verbatim; nothing is executed (ADR-0005).
 */
import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { ScriptEntry } from '../../logic/types';

interface ScriptViewerProps {
  /** Heading, e.g. the widget name or "Global". */
  title: string;
  entry: ScriptEntry;
}

const CodeBlock: React.FC<{ label: string; code: string }> = ({ label, code }) => (
  <Box>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Box
      component="pre"
      tabIndex={0}
      sx={{
        m: 0,
        p: 1,
        maxHeight: 220,
        overflow: 'auto',
        fontFamily: 'monospace',
        fontSize: '0.75rem',
        bgcolor: 'action.hover',
        borderRadius: 1,
        whiteSpace: 'pre',
        userSelect: 'text',
      }}
    >
      {code}
    </Box>
  </Box>
);

export const ScriptViewer: React.FC<ScriptViewerProps> = ({ title, entry }) => {
  const { t } = useTranslation();
  return (
    <Stack spacing={1} data-testid="tabletop-script-viewer">
      <Typography variant="subtitle2" fontWeight={700}>
        {title}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {t('games.tabletop.scripts.read_only')}
      </Typography>
      {entry.lua && <CodeBlock label={t('games.tabletop.scripts.lua')} code={entry.lua} />}
      {entry.luaState && (
        <CodeBlock label={t('games.tabletop.scripts.lua_state')} code={entry.luaState} />
      )}
      {entry.xmlUi && <CodeBlock label={t('games.tabletop.scripts.xml_ui')} code={entry.xmlUi} />}
      {entry.gmNotes && (
        <CodeBlock label={t('games.tabletop.scripts.gm_notes')} code={entry.gmNotes} />
      )}
      {entry.tags && (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {entry.tags.map((tag) => (
            <Chip key={tag} size="small" label={tag} />
          ))}
        </Stack>
      )}
    </Stack>
  );
};
