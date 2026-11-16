/**
 * Registers the running table's game menu in the global header [ID: HOOK-TABLETOP-HEADER]
 *
 * Back arrow (`setHomeAction`) plus menu items (`setMenuItems`): on phones they collapse into
 * the header's overflow menu, on wide screens they show as header icons. Canvas tools (zoom,
 * fit, selection, editor tools) stay on the table. An entry whose callback is missing is left
 * out (`headerMenuKeys`), so host-only entries never reach phones or spectators.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import GroupsIcon from '@mui/icons-material/GroupsRounded';
import SaveIcon from '@mui/icons-material/SaveRounded';
import ReplayIcon from '@mui/icons-material/ReplayRounded';
import MenuBookIcon from '@mui/icons-material/MenuBookRounded';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurantRounded';
import { useHeaderLayout, type MenuItem } from '../../../context/HeaderLayoutContext';
import { HEADER_MENU_ENTRIES, headerMenuKeys, type HeaderMenuKey } from '../logic/headerMenu';

export interface TabletopHeaderActions extends Partial<Record<HeaderMenuKey, () => void>> {
  /** Header back arrow; `undefined` keeps the default (home). */
  onBack?: () => void;
}

const ICONS: Record<HeaderMenuKey, ReactNode> = {
  onBackToLobby: <GroupsIcon />,
  onOpenRules: <MenuBookIcon />,
  onOpenSaves: <SaveIcon />,
  onOpenTableSettings: <TableRestaurantIcon />,
  onRestart: <ReplayIcon />,
};

export function useTabletopHeader(actions: TabletopHeaderActions): void {
  const { t } = useTranslation();
  const { setMenuItems, setHomeAction } = useHeaderLayout();
  // The header keeps items while their labels stay equal, so actions go through a ref.
  const actionsRef = useRef(actions);
  useEffect(() => {
    actionsRef.current = actions;
  });

  const present = headerMenuKeys(actions).join(',');
  const hasBack = Boolean(actions.onBack);

  useEffect(() => {
    const keys = present.split(',');
    const items: MenuItem[] = HEADER_MENU_ENTRIES.filter(({ key }) => keys.includes(key)).map(
      ({ key, labelKey }) => ({
        label: t(labelKey),
        icon: ICONS[key],
        action: () => actionsRef.current[key]?.(),
      }),
    );
    setMenuItems(items);
    setHomeAction(hasBack ? () => actionsRef.current.onBack?.() : null);
    return () => {
      setMenuItems([]);
      setHomeAction(null);
    };
  }, [present, hasBack, t, setMenuItems, setHomeAction]);
}
