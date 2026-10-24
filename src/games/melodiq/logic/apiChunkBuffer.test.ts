import { describe, expect, it } from 'vitest';
import { ApiChunkBuffer } from './apiChunkBuffer';

describe('ApiChunkBuffer', () => {
  it('reassembles out-of-order chunks', () => {
    const buf = new ApiChunkBuffer();
    expect(buf.add('r1', 1, 2, '":1}')).toEqual({ status: 'pending' });
    expect(buf.add('r1', 0, 2, '{"a')).toEqual({ status: 'complete', payload: { a: 1 } });
  });

  it('keeps requests separate and forgets completed ones', () => {
    const buf = new ApiChunkBuffer();
    expect(buf.add('a', 0, 2, '[1')).toEqual({ status: 'pending' });
    expect(buf.add('b', 0, 1, '"x"')).toEqual({ status: 'complete', payload: 'x' });
    expect(buf.add('a', 1, 2, ']')).toEqual({ status: 'complete', payload: [1] });
    expect(buf.add('b', 0, 2, '1')).toEqual({ status: 'pending' });
  });

  it('reports invalid JSON', () => {
    expect(new ApiChunkBuffer().add('r', 0, 1, '{oops')).toEqual({ status: 'error' });
  });
});
