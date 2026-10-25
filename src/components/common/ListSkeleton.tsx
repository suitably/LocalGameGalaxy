import React from 'react';
import { Box } from '@mui/material';

export interface ListSkeletonProps {
  /** Number of placeholder rows. */
  rows?: number;
  /** Row height in px. */
  rowHeight?: number;
}

/** Loading placeholder for lists: raised blocks, no shimmer (DESIGN.md §6). */
export const ListSkeleton: React.FC<ListSkeletonProps> = ({ rows = 3, rowHeight = 48 }) => (
  <Box
    role="status"
    aria-busy="true"
    sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}
  >
    {Array.from({ length: rows }, (_, i) => (
      <Box
        key={i}
        data-testid="list-skeleton-row"
        sx={{ height: rowHeight, borderRadius: 1, bgcolor: 'action.hover' }}
      />
    ))}
  </Box>
);
