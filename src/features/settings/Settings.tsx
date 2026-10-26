import React, { useEffect, useMemo } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../context/TitleContext';
import { useHeaderLayout } from '../../context/HeaderLayoutContext';
import { gameRegistry } from '../../lib/gameRegistry';
import { AppSettingsDetail } from './components/AppSettingsDetail';
import { GameSettingsDetail } from './components/GameSettingsDetail';
import { SettingsPageLayout } from './SettingsPageLayout';
import { SettingsRail } from './SettingsRail';
import { isEntryActive, useSettingsNav } from './settingsNavModel';
import { parseSettingsLocation, settingsPath, type SettingsTarget } from './settingsRoutes';

/** Master-detail settings page (rail + detail on `md`+, list page / detail page below). */
export const Settings: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isWide = useMediaQuery(theme.breakpoints.up('md'));
  const location = useLocation();
  const navigate = useNavigate();
  const { setHomeAction } = useHeaderLayout();
  const nav = useSettingsNav();

  const parsed = parseSettingsLocation(location.pathname, location.search);
  const game =
    parsed.kind === 'game'
      ? gameRegistry.getGames().find((g) => g.id === parsed.gameId)
      : undefined;
  const hasGame = Boolean(game?.settings?.sections.length);
  // Unknown games fall back to the list; unknown sections just show the whole game page.
  const target: SettingsTarget = parsed.kind === 'game' && !hasGame ? { kind: 'list' } : parsed;
  const shown: SettingsTarget =
    target.kind === 'list' && isWide ? { kind: 'app', section: 'general' } : target;
  const showDetail = target.kind !== 'list';

  const go = useMemo(
    () => (to: SettingsTarget) => navigate(settingsPath(to), { state: location.state }),
    [navigate, location.state],
  );

  // Phone detail page: header back returns to the list (otherwise the header goes back to `from`).
  useEffect(() => {
    if (showDetail && !isWide) {
      setHomeAction(() => go({ kind: 'list' }));
      return () => setHomeAction(null);
    }
  }, [showDetail, isWide, go, setHomeAction]);

  const entry = [...nav.top, ...nav.games, ...nav.bottom].find((e) => isEntryActive(e, shown));
  usePageTitle(showDetail && !isWide && entry ? entry.label : t('settings.title', 'Settings'));

  const gameFocus = shown.kind === 'game' ? (shown.highlight ?? shown.section) : undefined;
  const detail =
    shown.kind === 'app' ? (
      <AppSettingsDetail section={shown.section} highlight={shown.highlight} />
    ) : shown.kind === 'game' && game ? (
      <GameSettingsDetail game={game} focusId={gameFocus} />
    ) : null;

  return (
    <SettingsPageLayout
      isWide={isWide}
      showDetail={showDetail}
      rail={<SettingsRail nav={nav} current={shown} onSelect={go} />}
      detail={detail}
    />
  );
};
