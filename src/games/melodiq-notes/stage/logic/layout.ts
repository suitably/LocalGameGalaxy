export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const GAP = 3;

/** Splits the stage into one area per player: side by side in landscape, stacked in portrait, 2×2 for four. */
export function panelRects(count: number, width: number, height: number): Rect[] {
  const landscape = width >= height * 1.15;
  let cells: [number, number, number, number][];
  if (count <= 1) cells = [[0, 0, 1, 1]];
  else if (count === 2)
    cells = landscape
      ? [
          [0, 0, 0.5, 1],
          [0.5, 0, 0.5, 1],
        ]
      : [
          [0, 0, 1, 0.5],
          [0, 0.5, 1, 0.5],
        ];
  else if (count === 3)
    cells =
      width >= height
        ? [
            [0, 0, 1 / 3, 1],
            [1 / 3, 0, 1 / 3, 1],
            [2 / 3, 0, 1 / 3, 1],
          ]
        : [
            [0, 0, 1, 1 / 3],
            [0, 1 / 3, 1, 1 / 3],
            [0, 2 / 3, 1, 1 / 3],
          ];
  else
    cells = [
      [0, 0, 0.5, 0.5],
      [0.5, 0, 0.5, 0.5],
      [0, 0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5, 0.5],
    ];
  const split = count > 1 ? GAP / 2 : 0;
  return cells.slice(0, Math.max(1, count)).map(([x, y, w, h]) => ({
    x: x * width + (x > 0 ? split : 0),
    y: y * height + (y > 0 ? split : 0),
    w: w * width - split,
    h: h * height - split,
  }));
}

/** True when several players share a portrait screen and turning the device would help. */
export const shouldSuggestLandscape = (count: number, width: number, height: number) =>
  count > 1 && height > width * 1.1;
