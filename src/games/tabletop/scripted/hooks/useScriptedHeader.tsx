/**
 * Title, back arrow, rules and restart of a scripted card game in the global header [ID: HOOK-TABLETOP-SCRIPT-HEADER]
 */
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../../../context/TitleContext';
import { useTabletopHeader } from '../../hooks/useTabletopHeader';
import { RulesDialog } from '../../components/surface/RulesDialog';
import { CARD_GAMES } from '../../logic/tableCatalog';

interface ScriptedHeaderOptions {
  scriptId: string;
  onBack: () => void;
  /** Host only: ends the game for everyone. */
  onBackToLobby?: () => void;
  /** Owner only, while a game runs: back to the setup. */
  onRestart?: () => void;
}

/** Returns the rules dialog to render. */
export function useScriptedHeader({
  scriptId,
  onBack,
  onBackToLobby,
  onRestart,
}: ScriptedHeaderOptions): ReactNode {
  const { t } = useTranslation();
  const [rulesOpen, setRulesOpen] = useState(false);
  const entry = CARD_GAMES.find((g) => g.id === scriptId);
  usePageTitle(entry ? t(entry.titleKey, entry.title) : scriptId);
  useTabletopHeader({
    onBack,
    onBackToLobby,
    onOpenRules: () => setRulesOpen(true),
    onRestart,
  });
  return (
    <RulesDialog
      open={rulesOpen}
      onClose={() => setRulesOpen(false)}
      ruleText={t(`games.tabletop.scripted.rules.${scriptId}`)}
    />
  );
}
