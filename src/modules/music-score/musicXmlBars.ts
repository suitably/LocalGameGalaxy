import { kid, kids, num, text } from './xmlDom';

const MAX_PLAYED_BARS = 20000;

export interface BarInfo {
  len: number;
  forward: boolean;
  backward: boolean;
  times: number;
  endings: number[] | null;
  tempo: number | null;
}

/** Bar lengths, repeats, endings and tempo marks, read from the first part. */
export function readBars(firstPart: Element, allParts: Element[], root: Element): BarInfo[] {
  const bars: BarInfo[] = [];
  let beats = 4;
  let beatType = 4;
  let div = 1;
  let ending: number[] | null = null;
  for (const m of kids(firstPart, 'measure')) {
    const bar: BarInfo = {
      len: 0,
      forward: false,
      backward: false,
      times: 2,
      endings: null,
      tempo: null,
    };
    let pos = 0;
    let maxPos = 0;
    let last = 0;
    let endingStops = false;
    for (const c of kids(m)) {
      if (c.tagName === 'attributes') {
        div = num(c, 'divisions', div) || div;
        const time = c.getElementsByTagName('time')[0];
        if (time && text(time, 'beats')) {
          beats = parseInt(text(time, 'beats') || '4', 10) || beats;
          beatType = num(time, 'beat-type', beatType) || beatType;
        }
      } else if (c.tagName === 'note') {
        if (kid(c, 'grace')) continue;
        const d = num(c, 'duration');
        if (kid(c, 'chord')) {
          maxPos = Math.max(maxPos, last + d);
          continue;
        }
        last = pos;
        pos += d;
        maxPos = Math.max(maxPos, pos);
      } else if (c.tagName === 'backup') pos -= num(c, 'duration');
      else if (c.tagName === 'forward') {
        pos += num(c, 'duration');
        maxPos = Math.max(maxPos, pos);
      } else if (c.tagName === 'barline') {
        const rep = c.getElementsByTagName('repeat')[0];
        if (rep?.getAttribute('direction') === 'forward') bar.forward = true;
        if (rep?.getAttribute('direction') === 'backward') {
          bar.backward = true;
          bar.times = Number(rep.getAttribute('times')) || 2;
        }
        const end = c.getElementsByTagName('ending')[0];
        const type = end?.getAttribute('type');
        if (type === 'start')
          ending = (end?.getAttribute('number') || '1')
            .split(/[,\s]+/)
            .map(Number)
            .filter(Boolean);
        if (type === 'stop' || type === 'discontinue') endingStops = true;
      }
    }
    bar.endings = ending;
    if (endingStops) ending = null;
    const declared = (beats * 4) / beatType;
    bar.len = m.getAttribute('implicit') === 'yes' && maxPos > 0 ? maxPos / div : declared;
    bars.push(bar);
  }
  for (const pe of allParts) {
    kids(pe, 'measure').forEach((m, i) => {
      if (i >= bars.length || bars[i].tempo) return;
      for (const s of Array.from(m.getElementsByTagName('sound'))) {
        const t = Number(s.getAttribute('tempo'));
        if (t > 0) {
          bars[i].tempo = t;
          break;
        }
      }
    });
  }
  if (bars.length && !bars.some((b) => b.tempo)) {
    const pm = num(root, 'per-minute');
    if (pm > 0) bars[0].tempo = pm;
  }
  return bars;
}

/** Order in which written bars are played, with repeats and 1st/2nd endings written out. */
export function playOrder(
  bars: Pick<BarInfo, 'forward' | 'backward' | 'times' | 'endings'>[],
): number[] {
  const order: number[] = [];
  const counts = new Map<number, number>();
  let i = 0;
  let repeatStart = 0;
  let pass = 1;
  let jumped = false;
  while (i < bars.length && order.length < MAX_PLAYED_BARS) {
    const bar = bars[i];
    if (bar.forward && !jumped) {
      repeatStart = i;
      pass = 1;
    }
    jumped = false;
    if (bar.endings && !bar.endings.includes(pass)) {
      i++;
      continue;
    }
    order.push(i);
    if (bar.backward) {
      const c = counts.get(i) ?? 1;
      if (c < bar.times) {
        counts.set(i, c + 1);
        pass = c + 1;
        i = repeatStart;
        jumped = true;
        continue;
      }
      counts.delete(i);
      pass = 1;
      repeatStart = i + 1;
    }
    i++;
  }
  return order;
}
