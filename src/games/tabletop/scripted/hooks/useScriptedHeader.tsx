/**
 * Title, back arrow, rules, table settings and restart of a scripted card game in the global header [ID: HOOK-TABLETOP-SCRIPT-HEADER]
 */
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../../../context/TitleContext';
import { useTabletopHeader } from '../../hooks/useTabletopHeader';
import { RulesDialog } from '../../components/surface/RulesDialog';
import { CARD_GAMES } from '../../logic/tableCatalog';
import { exportGameAsJson } from '../../logic/tabletopExporter';
import { getScript } from '../logic/scriptRegistry';
import { scriptedGameDefinition } from '../logic/scriptExport';

interface ScriptedHeaderOptions {
  scriptId: string;
  onBack: () => void;
  /** Host only: ends the game for everyone. */
  onBackToLobby?: () => void;
  /** Owner only, while a game runs: back to the setup. */
  onRestart?: () => void;
  /** Games with table settings (`useTableSettings`). */
  onOpenSettings?: () => void;
  /** Host only: puts the public table on a TV. */
  onShowOnTv?: () => void;
}

/** Returns the rules dialog to render. */
export function useScriptedHeader({
  scriptId,
  onBack,
  onBackToLobby,
  onRestart,
  onOpenSettings,
  onShowOnTv,
}: ScriptedHeaderOptions): ReactNode {
  const { t } = useTranslation();
  const [rulesOpen, setRulesOpen] = useState(false);
  const entry = CARD_GAMES.find((g) => g.id === scriptId);
  const title = entry ? t(entry.titleKey, entry.title) : scriptId;
  const ruleText = t(`games.tabletop.scripted.rules.${scriptId}`);
  usePageTitle(title);
  const script = getScript(scriptId);
  const onExportJson = script
    ? () =>
        exportGameAsJson(
          scriptedGameDefinition(script, {
            name: title,
            description: entry?.descKey ? t(entry.descKey) : '',
            ruleText,
          }),
        )
    : undefined;
  useTabletopHeader({
    onBack,
    onBackToLobby,
    onShowOnTv,
    onOpenRules: () => setRulesOpen(true),
    onOpenSettings,
    onRestart,
    onExportJson,
  });
  return <RulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} ruleText={ruleText} />;
}
