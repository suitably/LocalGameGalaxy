/**
 * Context menu for Tabletop widgets [ID: GAME-TABLETOP-WIDGET-CONTEXT-MENU]
 */
import React from 'react';
import { Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import type { TabletopWidget } from '../../logic/types';
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
}

export const WidgetContextMenu: React.FC<WidgetContextMenuProps> = ({
  position,
  widget,
  isSelected,
  onClose,
  onToggleSelect,
  onToggleShowAlways,
  onScaleWidget,
  onResetWidgetScale,
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
        position !== null
          ? { top: position.mouseY, left: position.mouseX }
          : undefined
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
            {isSelected ? <CheckBoxIcon fontSize="small" color="primary" /> : <CheckBoxOutlineBlankIcon fontSize="small" />}
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
            {isShowAlways ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" color="primary" />}
          </ListItemIcon>
          <ListItemText>
            {isShowAlways
              ? t('games.tabletop.disableShowAlways', 'Normal verbergen in Zonen')
              : t('games.tabletop.enableShowAlways', 'Immer anzeigen (Show Always)')}
          </ListItemText>
        </MenuItem>
      )}

      <Divider sx={{ my: 0.5 }} />

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
