/** Synthetic preset matching the public Desktop export format. */
export const jellyConfigFixture = {
 type: 'airjelly.floating-avatar-presets', schemaVersion: 1, exportedAt: '2026-09-01T08:39:26.626Z',
 presets: [{ id: 'sample-preset', appearance: { variant: 'pixel', pixel: {
  bell: { shape: 'blob', width: 47, topWidth: 29, height: 43, roundness: 4, squash: 1, color: '#c7a2ff' },
  tentacles: { count: 4, segments: 5, beadSize: 2, gap: 6, spread: 31, gravity: 0.28, friction: 0.9, tension: 0.3, wind: 0.18, curl: 0.3, mouseForce: 1.8, color: '#a98cff' },
  eyeBgColor: '#2c2640', scale: 0.9, expression: 'excited', customBell: null, customFaces: [], activeCustomFaceId: null,
 } }, activeCustomFaceId: null as string | null, savedAt: 1788251955673 }], customFaces: [] as {id: string; canvas: {cols:number;rows:number;palette:string[];pixels:number[]}}[],
};
