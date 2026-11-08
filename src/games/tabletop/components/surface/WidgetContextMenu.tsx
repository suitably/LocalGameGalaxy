/**
 * Context menu for Tabletop widgets [ID: GAME-TABLETOP-WIDGET-CONTEXT-MENU]
 *
 * Built from a flat item list: MUI's `Menu` needs its items as direct children (no Fragments)
 * for keyboard navigation.
 */
import React from 'react';
import { Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOffRounded';
import ZoomInIcon from '@mui/icons-material/ZoomInRounded';
import ZoomOutIcon from '@mui/icons-material/ZoomOutRounded';
import RestartAltIcon from '@mui/icons-material/RestartAltRounded';
import FlipToFrontIcon from '@mui/icons-material/FlipToFrontRounded';
import FlipToBackIcon from '@mui/icons-material/FlipToBackRounded';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpwardRounded';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownwardRounded';
import CheckBoxIcon from '@mui/icons-material/CheckBoxRounded';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlankRounded';
import FlipIcon from '@mui/icons-material/FlipRounded';
import ShuffleIcon from '@mui/icons-material/ShuffleRounded';
import CasinoIcon from '@mui/icons-material/CasinoRounded';
import PanToolIcon from '@mui/icons-material/PanToolRounded';
import GroupsIcon from '@mui/icons-material/GroupsRounded';
import type { DeckWidget, TabletopWidget } from '../../logic/types';
import type { ZOrderOp } from '../../logic/zOrder';
import { flipActionFor, shakeActionFor } from '../../logic/tableGestures';
import { useTranslation } from 'react-i18next';

export interface WidgetContextMenuPosition {
  mouseX: number;
  mouseY: number;
  widgetId: string;
}

interface WidgetContextMenuProps {
  position: WidgetContextMenuPosition | null;
  widget?: TabletopWidget;
  isSelected?: boolean;
  onClose: () => void;
  onToggleSelect?: (widgetId: string) => void;
  onToggleShowAlways?: (widgetId: string, current: boolean) => void;
  onScaleWidget?: (widgetId: string, factor: number) => void;
  onResetWidgetScale?: (widgetId: string) => void;
  onZOrder?: (widgetId: string, op: ZOrderOp) => void;
  /** Flip a card (F). */
  onFlip?: (widgetId: string) => void;
  /** Shuffle a deck / roll a die (S). */
  onShake?: (widgetId: string) => void;
  /** Deck: draw the top card into the viewer's hand (absent without a hand). */
  onDrawToHand?: (deckId: string) => void;
  /** Deck: deal `perHand` cards to every player's hand (absent without hands). */
  onDeal?: (deckId: string, perHand: number) => void;
}

interface Item {
  key: string;
  icon: React.ReactNode;
  label: string;
  secondary?: string;
  run: () => void;
}
type Entry = Item | 'divider';

const Z_ITEMS = [
  { op: 'front', icon: FlipToFrontIcon, key: 'bringToFront', fallback: 'Bring to front' },
  { op: 'forward', icon: ArrowUpwardIcon, key: 'bringForward', fallback: 'Bring forward' },
  { op: 'backward', icon: ArrowDownwardIcon, key: 'sendBackward', fallback: 'Send backward' },
  { op: 'back', icon: FlipToBackIcon, key: 'sendToBack', fallback: 'Send to back' },
] as const;

export const WidgetContextMenu: React.FC<WidgetContextMenuProps> = (props) => {
  const { position, widget, isSelected, onClose } = props;
  const { t } = useTranslation();
  if (!position || !widget) return null;

  const id = widget.id;
  const hasCards = widget.type === 'deck' && (widget as DeckWidget).cardIds.length > 0;
  const showAlways = Boolean(widget.showAlways);
  const groups: Item[][] = [[], [], [], [], []];
  const add = (group: number, item: Item | false | undefined) => item && groups[group].push(item);

  add(
    0,
    hasCards &&
      props.onDrawToHand && {
        key: 'draw',
        icon: <PanToolIcon fontSize="small" />,
        label: t('games.tabletop.drawToHand', 'Auf die Hand ziehen'),
        run: () => props.onDrawToHand?.(id),
      },
  );
  for (const perHand of [1, 5]) {
    add(
      0,
      hasCards &&
        props.onDeal && {
          key: `deal${perHand}`,
          icon: <GroupsIcon fontSize="small" />,
          label: t('games.tabletop.dealEach', '{{count}} an alle austeilen', { count: perHand }),
          run: () => props.onDeal?.(id, perHand),
        },
    );
  }
  add(
    0,
    Boolean(props.onFlip && flipActionFor(widget)) && {
      key: 'flip',
      icon: <FlipIcon fontSize="small" />,
      label: t('games.tabletop.flipCard', 'Umdrehen'),
      secondary: 'F',
      run: () => props.onFlip?.(id),
    },
  );
  add(
    0,
    Boolean(props.onShake && shakeActionFor(widget)) && {
      key: 'shake',
      icon:
        widget.type === 'die' ? <CasinoIcon fontSize="small" /> : <ShuffleIcon fontSize="small" />,
      label:
        widget.type === 'die'
          ? t('games.tabletop.rollDie', 'Würfeln')
          : t('games.tabletop.shuffleDeck', 'Mischen'),
      secondary: 'S',
      run: () => props.onShake?.(id),
    },
  );
  add(
    1,
    props.onToggleSelect && {
      key: 'select',
      icon: isSelected ? (
        <CheckBoxIcon fontSize="small" color="primary" />
      ) : (
        <CheckBoxOutlineBlankIcon fontSize="small" />
      ),
      label: isSelected
        ? t('games.tabletop.deselectWidget', 'Auswahl aufheben')
        : t('games.tabletop.selectWidget', 'Element auswählen'),
      run: () => props.onToggleSelect?.(id),
    },
  );
  add(
    1,
    props.onToggleShowAlways && {
      key: 'showAlways',
      icon: showAlways ? (
        <VisibilityOffIcon fontSize="small" />
      ) : (
        <VisibilityIcon fontSize="small" color="primary" />
      ),
      label: showAlways
        ? t('games.tabletop.disableShowAlways', 'Normal verbergen in Zonen')
        : t('games.tabletop.enableShowAlways', 'Immer anzeigen (Show Always)'),
      run: () => props.onToggleShowAlways?.(id, showAlways),
    },
  );
  if (props.onZOrder) {
    for (const { op, icon: Icon, key, fallback } of Z_ITEMS) {
      add(2, {
        key: op,
        icon: <Icon fontSize="small" />,
        label: t(`games.tabletop.${key}`, fallback),
        run: () => props.onZOrder?.(id, op),
      });
    }
  }
  add(
    3,
    props.onScaleWidget && {
      key: 'scaleUp',
      icon: <ZoomInIcon fontSize="small" />,
      label: t('games.tabletop.scaleUpItem', 'Vergrößern (+25%)'),
      run: () => props.onScaleWidget?.(id, 1.25),
    },
  );
  add(
    3,
    props.onScaleWidget && {
      key: 'scaleDown',
      icon: <ZoomOutIcon fontSize="small" />,
      label: t('games.tabletop.scaleDownItem', 'Verkleinern (-20%)'),
      run: () => props.onScaleWidget?.(id, 0.8),
    },
  );
  add(
    3,
    props.onResetWidgetScale && {
      key: 'resetScale',
      icon: <RestartAltIcon fontSize="small" />,
      label: t('games.tabletop.resetScaleItem', 'Größe zurücksetzen'),
      run: () => props.onResetWidgetScale?.(id),
    },
  );

  const entries: Entry[] = groups
    .filter((g) => g.length > 0)
    .flatMap((g, i) => (i === 0 ? g : ['divider' as const, ...g]));

  return (
    <Menu
      open
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={{ top: position.mouseY, left: position.mouseX }}
    >
      {entries.map((entry, i) =>
        entry === 'divider' ? (
          <Divider key={`divider${i}`} sx={{ my: 0.5 }} />
        ) : (
          <MenuItem
            key={entry.key}
            onClick={() => {
              entry.run();
              onClose();
            }}
          >
            <ListItemIcon>{entry.icon}</ListItemIcon>
            <ListItemText secondary={entry.secondary}>{entry.label}</ListItemText>
          </MenuItem>
        ),
      )}
    </Menu>
  );
};
