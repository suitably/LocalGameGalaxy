/**
 * Context menu for Tabletop widgets [ID: GAME-TABLETOP-WIDGET-CONTEXT-MENU]
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
import type { TabletopWidget } from '../../logic/types';
import type { ZOrderOp } from '../../logic/zOrder';
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
}

const Z_ITEMS = [
  { op: 'front', icon: FlipToFrontIcon, key: 'bringToFront', fallback: 'Bring to front' },
  { op: 'forward', icon: ArrowUpwardIcon, key: 'bringForward', fallback: 'Bring forward' },
  { op: 'backward', icon: ArrowDownwardIcon, key: 'sendBackward', fallback: 'Send backward' },
  { op: 'back', icon: FlipToBackIcon, key: 'sendToBack', fallback: 'Send to back' },
] as const;

export const WidgetContextMenu: React.FC<WidgetContextMenuProps> = ({
  position,
  widget,
  isSelected,
  onClose,
  onToggleSelect,
  onToggleShowAlways,
  onScaleWidget,
  onResetWidgetScale,
  onZOrder,
}) => {
  const { t } = useTranslation();

  if (!position || !widget) return null;

  const isShowAlways = Boolean(widget.showAlways);

  return (
    <Menu
      open={position !== null}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={
        position !== null ? { top: position.mouseY, left: position.mouseX } : undefined
      }
    >
      {onToggleSelect && (
        <MenuItem
          onClick={() => {
            onToggleSelect(widget.id);
            onClose();
          }}
        >
          <ListItemIcon>
            {isSelected ? (
              <CheckBoxIcon fontSize="small" color="primary" />
            ) : (
              <CheckBoxOutlineBlankIcon fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText>
            {isSelected
              ? t('games.tabletop.deselectWidget', 'Auswahl aufheben')
              : t('games.tabletop.selectWidget', 'Element auswählen')}
          </ListItemText>
        </MenuItem>
      )}

      {onToggleShowAlways && (
        <MenuItem
          onClick={() => {
            onToggleShowAlways(widget.id, isShowAlways);
            onClose();
          }}
        >
          <ListItemIcon>
            {isShowAlways ? (
              <VisibilityOffIcon fontSize="small" />
            ) : (
              <VisibilityIcon fontSize="small" color="primary" />
            )}
          </ListItemIcon>
          <ListItemText>
            {isShowAlways
              ? t('games.tabletop.disableShowAlways', 'Normal verbergen in Zonen')
              : t('games.tabletop.enableShowAlways', 'Immer anzeigen (Show Always)')}
          </ListItemText>
        </MenuItem>
      )}

      <Divider sx={{ my: 0.5 }} />

      {onZOrder &&
        Z_ITEMS.map(({ op, icon: Icon, key, fallback }) => (
          <MenuItem
            key={op}
            onClick={() => {
              onZOrder(widget.id, op);
              onClose();
            }}
          >
            <ListItemIcon>
              <Icon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t(`games.tabletop.${key}`, fallback)}</ListItemText>
          </MenuItem>
        ))}

      {onZOrder && <Divider sx={{ my: 0.5 }} />}

      {onScaleWidget && (
        <>
          <MenuItem
            onClick={() => {
              onScaleWidget(widget.id, 1.25);
              onClose();
            }}
          >
            <ListItemIcon>
              <ZoomInIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('games.tabletop.scaleUpItem', 'Vergrößern (+25%)')}</ListItemText>
          </MenuItem>

          <MenuItem
            onClick={() => {
              onScaleWidget(widget.id, 0.8);
              onClose();
            }}
          >
            <ListItemIcon>
              <ZoomOutIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('games.tabletop.scaleDownItem', 'Verkleinern (-20%)')}</ListItemText>
          </MenuItem>
        </>
      )}

      {onResetWidgetScale && (
        <MenuItem
          onClick={() => {
            onResetWidgetScale(widget.id);
            onClose();
          }}
        >
          <ListItemIcon>
            <RestartAltIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('games.tabletop.resetScaleItem', 'Größe zurücksetzen')}</ListItemText>
        </MenuItem>
      )}
    </Menu>
  );
};
