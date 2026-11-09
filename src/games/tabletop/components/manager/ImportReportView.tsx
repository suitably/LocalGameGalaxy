/**
 * What an import converted, degraded or dropped [ID: COMP-TABLETOP-IMPORT-REPORT]
 */
import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { ImportReport } from '../../logic/types';

const OUTCOMES = ['converted', 'degraded', 'dropped'] as const;
const COLORS = { converted: 'success', degraded: 'warning', dropped: 'error' } as const;

export const ImportReportView: React.FC<{ report: ImportReport }> = ({ report }) => {
  const { t } = useTranslation();
  const types = Object.entries(report.byType).sort(([a], [b]) => a.localeCompare(b));
  const hosts = Object.entries(report.imageHosts).sort(([, a], [, b]) => b - a);
  const { scripts } = report;
  const hasScripts = scripts.global || scripts.objects > 0 || scripts.xmlUi;

  return (
    <Stack spacing={1.5} data-testid="tabletop-import-report">
      <Typography variant="subtitle2" fontWeight={700}>
        {t('games.tabletop.import_report.title', { count: report.totals.objects })}
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {OUTCOMES.map((o) => (
          <Chip
            key={o}
            size="small"
            color={COLORS[o]}
            variant={report.totals[o] > 0 ? 'filled' : 'outlined'}
            label={t(`games.tabletop.import_report.${o}`, { count: report.totals[o] })}
          />
        ))}
      </Stack>
      <Box component="ul" sx={{ m: 0, pl: 2.5, maxHeight: 160, overflow: 'auto' }}>
        {types.map(([type, c]) => (
          <li key={type}>
            <Typography variant="body2">
              {type}:{' '}
              {OUTCOMES.filter((o) => c[o] > 0)
                .map((o) => `${c[o]} ${t(`games.tabletop.import_report.${o}_short`)}`)
                .join(', ')}
            </Typography>
          </li>
        ))}
      </Box>
      <Typography variant="body2">
        {hasScripts
          ? t('games.tabletop.import_report.scripts_present', {
              global: scripts.global
                ? t('games.tabletop.import_report.yes')
                : t('games.tabletop.import_report.no'),
              count: scripts.objects,
            })
          : t('games.tabletop.import_report.scripts_none')}
      </Typography>
      {hasScripts && (
        <Typography variant="caption" color="text.secondary">
          {t('games.tabletop.import_report.scripts_note')}
        </Typography>
      )}
      {hosts.length > 0 && (
        <Typography variant="body2">
          {t('games.tabletop.import_report.hosts', {
            hosts: hosts.map(([h, n]) => `${h} (${n})`).join(', '),
          })}
        </Typography>
      )}
      {report.assets && (
        <Typography variant="body2" data-testid="tabletop-import-assets">
          {t('games.tabletop.import_report.assets_cached', {
            cached: report.assets.cached,
            total: report.assets.total,
          })}
        </Typography>
      )}
      {report.assets && report.assets.failed > 0 && (
        <Typography variant="body2" color="warning.main">
          {t('games.tabletop.import_report.assets_dead', {
            count: report.assets.failed,
            hosts: Object.entries(report.assets.deadHosts)
              .map(([h, n]) => `${h} (${n})`)
              .join(', '),
          })}
        </Typography>
      )}
    </Stack>
  );
};
