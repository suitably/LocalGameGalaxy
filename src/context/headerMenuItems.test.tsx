import { describe, it, expect, vi } from 'vitest';
import { commitMenuItems, type MenuItem } from './headerMenuItems';

const StarIcon = (props: { color?: string; status?: object }) => <svg data-color={props.color} />;
const HeartIcon = () => <svg />;

/** Mimics the provider: a ref for the latest items plus a state cell updated via the updater. */
const createStore = () => {
  const latest = { current: [] as MenuItem[] };
  let state: MenuItem[] = [];
  return {
    set: (items: MenuItem[]) => {
      state = commitMenuItems(latest, items)(state);
      return state;
    },
    get: () => state,
  };
};

describe('commitMenuItems', () => {
  it('runs the latest action when a new list has the same labels', () => {
    const store = createStore();
    const first = vi.fn();
    const second = vi.fn();
    store.set([{ label: 'New game', action: first }]);
    store.set([{ label: 'New game', action: second }]);
    store.get()[0]!.action();
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });

  it('keeps the same state array for an identical list (no re-render, no loop)', () => {
    const store = createStore();
    const before = store.set([
      { label: 'A', icon: <StarIcon color="primary" />, action: () => {}, showAlways: true },
      { label: 'B', action: () => {}, disabled: true },
    ]);
    const after = store.set([
      { label: 'A', icon: <StarIcon color="primary" />, action: () => {}, showAlways: true },
      { label: 'B', action: () => {}, disabled: true },
    ]);
    expect(after).toBe(before);
  });

  it('ignores non-primitive icon props such as fresh objects', () => {
    const store = createStore();
    const before = store.set([
      { label: 'A', icon: <StarIcon status={{ kind: 'done' }} />, action: () => {} },
    ]);
    const after = store.set([
      { label: 'A', icon: <StarIcon status={{ kind: 'done' }} />, action: () => {} },
    ]);
    expect(after).toBe(before);
  });

  it('updates when only the icon changes', () => {
    const store = createStore();
    const before = store.set([{ label: 'Dice', icon: <StarIcon />, action: () => {} }]);
    const swapped = store.set([{ label: 'Dice', icon: <HeartIcon />, action: () => {} }]);
    expect(swapped).not.toBe(before);
    const recoloured = store.set([
      { label: 'Dice', icon: <HeartIcon key="x" />, action: () => {} },
    ]);
    expect(recoloured).not.toBe(swapped);
    const props = store.set([
      { label: 'Dice', icon: <StarIcon color="secondary" />, action: () => {} },
    ]);
    const propsChanged = store.set([
      { label: 'Dice', icon: <StarIcon color="primary" />, action: () => {} },
    ]);
    expect(propsChanged).not.toBe(props);
  });

  it('updates when labels, disabled or length change', () => {
    const store = createStore();
    const a = store.set([{ label: 'A', action: () => {} }]);
    const b = store.set([{ label: 'A', action: () => {}, disabled: true }]);
    expect(b).not.toBe(a);
    const c = store.set([{ label: 'B', action: () => {}, disabled: true }]);
    expect(c).not.toBe(b);
    const d = store.set([]);
    expect(d).toHaveLength(0);
  });

  it('a cleared list makes old rendered actions no-ops', () => {
    const store = createStore();
    const action = vi.fn();
    const rendered = store.set([{ label: 'A', action }]);
    store.set([]);
    rendered[0]!.action();
    expect(action).not.toHaveBeenCalled();
  });
});
