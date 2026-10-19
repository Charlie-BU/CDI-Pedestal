import { describe, expect, it } from 'vitest';
import { pixelContentBounds } from '@/components/User/jelly/content-bounds';
describe('avatar visible bounds', () => {
 it('excludes asymmetric transparent padding and includes the final pixel', () => {
  const data = new Uint8ClampedArray(8 * 8 * 4);
  data[(3 * 8 + 4) * 4 + 3] = 255;
  data[(6 * 8 + 7) * 4 + 3] = 255;
  expect(pixelContentBounds(data, 8, 8)).toEqual({ left: 4, top: 3, right: 8, bottom: 7 });
 });
 it('does not infer a visible center for a transparent frame', () => {
  expect(pixelContentBounds(new Uint8ClampedArray(16), 2, 2)).toBeNull();
 });
});
