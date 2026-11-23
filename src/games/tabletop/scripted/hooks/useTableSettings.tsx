/**
 * Table settings of a scripted card game: the stored preset and the header dialog [ID: HOOK-TABLETOP-SCRIPT-SETTINGS]
 *
 * The preset (`STORAGE_PREFIXES.TABLETOP_SCRIPT_OPTIONS`) is what this device chose last; it
 * fills the setup. While a match runs the dialog shows the match's own settings and `onApply`
 * sends them to the session (`OPTIONS`).
 */
import { useCallback, useState, type ReactNode } from 'react';
import { resolveOptions, type AnyGameScript, type ScriptOptions } from '../logic/scriptTypes';
import { loadTableOptions, saveTableOptions } from '../logic/sessionStore';
import { ScriptSettingsDialog } from '../components/ScriptSettingsDialog';

export function useTablePreset(script: AnyGameScript) {
  const [stored, setStored] = useState<ScriptOptions>(() => loadTableOptions(script.id));
  const setPreset = useCallback(
    (next: ScriptOptions) => {
      setStored(next);
      saveTableOptions(script.id, next);
    },
    [script.id],
  );
  return [resolveOptions(script.options, stored), setPreset] as const;
}

interface TableSettingsArgs {
  script: AnyGameScript;
  /** Settings shown: the running match's, or the preset in the setup. */
  value: ScriptOptions | undefined;
  /** Missing: read-only. */
  onChange?: (next: ScriptOptions) => void;
  running: boolean;
  shared: boolean;
}

/** `open` is undefined when the game has no settings or none are known yet (a guest in setup). */
export function useTableSettings({ script, value, onChange, running, shared }: TableSettingsArgs): {
  open?: () => void;
  dialog: ReactNode;
} {
  const [isOpen, setOpen] = useState(false);
  if (!script.options?.length || !value) return { dialog: null };
  return {
    open: () => setOpen(true),
    dialog: (
      <ScriptSettingsDialog
        open={isOpen}
        onClose={() => setOpen(false)}
        script={script}
        value={resolveOptions(script.options, value)}
        onChange={onChange}
        running={running}
        shared={shared}
      />
    ),
  };
}
