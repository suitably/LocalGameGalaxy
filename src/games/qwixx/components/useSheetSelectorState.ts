import { useState } from 'react';
import type { QwixxSheetType, SheetRowDefinition } from '../logic/types';
import {
  ALL_SHEET_TYPES,
  getSheetDefinition,
  generateRandomSheetRows,
} from '../logic/sheetDefinitions';

export type SelectSheetHandler = (
  sheetType: QwixxSheetType,
  presetIndex?: number,
  customRows?: SheetRowDefinition[],
) => void;

interface Options {
  currentSheetType: QwixxSheetType;
  onSelectSheet: SelectSheetHandler;
  onClose: () => void;
}

/** State and handlers of the sheet catalog dialog: layout presets, random mix and rules target. */
export function useSheetSelectorState({ currentSheetType, onSelectSheet, onClose }: Options) {
  const [rulesTargetSheet, setRulesTargetSheet] = useState<QwixxSheetType | null>(null);
  // Active preset per sheet type
  const [presetMap, setPresetMap] = useState<Record<string, number>>({
    gemixxt_a: 0,
    gemixxt_b: 0,
  });
  // Custom generated rows for random_mix
  const [randomCustomRows, setRandomCustomRows] = useState<SheetRowDefinition[] | undefined>(
    undefined,
  );

  const handleSelectPreset = (sheetType: string, presetIndex: number) => {
    setPresetMap((prev) => ({ ...prev, [sheetType]: presetIndex }));
  };

  const handleGenerateNewRandom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRandomCustomRows(generateRandomSheetRows());
  };

  const handleGlobalRandom = () => {
    const otherTypes = ALL_SHEET_TYPES.filter((t) => t !== currentSheetType);
    const randomType =
      otherTypes[Math.floor(Math.random() * otherTypes.length)] || ALL_SHEET_TYPES[0];
    const def = getSheetDefinition(randomType);
    const randomPreset = def.presets ? Math.floor(Math.random() * def.presets.length) : 0;
    const customRows = randomType === 'random_mix' ? generateRandomSheetRows() : undefined;

    onSelectSheet(randomType, randomPreset, customRows);
    onClose();
  };

  const handleChooseCard = (sheetType: QwixxSheetType) => {
    const presetIndex = presetMap[sheetType] ?? 0;
    const customRows =
      sheetType === 'random_mix' ? randomCustomRows || generateRandomSheetRows() : undefined;
    onSelectSheet(sheetType, presetIndex, customRows);
    onClose();
  };

  const handleRulesSelectAndPlay = (sheetType: QwixxSheetType, preset?: number) => {
    onSelectSheet(sheetType, preset, sheetType === 'random_mix' ? randomCustomRows : undefined);
    onClose();
  };

  return {
    rulesTargetSheet,
    setRulesTargetSheet,
    presetMap,
    randomCustomRows,
    handleSelectPreset,
    handleGenerateNewRandom,
    handleGlobalRandom,
    handleChooseCard,
    handleRulesSelectAndPlay,
  };
}
