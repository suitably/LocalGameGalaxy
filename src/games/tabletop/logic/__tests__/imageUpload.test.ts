import { describe, it, expect } from 'vitest';
import { fitWithin } from '../imageUpload';

describe('fitWithin (#449)', () => {
  it('scales the longer edge down to the limit and keeps the ratio', () => {
    expect(fitWithin(2048, 1024, 512)).toEqual({ width: 512, height: 256 });
    expect(fitWithin(300, 1200, 600)).toEqual({ width: 150, height: 600 });
  });

  it('never upscales and handles empty images', () => {
    expect(fitWithin(100, 50, 512)).toEqual({ width: 100, height: 50 });
    expect(fitWithin(0, 50)).toEqual({ width: 0, height: 0 });
  });
});
