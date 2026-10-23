import { useCallback, useState } from 'react';
import type { InstrumentMixerChannel, ScorePartInfo } from '../types';
import { applyChannelUpdate, pickDefaultPartId, type MixerChannels } from '../logic/ensembleMix';

const FALLBACK_PART_ID = 'P1';

/** Which part the player practises, plus the ensemble mixer for all other parts. */
export const useMixerState = (parts: ScorePartInfo[]) => {
  const [chosenPartId, setSelectedPartId] = useState<string | null>(null);
  const [mixerChannels, setMixerChannels] = useState<MixerChannels>({});
  const [masterVolume, setMasterVolume] = useState<number>(1.0);
  const [mutePlayerPart, setMutePlayerPart] = useState<boolean>(false);
  const [soloInstrumentInSheet, setSoloInstrumentInSheet] = useState<boolean>(false);

  // Derived instead of synced in an effect: falls back to the default part
  // whenever the chosen one does not exist in the current score.
  const selectedPartId =
    chosenPartId && parts.some((p) => p.id === chosenPartId)
      ? chosenPartId
      : (pickDefaultPartId(parts) ?? FALLBACK_PART_ID);

  const handleChannelChange = useCallback(
    (partId: string, updates: Partial<InstrumentMixerChannel>) => {
      setMixerChannels((prev) => applyChannelUpdate(prev, partId, updates));
    },
    [],
  );

  return {
    selectedPartId,
    setSelectedPartId,
    mixerChannels,
    handleChannelChange,
    masterVolume,
    setMasterVolume,
    mutePlayerPart,
    setMutePlayerPart,
    soloInstrumentInSheet,
    setSoloInstrumentInSheet,
  };
};
