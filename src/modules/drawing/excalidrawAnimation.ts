// Pure helpers for the stroke-by-stroke replay in ExcalidrawViewer.

export interface DrawingElement {
  id?: string;
  type?: string;
  isDeleted?: boolean;
  points?: [number, number][];
  [key: string]: unknown;
}

export interface AnimationEntry {
  element: DrawingElement;
  segments: number;
  start: number;
  end: number;
}

export interface AnimationPlan {
  entries: AnimationEntry[];
  totalSegments: number;
}

export const buildAnimationPlan = (elements: DrawingElement[]): AnimationPlan => {
  let cumulative = 0;
  const entries: AnimationEntry[] = elements.map((element) => {
    const pointsCount = Array.isArray(element.points) ? Math.max(1, element.points.length - 1) : 1;
    const start = cumulative;
    cumulative += pointsCount;
    return {
      element,
      segments: pointsCount,
      start,
      end: cumulative,
    };
  });
  return { entries, totalSegments: cumulative };
};

export const buildElementsForProgress = (plan: AnimationPlan, progress: number) => {
  const elements: DrawingElement[] = [];
  for (const entry of plan.entries) {
    if (progress >= entry.end) {
      elements.push(entry.element);
      continue;
    }
    if (progress <= entry.start) {
      break;
    }
    const consumed = Math.max(0, progress - entry.start);
    if (entry.element.type === 'freedraw' && Array.isArray(entry.element.points)) {
      const whole = Math.floor(consumed);
      const points = entry.element.points.slice(0, Math.max(2, whole + 1)) as [number, number][];
      elements.push({
        ...entry.element,
        points,
      });
    } else {
      elements.push(entry.element);
    }
  }
  return elements;
};

export const cleanViewerAppState = (
  appState?: Record<string, unknown>,
): Record<string, unknown> => {
  if (!appState || typeof appState !== 'object') {
    return {
      viewModeEnabled: true,
      zenModeEnabled: true,
      selectedElementIds: {},
      selectedGroupIds: {},
      editingElement: null,
      draggingElement: null,
      selectedLinearElement: null,
      editingLinearElement: null,
      selectionElement: null,
    };
  }
  const cloned = { ...appState };
  delete cloned.scrollX;
  delete cloned.scrollY;
  delete cloned.zoom;
  delete cloned.width;
  delete cloned.height;
  delete cloned.offsetLeft;
  delete cloned.offsetTop;
  return {
    ...cloned,
    viewModeEnabled: true,
    zenModeEnabled: true,
    selectedElementIds: {},
    selectedGroupIds: {},
    editingElement: null,
    draggingElement: null,
    selectedLinearElement: null,
    editingLinearElement: null,
    selectionElement: null,
  };
};
