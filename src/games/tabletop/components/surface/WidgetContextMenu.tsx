/**
 * Context menu for Tabletop widgets [ID: GAME-TABLETOP-WIDGET-CONTEXT-MENU]
 *
 * Flat item list: MUI's `Menu` needs direct children (no Fragments) for keyboard navigation.
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
import StyleIcon from '@mui/icons-material/StyleRounded';
import type { DeckWidget, TabletopWidget } from '../../logic/types';
import type { StackDeck, StackDisplay } from '../../logic/reducers/stackReducer';
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
  /** Stack (pile deck): switch between the neat pile and the fanned-out display (#558). */
  onSetStackDisplay?: (deckId: string, display: StackDisplay) => void;
  /** Deck: draw the top card into the viewer's hand (absent without a hand). */
  onDrawToHand?: (deckId: string) => void;
  /** Deck: put the top card face up next to the deck. */
  onFlipTop?: (deckId: string) => void;
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
  { op: 'front', icon: FlipToFrontIcon, key: 'bringToFront' },
  { op: 'forward', icon: ArrowUpwardIcon, key: 'bringForward' },
  { op: 'backward', icon: ArrowDownwardIcon, key: 'sendBackward' },
  { op: 'back', icon: FlipToBackIcon, key: 'sendToBack' },
] as const;

export const WidgetContextMenu: React.FC<WidgetContextMenuProps> = (props) => {
  const { position, widget, isSelected, onClose } = props;
  const { t } = useTranslation();
  if (!position || !widget) return null;

  const id = widget.id;
  const hasCards = widget.type === 'deck' && (widget as DeckWidget).cardIds.length > 0;
  const showAlways = Boolean(widget.showAlways);
  const stack =
    widget.type === 'deck' && (widget as DeckWidget).isPile ? (widget as StackDeck) : null;
  const fanned = stack?.stackDisplay === 'fan';
  const groups: Item[][] = [[], [], [], [], []];
  const add = (group: number, item: Item | false | undefined) => item && groups[group].push(item);

  add(
    0,
    hasCards &&
      props.onDrawToHand && {
        key: 'draw',
        icon: <PanToolIcon fontSize="small" />,
        label: t('games.tabletop.drawToHand'),
        run: () => props.onDrawToHand?.(id),
      },
  );
  add(
    0,
    Boolean(stack) &&
      props.onSetStackDisplay && {
        key: 'stackDisplay',
        icon: <StyleIcon fontSize="small" />,
        label: t(fanned ? 'games.tabletop.stackPile' : 'games.tabletop.stackFan'),
        run: () => props.onSetStackDisplay?.(id, fanned ? 'pile' : 'fan'),
      },
  );
  add(
    0,
    hasCards &&
      props.onFlipTop && {
        key: 'flipTop',
        icon: <FlipIcon fontSize="small" />,
        label: t('games.tabletop.flipTopCard'),
        run: () => props.onFlipTop?.(id),
      },
  );
  for (const perHand of [1, 5]) {
    add(
      0,
      hasCards &&
        props.onDeal && {
          key: `deal${perHand}`,
          icon: <GroupsIcon fontSize="small" />,
          label: t('games.tabletop.dealEach', { count: perHand }),
          run: () => props.onDeal?.(id, perHand),
        },
    );
  }
  add(
    0,
    Boolean(props.onFlip && flipActionFor(widget)) && {
      key: 'flip',
      icon: <FlipIcon fontSize="small" />,
      label: t('games.tabletop.flipCard'),
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
      label: widget.type === 'die' ? t('games.tabletop.rollDie') : t('games.tabletop.shuffleDeck'),
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
      label: isSelected ? t('games.tabletop.deselectWidget') : t('games.tabletop.selectWidget'),
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
        ? t('games.tabletop.disableShowAlways')
        : t('games.tabletop.enableShowAlways'),
      run: () => props.onToggleShowAlways?.(id, showAlways),
    },
  );
  if (props.onZOrder) {
    for (const { op, icon: Icon, key } of Z_ITEMS) {
      add(2, {
        key: op,
        icon: <Icon fontSize="small" />,
        label: t(`games.tabletop.${key}`),
        run: () => props.onZOrder?.(id, op),
      });
    }
  }
  add(
    3,
    props.onScaleWidget && {
      key: 'scaleUp',
      icon: <ZoomInIcon fontSize="small" />,
      label: t('games.tabletop.scaleUpItem'),
      run: () => props.onScaleWidget?.(id, 1.25),
    },
  );
  add(
    3,
    props.onScaleWidget && {
      key: 'scaleDown',
      icon: <ZoomOutIcon fontSize="small" />,
      label: t('games.tabletop.scaleDownItem'),
      run: () => props.onScaleWidget?.(id, 0.8),
    },
  );
  add(
    3,
    props.onResetWidgetScale && {
      key: 'resetScale',
      icon: <RestartAltIcon fontSize="small" />,
      label: t('games.tabletop.resetScaleItem'),
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
