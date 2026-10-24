/**
 * Hand Dock Strip for Tabletop Local Mode [ID: GAME-TABLETOP-HAND-DOCK]
 */
import React, { useState, useMemo } from 'react';
import { alpha, Box, Typography, Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { TabletopGameState, TabletopAction } from '../../logic/tabletopReducer';
import type { CardWidget, SeatWidget } from '../../logic/types';
import { groupHandCards } from '../../logic/handLayout';
import { getSeatWidgets, getPlayerSupplyPieces } from '../../logic/seatLogic';
import { useDockDragDrop } from '../../hooks/useDockDragDrop';
import { DockDragOverlay } from './DockDragOverlay';
import { HandCardItem, CARD_W, CARD_H } from './HandCardItem';
import { SupplyPieceItem } from './SupplyPieceItem';
import { findPlayerHandHolder } from '../../logic/boardFilter';

interface HandDockStripProps {
  state: TabletopGameState;
  dispatch: React.Dispatch<TabletopAction>;
}

export const HandDockStrip: React.FC<HandDockStripProps> = ({ state, dispatch }) => {
  const { t } = useTranslation();
  const [dockTab, setDockTab] = useState<'cards' | 'supplies'>('cards');

  const { draggingItem, pointerPos, grabOffset, boardScale, startCardDrag, startPieceDrag } =
    useDockDragDrop({
      tableWidth: state.game.table.width,
      tableHeight: state.game.table.height,
      dispatch,
    });

  const seats = useMemo(() => getSeatWidgets(state.game.widgets), [state.game.widgets]);
  const activeSeat = useMemo(() => {
    if (state.currentSeatId && state.game.widgets[state.currentSeatId]) {
      return state.game.widgets[state.currentSeatId] as SeatWidget;
    }
    return seats[0];
  }, [seats, state.currentSeatId, state.game.widgets]);

  const handHolder = useMemo(
    () => findPlayerHandHolder(state.game.widgets, activeSeat?.index || undefined),
    [activeSeat, state.game.widgets],
  );

  const supplyPieces = useMemo(() => {
    if (!activeSeat) return {};
    return getPlayerSupplyPieces(state.game.widgets, activeSeat.index || 1);
  }, [activeSeat, state.game.widgets]);

  const totalSupplyCount = Object.values(supplyPieces).reduce((acc, p) => acc + p.length, 0);
  const hasSupplyPieces = totalSupplyCount > 0;

  const handCards = useMemo(() => {
    if (!handHolder) return [];
    return handHolder.childIds
      .map((id) => state.game.widgets[id])
      .filter((w): w is CardWidget => Boolean(w && w.type === 'card'));
  }, [handHolder, state.game.widgets]);

  const groups = useMemo(() => groupHandCards(handCards), [handCards]);

  if (!handHolder && !hasSupplyPieces) return null;
  const showSupplies = dockTab === 'supplies' && hasSupplyPieces;

  return (
    <Box
      sx={{
        width: '100%',
        height: 156,
        flexShrink: 0,
        bgcolor: 'background.default',
        borderTop: (theme) => `1px solid ${alpha(theme.palette.text.primary, 0.12)}`,
        display: 'flex',
        flexDirection: 'column',
        px: 2,
        py: 1,
        boxSizing: 'border-box',
        userSelect: 'none',
      }}
    >
      <DockDragOverlay
        item={draggingItem}
        pointerPos={pointerPos}
        grabOffset={grabOffset}
        scale={boardScale}
      />

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
        {hasSupplyPieces ? (
          <Box display="flex" gap={1}>
            <Chip
              size="small"
              clickable
              color={!showSupplies ? 'primary' : 'default'}
              onClick={() => setDockTab('cards')}
              label={`${t('games.tabletop.cards', 'Karten')} (${handCards.length})`}
              sx={{ height: 22, fontSize: '0.72rem', fontWeight: 700 }}
            />
            <Chip
              size="small"
              clickable
              color={showSupplies ? 'primary' : 'default'}
              onClick={() => setDockTab('supplies')}
              label={`${t('games.tabletop.reserve', 'Vorrat')} (${totalSupplyCount})`}
              sx={{ height: 22, fontSize: '0.72rem', fontWeight: 700 }}
            />
          </Box>
        ) : (
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 0.5 }}
          >
            {t('games.tabletop.yourHand', 'Deine Hand')} ({handCards.length})
          </Typography>
        )}
      </Box>

      {showSupplies ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            overflowX: 'auto',
            flex: 1,
            py: 0.5,
            px: 0.5,
            '&::-webkit-scrollbar': { height: 6 },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: (theme) => alpha(theme.palette.text.primary, 0.2),
              borderRadius: 3,
            },
          }}
        >
          {Object.entries(supplyPieces).map(([groupName, pieces]) => (
            <SupplyPieceItem
              key={groupName}
              groupName={groupName}
              count={pieces.length}
              samplePiece={pieces[0]}
              onPointerDown={(e) => startPieceDrag(e, pieces[0], groupName)}
            />
          ))}
        </Box>
      ) : handCards.length === 0 ? (
        <Box display="flex" alignItems="center" justifyContent="center" flex={1}>
          <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
            {t('games.tabletop.handEmpty', 'Keine Karten auf der Hand')}
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            overflowX: 'auto',
            flex: 1,
            py: 0.5,
            px: 0.5,
            '&::-webkit-scrollbar': { height: 6 },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: (theme) => alpha(theme.palette.text.primary, 0.2),
              borderRadius: 3,
            },
          }}
        >
          {groups.map((group) => {
            if (group.isAction) {
              return (
                <Box key={group.key} sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  {group.cards.map((c, idx) => (
                    <Box
                      key={c.id}
                      sx={{
                        position: 'relative',
                        ml: idx > 0 ? '-42px' : 0,
                        zIndex: idx + 2,
                        transition: 'z-index 0s, margin 0.15s ease',
                        '&:hover': { zIndex: 50 },
                      }}
                    >
                      <HandCardItem
                        card={c}
                        onReturnToDeck={(cId, dId) =>
                          dispatch({
                            type: 'RETURN_CARD_TO_DECK',
                            payload: { cardId: cId, deckId: dId },
                          })
                        }
                        onPointerDown={(e) =>
                          startCardDrag(e, c, () =>
                            dispatch({ type: 'FLIP_CARD', payload: { cardId: c.id } }),
                          )
                        }
                      />
                    </Box>
                  ))}
                </Box>
              );
            }

            const topCard = group.cards[group.cards.length - 1];
            const count = group.cards.length;
            return (
              <Box key={group.key} sx={{ position: 'relative', flexShrink: 0 }}>
                {count > 1 && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -3,
                      left: 3,
                      width: CARD_W,
                      height: CARD_H,
                      borderRadius: 2,
                      bgcolor: (theme) => alpha(theme.palette.text.primary, 0.12),
                      border: (theme) => `1px solid ${alpha(theme.palette.text.primary, 0.2)}`,
                      zIndex: 1,
                      pointerEvents: 'none',
                    }}
                  />
                )}
                <Box sx={{ position: 'relative', zIndex: 2 }}>
                  <HandCardItem
                    card={topCard}
                    count={count}
                    onReturnToDeck={(cId, dId) =>
                      dispatch({
                        type: 'RETURN_CARD_TO_DECK',
                        payload: { cardId: cId, deckId: dId },
                      })
                    }
                    onPointerDown={(e) =>
                      startCardDrag(e, topCard, () =>
                        dispatch({ type: 'FLIP_CARD', payload: { cardId: topCard.id } }),
                      )
                    }
                  />
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
};
