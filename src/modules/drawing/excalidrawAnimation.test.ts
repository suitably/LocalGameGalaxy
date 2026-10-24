import { describe, expect, it } from 'vitest';
import {
  buildAnimationPlan,
  buildElementsForProgress,
  cleanViewerAppState,
} from './excalidrawAnimation';

const stroke = (id: string, points: [number, number][]) => ({ id, type: 'freedraw', points });

describe('excalidrawAnimation', () => {
  const plan = buildAnimationPlan([
    stroke('a', [
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 3],
    ]),
    { id: 'b', type: 'rectangle' },
  ]);

  it('counts one segment per point gap and at least one per element', () => {
    expect(plan.entries.map((e) => e.segments)).toEqual([3, 1]);
    expect(plan.totalSegments).toBe(4);
  });

  it('reveals freedraw strokes progressively and stops at untouched elements', () => {
    expect(buildElementsForProgress(plan, 0)).toEqual([]);
    const half = buildElementsForProgress(plan, 1.5);
    expect(half).toHaveLength(1);
    expect(half[0].points).toHaveLength(2);
    expect(buildElementsForProgress(plan, 4)).toHaveLength(2);
  });

  it('forces view mode and drops the viewport from the app state', () => {
    const cleaned = cleanViewerAppState({ scrollX: 5, zoom: 2, theme: 'light' });
    expect(cleaned).toMatchObject({ viewModeEnabled: true, zenModeEnabled: true, theme: 'light' });
    expect(cleaned).not.toHaveProperty('scrollX');
    expect(cleaned).not.toHaveProperty('zoom');
  });
});
