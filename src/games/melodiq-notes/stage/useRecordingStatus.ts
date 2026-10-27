import { useTranslation } from 'react-i18next';
import { recordingStatus } from './logic/recordingStatus';
import type { StageSongState } from './useStageSong';

/** The recording behind the song: its state and the label its button carries. */
export function useRecordingStatus(state: StageSongState) {
  const { t } = useTranslation();
  const status = recordingStatus(!!state.recording, state.align, !!state.marks);
  const label =
    status.kind === 'running'
      ? t('games.melodiq_notes.stage.rec_chip_running', { percent: status.percent })
      : t(`games.melodiq_notes.stage.rec_chip_${status.kind}`);
  return { status, label };
}
