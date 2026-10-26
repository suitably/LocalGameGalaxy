/**
 * "Latency N ms" button plus its calibration dialog, for the stage and for a pult [ID: GAME-MELODIQ-NOTES-LATENCY-CONTROL]
 */
import React, { useState } from 'react';
import { Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { StageEngine } from '../stage/engine/StageEngine';
import { useInputLatency, type LatencyRole } from '../stage/useInputLatency';
import type { StageInputSource } from '../stage/useStageInput';
import { useTapCalibration } from '../stage/useTapCalibration';
import { LatencyDialog } from './LatencyDialog';

interface LatencyControlProps {
  engine: StageEngine;
  role: LatencyRole;
  source: StageInputSource;
  /** Has the clicks played; resolves with their times on the `toClock` clock. */
  schedule: () => Promise<number[] | null>;
  toClock: (localMs: number) => number;
  canStart: boolean;
  note?: React.ReactNode;
}

export const LatencyControl: React.FC<LatencyControlProps> = ({
  engine,
  role,
  source,
  schedule,
  toClock,
  canStart,
  note,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const latency = useInputLatency(role, source);
  React.useEffect(
    () => engine.configureInput({ inputLatencyMs: latency.ms }),
    [engine, latency.ms],
  );
  const calibration = useTapCalibration(engine, schedule, toClock, latency.set);
  return (
    <>
      <Button size="small" variant="outlined" onClick={() => setOpen(true)}>
        {t('games.melodiq_notes.latency.button', { ms: latency.ms })}
      </Button>
      <LatencyDialog
        open={open}
        onClose={() => setOpen(false)}
        sourceLabel={t(`games.melodiq_notes.stage.input_${source}`)}
        latencyMs={latency.ms}
        onChange={latency.set}
        calibration={calibration}
        canStart={canStart}
        note={note}
      />
    </>
  );
};
