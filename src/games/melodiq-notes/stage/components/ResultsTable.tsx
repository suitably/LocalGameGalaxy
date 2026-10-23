import { Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { StageEngine } from '../engine/StageEngine';
import { playerResults } from '../engine/results';

export function ResultsTable({ engine }: { engine: StageEngine }) {
  const { t, i18n } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.${key}`, opts);
  return (
    <Table size="small" sx={{ width: 'auto' }}>
      <TableHead>
        <TableRow>
          <TableCell>{k('results.track')}</TableCell>
          <TableCell>{k('results.stars')}</TableCell>
          <TableCell align="right">{k('results.accuracy')}</TableCell>
          <TableCell align="right">{k('results.score')}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {playerResults(engine.players).map((r) => (
          <TableRow key={r.no}>
            <TableCell>
              {engine.players.length > 1 ? `${k('player', { no: r.no })} · ` : ''}
              {k(`instruments.${r.inst}`)} · {r.partName}
            </TableCell>
            <TableCell sx={{ color: 'warning.main', letterSpacing: 2 }} aria-label={`${r.stars}/3`}>
              {'★'.repeat(r.stars)}
              <span style={{ opacity: 0.25 }}>{'★'.repeat(3 - r.stars)}</span>
            </TableCell>
            <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(r.accuracy * 100)} %
            </TableCell>
            <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {r.score.toLocaleString(i18n.language)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
