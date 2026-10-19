/** 定义个人浮动头像的外观、像素画布、预设及窗口尺寸计算。 */

export type FloatingAvatarVariant = 'classic' | 'pixel'
export type FloatingAvatarDockSide = 'none' | 'left' | 'right'

/** Resting face the bell draws when idle; also the eye/mouth shape vocabulary. Lives here
 *  (not in the renderer) so it can be persisted as part of the avatar appearance. */
export type PixelJellyExpression =
  | 'neutral'
  | 'curious'
  | 'focused'
  | 'excited'
  | 'stuck'
  | 'proud'
  | 'sleepy'
  | 'calm'
  | 'surprised'

export const PIXEL_JELLY_EXPRESSIONS = [
  'neutral',
  'curious',
  'focused',
  'excited',
  'stuck',
  'proud',
  'sleepy',
  'calm',
  'surprised',
] as const satisfies readonly PixelJellyExpression[]

/** Bell silhouette family. `width`/`topWidth`/`height`/`roundness`/`squash` still tune the
 *  shape within a family; the family decides the overall outline curve. */
export type BellShape = 'bell' | 'dome' | 'blob' | 'lantern' | 'bulb'

export const PIXEL_JELLY_BELL_SHAPES = [
  'bell',
  'dome',
  'blob',
  'lantern',
  'bulb',
] as const satisfies readonly BellShape[]

export interface PixelJellyfishBellSettings {
  shape: BellShape
  width: number
  topWidth: number
  height: number
  /** Corner softness in whole pixel cells (1–4). Used directly as the bell's top-rounding
   *  radius — NOT divided by the render pixel size. */
  roundness: number
  /** Skirt inset at the bell bottom, in whole pixel cells (0–6). Used directly. */
  squash: number
  color: string
}

export interface PixelJellyfishTentacleSettings {
  count: number
  segments: number
  /** Bead edge length in whole pixel cells (1–3). Used directly as the rendered bead size —
   *  NOT divided by the render pixel size. */
  beadSize: number
  gap: number
  spread: number
  gravity: number
  friction: number
  tension: number
  wind: number
  curl: number
  mouseForce: number
  color: string
}

/** A hand-drawn pixel canvas, used for both the bell BODY ({@link PixelJellyfishSettings.customBell})
 *  and saved FACE overlays ({@link PixelDrawnFace}). Body canvases define a silhouette; face
 *  canvases use their own expression grid and are aligned to the current bell at render time.
 *  `pixels` is row-major, length `cols * rows`, each entry 0 (transparent) or a 1-based index
 *  into `palette`. */
export interface PixelBellCanvas {
  cols: number
  rows: number
  palette: string[]
  pixels: number[]
}

/** A saved hand-drawn face (resting expression). Rendered as a transparent overlay, selectable in
 *  the Face tab alongside the preset expressions. */
export interface PixelDrawnFace {
  id: string
  canvas: PixelBellCanvas
}

export interface PixelJellyfishSettings {
  bell: PixelJellyfishBellSettings
  tentacles: PixelJellyfishTentacleSettings
  eyeBgColor: string
  /** Overall size multiplier. Scales the CSS-px geometry AND the render pixel cell together,
   *  so the avatar grows/shrinks while keeping the same pixel layout. Default 1. */
  scale: number
  /** Resting face shown when the avatar is idle (used when no hand-drawn face is active). */
  expression: PixelJellyExpression
  /** Optional hand-drawn bell body; `null` uses the procedural bell. */
  customBell: PixelBellCanvas | null
  /** Saved hand-drawn faces (resting expressions) the user can switch between. */
  customFaces: PixelDrawnFace[]
  /** Which saved face is active; `null` uses the preset {@link expression}. */
  activeCustomFaceId: string | null
}

export interface FloatingAvatarAppearance {
  variant: FloatingAvatarVariant
  pixel: PixelJellyfishSettings
}

/** A user-saved appearance shortcut. The selected hand-drawn face stays separate so every preset
 * can reuse the owner's current face library. */
export interface FloatingAvatarAppearancePreset {
  id: string
  appearance: FloatingAvatarAppearance
  activeCustomFaceId: string | null
  savedAt: number
}

export interface FloatingAvatarWindowMetrics {
  buttonSize: number
  buttonRightInset: number
  buttonTopInset: number
  buttonBottomInset: number
  visualWidth: number
  visualHeight: number
  dockHeight: number
  windowWidth: number
  windowHeight: number
}

export type PixelJellyfishBellNumberKey = Exclude<keyof PixelJellyfishBellSettings, 'color'>
export type PixelJellyfishTentacleNumberKey = Exclude<keyof PixelJellyfishTentacleSettings, 'color'>

export interface PixelJellyfishSliderDefinition<Key extends string> {
  key: Key
  labelKey: string
  min: number
  max: number
  step: number
}

export const PIXEL_JELLYFISH_BELL_SLIDERS = [
  { key: 'width', labelKey: 'bellWidth', min: 24, max: 86, step: 1 },
  { key: 'topWidth', labelKey: 'topWidth', min: 12, max: 86, step: 1 },
  { key: 'height', labelKey: 'bellHeight', min: 12, max: 62, step: 1 },
  { key: 'roundness', labelKey: 'roundness', min: 1, max: 4, step: 1 },
  { key: 'squash', labelKey: 'squash', min: 0, max: 6, step: 1 },
] as const satisfies readonly PixelJellyfishSliderDefinition<PixelJellyfishBellNumberKey>[]

export const PIXEL_JELLYFISH_TENTACLE_SLIDERS = [
  { key: 'count', labelKey: 'tentacleCount', min: 3, max: 12, step: 1 },
  { key: 'segments', labelKey: 'tentacleLength', min: 4, max: 18, step: 1 },
  { key: 'beadSize', labelKey: 'beadSize', min: 1, max: 3, step: 1 },
  { key: 'gap', labelKey: 'beadGap', min: 2, max: 8, step: 0.5 },
  { key: 'spread', labelKey: 'spread', min: 18, max: 72, step: 1 },
  { key: 'gravity', labelKey: 'gravity', min: 0, max: 0.3, step: 0.01 },
  { key: 'friction', labelKey: 'friction', min: 0.88, max: 0.98, step: 0.001 },
  { key: 'tension', labelKey: 'tension', min: 0.25, max: 1, step: 0.01 },
  { key: 'wind', labelKey: 'wind', min: 0, max: 0.25, step: 0.01 },
  { key: 'curl', labelKey: 'curl', min: 0, max: 0.3, step: 0.01 },
  { key: 'mouseForce', labelKey: 'mouseForce', min: 0, max: 3, step: 0.1 },
] as const satisfies readonly PixelJellyfishSliderDefinition<PixelJellyfishTentacleNumberKey>[]

/** Overall-size multiplier bounds. Scales geometry + render cell together (see
 *  {@link scalePixelJellyGeometry} / {@link getEffectivePixelSize}). */
export const PIXEL_JELLYFISH_SCALE_RANGE = { min: 0.7, max: 1.6, step: 0.1 } as const

/** Bounds for the hand-drawn bell grid (cells per side). */
export const PIXEL_BELL_CANVAS_MIN_SIZE = 6
export const PIXEL_BELL_CANVAS_MAX_SIZE = 40
export const PIXEL_BELL_CANVAS_DEFAULT_MARGIN = 2
export const PIXEL_BELL_CANVAS_MARGIN_OPTIONS = [0, 2, 4, 6, 8] as const
/** Max distinct brush colors a hand-drawn bell can carry. */
export const PIXEL_BELL_PALETTE_MAX = 12
/** Max saved hand-drawn faces. */
export const PIXEL_DRAWN_FACE_MAX = 8

export const PIXEL_JELLYFISH_RENDER_PIXEL_SIZE = 4
export const FLOATING_AVATAR_BUTTON_SIZE = 80
export const FLOATING_AVATAR_CLASSIC_VISUAL_SIZE = 64
export const FLOATING_AVATAR_PIXEL_MIN_VISUAL_SIZE = 96
/** Sanity ceiling so a pathological tentacle config can't spawn a screen-filling window. */
export const FLOATING_AVATAR_PIXEL_MAX_VISUAL_SIZE = 520
export const FLOATING_AVATAR_WINDOW_MIN_SIZE = 120
export const FLOATING_AVATAR_WINDOW_EDGE_INSET = 12
export const FLOATING_AVATAR_DOCK_GAP = 4

export const DEFAULT_PIXEL_JELLYFISH_SETTINGS: PixelJellyfishSettings = {
  bell: {
    shape: 'bell',
    width: 51,
    topWidth: 36,
    height: 33,
    roundness: 4,
    squash: 0,
    color: '#8ae2ff',
  },
  tentacles: {
    count: 4,
    segments: 5,
    beadSize: 1,
    gap: 6,
    spread: 39,
    gravity: 0.22,
    friction: 0.94,
    tension: 0.45,
    wind: 0.07,
    curl: 0.23,
    mouseForce: 0.8,
    color: '#8ae2ff',
  },
  eyeBgColor: '#303030',
  scale: 1,
  expression: 'neutral',
  customBell: null,
  customFaces: [],
  activeCustomFaceId: null,
}

export const DEFAULT_FLOATING_AVATAR_APPEARANCE: FloatingAvatarAppearance = {
  variant: 'pixel',
  pixel: DEFAULT_PIXEL_JELLYFISH_SETTINGS,
}

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function odd(value: number): number {
  const rounded = Math.round(value)
  return rounded % 2 === 0 ? rounded + 1 : rounded
}

function precisionForStep(step: number): number {
  const [, fraction = ''] = String(step).split('.')
  return fraction.length
}

function normalizeNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
  step: number
): number {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  const snapped = Math.round(numeric / step) * step
  return Number(clamp(snapped, min, max).toFixed(precisionForStep(step)))
}

function normalizeColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && HEX_COLOR_RE.test(value) ? value.toLowerCase() : fallback
}

function normalizeEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback
}

/** Validate a hand-drawn bell. Returns null (→ procedural bell) when absent, malformed, or blank
 *  (every cell transparent), so a bad/empty drawing can never produce an invisible body. Legacy
 *  single-color masks (no palette) are migrated to a one-color palette using `fallbackColor`. */
function normalizePixelBellCanvas(value: unknown, fallbackColor: string): PixelBellCanvas | null {
  if (!isRecord(value)) return null
  const cols = Math.round(Number(value.cols))
  const rows = Math.round(Number(value.rows))
  if (
    !Number.isInteger(cols) ||
    !Number.isInteger(rows) ||
    cols < PIXEL_BELL_CANVAS_MIN_SIZE ||
    rows < PIXEL_BELL_CANVAS_MIN_SIZE ||
    cols > PIXEL_BELL_CANVAS_MAX_SIZE ||
    rows > PIXEL_BELL_CANVAS_MAX_SIZE
  ) {
    return null
  }
  if (!Array.isArray(value.pixels) || value.pixels.length !== cols * rows) return null

  const rawPalette = Array.isArray(value.palette) ? value.palette : []
  const palette = rawPalette
    .filter((color): color is string => typeof color === 'string' && HEX_COLOR_RE.test(color))
    .map((color) => color.toLowerCase())
    .slice(0, PIXEL_BELL_PALETTE_MAX)
  if (palette.length === 0) palette.push(normalizeColor(fallbackColor, '#8ae2ff'))

  let hasBody = false
  const pixels = value.pixels.map((cell) => {
    const index = Math.round(Number(cell))
    // Legacy `true`/`1` masks map to the first palette color; out-of-range indices drop to empty.
    const resolved = Number.isInteger(index) && index >= 1 && index <= palette.length ? index : 0
    if (resolved > 0) hasBody = true
    return resolved
  })
  if (!hasBody) return null

  return { cols, rows, palette, pixels }
}

/** Effective bell footprint in CSS px (pre-scale), matching the renderer's snapped pixel grid.
 *  A hand-drawn bell uses its non-transparent content bounds; transparent edit margin must not
 *  change the rendered avatar geometry. */
export function getEffectiveBellDimensions(settings: PixelJellyfishSettings): {
  width: number
  height: number
} {
  const body = getPixelJellyfishRenderableBellCanvas(settings)
  return {
    width: body.cols * PIXEL_JELLYFISH_RENDER_PIXEL_SIZE,
    height: body.rows * PIXEL_JELLYFISH_RENDER_PIXEL_SIZE,
  }
}

/** Starter brush palette for a fresh hand-drawn bell: body, eye/ink, white, then a few accents. */
export function getDefaultPixelBellPalette(settings: PixelJellyfishSettings): string[] {
  const seeds = [
    settings.bell.color,
    settings.eyeBgColor,
    '#ffffff',
    settings.tentacles.color,
    '#ff8fc7',
    '#ffe08a',
    '#111827',
  ]
  const palette: string[] = []
  for (const seed of seeds) {
    const color = normalizeColor(seed, '#8ae2ff')
    if (!palette.includes(color)) palette.push(color)
  }
  return palette.slice(0, PIXEL_BELL_PALETTE_MAX)
}

export function getPixelBellCanvasContentBounds(canvas: PixelBellCanvas): {
  left: number
  top: number
  width: number
  height: number
} | null {
  let left = canvas.cols
  let top = canvas.rows
  let right = -1
  let bottom = -1

  for (let index = 0; index < canvas.pixels.length; index += 1) {
    const cell = canvas.pixels[index]
    if (cell <= 0 || cell > canvas.palette.length) continue
    const x = index % canvas.cols
    const y = Math.floor(index / canvas.cols)
    left = Math.min(left, x)
    top = Math.min(top, y)
    right = Math.max(right, x)
    bottom = Math.max(bottom, y)
  }

  if (right < left || bottom < top) return null
  return { left, top, width: right - left + 1, height: bottom - top + 1 }
}

export function trimPixelBellCanvasToContent(canvas: PixelBellCanvas): PixelBellCanvas {
  const bounds = getPixelBellCanvasContentBounds(canvas)
  if (!bounds) return canvas
  if (
    bounds.left === 0 &&
    bounds.top === 0 &&
    bounds.width === canvas.cols &&
    bounds.height === canvas.rows
  ) {
    return canvas
  }

  const pixels = new Array<number>(bounds.width * bounds.height).fill(0)
  for (let row = 0; row < bounds.height; row += 1) {
    for (let col = 0; col < bounds.width; col += 1) {
      pixels[row * bounds.width + col] =
        canvas.pixels[(bounds.top + row) * canvas.cols + bounds.left + col] ?? 0
    }
  }

  return { cols: bounds.width, rows: bounds.height, palette: canvas.palette, pixels }
}

export function getPixelJellyfishRenderableBellCanvas(
  settings: PixelJellyfishSettings
): PixelBellCanvas {
  return settings.customBell
    ? trimPixelBellCanvasToContent(settings.customBell)
    : createPixelJellyfishProceduralBellCanvas(settings)
}

function framePixelBellCanvas(
  canvas: PixelBellCanvas,
  cols: number,
  rows: number
): PixelBellCanvas {
  const targetCols = clamp(Math.round(cols), PIXEL_BELL_CANVAS_MIN_SIZE, PIXEL_BELL_CANVAS_MAX_SIZE)
  const targetRows = clamp(Math.round(rows), PIXEL_BELL_CANVAS_MIN_SIZE, PIXEL_BELL_CANVAS_MAX_SIZE)
  if (targetCols === canvas.cols && targetRows === canvas.rows) return canvas

  const pixels = new Array<number>(targetCols * targetRows).fill(0)
  const offsetX = Math.floor((targetCols - canvas.cols) / 2)
  const offsetY = Math.floor((targetRows - canvas.rows) / 2)

  for (let row = 0; row < canvas.rows; row += 1) {
    for (let col = 0; col < canvas.cols; col += 1) {
      const targetX = offsetX + col
      const targetY = offsetY + row
      if (targetX < 0 || targetX >= targetCols || targetY < 0 || targetY >= targetRows) continue
      pixels[targetY * targetCols + targetX] = canvas.pixels[row * canvas.cols + col] ?? 0
    }
  }

  return { cols: targetCols, rows: targetRows, palette: canvas.palette, pixels }
}

export function expandPixelBellCanvasFrame(
  canvas: PixelBellCanvas,
  cols: number,
  rows: number
): PixelBellCanvas {
  return framePixelBellCanvas(canvas, Math.max(canvas.cols, cols), Math.max(canvas.rows, rows))
}

export function getPixelBellCanvasFrameMargin(
  settings: PixelJellyfishSettings,
  canvas: PixelBellCanvas
): number {
  const procedural = createPixelJellyfishProceduralBellCanvas(settings)
  return Math.max(
    0,
    Math.round(Math.max(canvas.cols - procedural.cols, canvas.rows - procedural.rows) / 2)
  )
}

/** Bell grid size in cells for the current settings (custom body → content bounds; else the
 *  procedural bell sliders converted to cells). */
export function getEffectiveBellCellDimensions(settings: PixelJellyfishSettings): {
  cols: number
  rows: number
} {
  const body = getPixelJellyfishRenderableBellCanvas(settings)
  return { cols: body.cols, rows: body.rows }
}

/** Seed a hand-drawn BODY (silhouette only — the face is a separate layer) from the current bell so
 *  the user edits an existing shape rather than a blank grid. The lit cells are a pixel-exact copy
 *  of the live procedural renderer at rest; transparent frame margin only expands the edit area. */
export function createDefaultPixelBellCanvas(
  settings: PixelJellyfishSettings,
  marginCells: number = PIXEL_BELL_CANVAS_DEFAULT_MARGIN
): PixelBellCanvas {
  const procedural = createPixelJellyfishProceduralBellCanvas(settings)
  const body: PixelBellCanvas = {
    ...procedural,
    palette: getDefaultPixelBellPalette(settings),
    pixels: procedural.pixels.map((cell) => (cell > 0 ? 1 : 0)),
  }
  const margin = Math.max(0, Math.round(marginCells))
  return framePixelBellCanvas(body, body.cols + margin * 2, body.rows + margin * 2)
}

// Base bell-row width (in pixel cells, before skirt inset / drag width-boost / odd snapping).
// Shared by the live canvas renderer and settings previews so preview head silhouettes stay exact.
export function getPixelJellyfishBellShapeWidth(
  shape: BellShape,
  row: number,
  activeHeight: number,
  topWidth: number,
  bodyWidth: number,
  corner: number
): number {
  const t = row / Math.max(1, activeHeight - 1) // 0 = top, 1 = bottom
  const topT = clamp(row / Math.max(1, corner), 0, 1)
  const span = bodyWidth - topWidth

  switch (shape) {
    case 'dome':
      return topWidth + span * smoothProgress(Math.sqrt(topT))
    case 'blob':
      return topWidth + span * Math.sin(Math.PI * clamp(t, 0, 1))
    case 'lantern': {
      const open = smoothProgress(clamp(t / 0.16, 0, 1))
      const tuck = 1 - smoothProgress(clamp((t - 0.82) / 0.18, 0, 1)) * 0.32
      return (topWidth + span * open) * tuck
    }
    case 'bulb': {
      const peak = 0.72
      if (t <= peak) return topWidth + span * smoothProgress(t / peak)
      return bodyWidth - span * 0.18 * smoothProgress((t - peak) / (1 - peak))
    }
    case 'bell':
    default:
      return topWidth + span * topT
  }
}

/** Procedural bell canvas matching the live pixel jellyfish renderer at rest. */
export function createPixelJellyfishProceduralBellCanvas(
  settings: PixelJellyfishSettings
): PixelBellCanvas {
  const { bell } = settings
  const bodyWidth = Math.max(5, odd(bell.width / PIXEL_JELLYFISH_RENDER_PIXEL_SIZE))
  const bodyHeight = Math.max(3, Math.round(bell.height / PIXEL_JELLYFISH_RENDER_PIXEL_SIZE))
  const topWidth = clamp(odd(bell.topWidth / PIXEL_JELLYFISH_RENDER_PIXEL_SIZE), 3, bodyWidth)
  const corner = Math.max(1, Math.round(bell.roundness))
  const maxBottomInset = Math.round(bell.squash)
  const palette = [normalizeColor(bell.color, DEFAULT_PIXEL_JELLYFISH_SETTINGS.bell.color)]
  const pixels = new Array<number>(bodyWidth * bodyHeight).fill(0)
  const center = Math.round((bodyWidth - 1) / 2)

  for (let row = 0; row < bodyHeight; row += 1) {
    const lowerT = row / Math.max(1, bodyHeight - 1)
    const shapeWidth = getPixelJellyfishBellShapeWidth(
      bell.shape,
      row,
      bodyHeight,
      topWidth,
      bodyWidth,
      corner
    )
    const bottomInset = lowerT > 0.45 ? Math.round(((lowerT - 0.45) / 0.55) * maxBottomInset) : 0
    const rowWidth = Math.max(3, odd(shapeWidth - bottomInset * 2))
    const left = center - Math.floor(rowWidth / 2)
    const right = center + Math.floor(rowWidth / 2)
    for (let col = left; col <= right; col += 1) {
      if (col >= 0 && col < bodyWidth) pixels[row * bodyWidth + col] = 1
    }
  }

  return { cols: bodyWidth, rows: bodyHeight, palette, pixels }
}

function alignPixelJellyfishHeadToFaceGrid(
  body: PixelBellCanvas,
  cols: number,
  rows: number,
  color: string
): PixelBellCanvas {
  const targetCols = Math.max(1, Math.round(cols))
  const targetRows = Math.max(1, Math.round(rows))
  const pixels = new Array<number>(targetCols * targetRows).fill(0)
  const offsetX = Math.floor(targetCols / 2) - Math.floor(body.cols / 2)
  const offsetY =
    Math.max(2, Math.round(targetRows * 0.54)) - Math.max(2, Math.round(body.rows * 0.54))

  for (let row = 0; row < body.rows; row += 1) {
    for (let col = 0; col < body.cols; col += 1) {
      if (body.pixels[row * body.cols + col] <= 0) continue
      const targetX = offsetX + col
      const targetY = offsetY + row
      if (targetX < 0 || targetX >= targetCols || targetY < 0 || targetY >= targetRows) continue
      pixels[targetY * targetCols + targetX] = 1
    }
  }

  return { cols: targetCols, rows: targetRows, palette: [color], pixels }
}

function pixelCanvasEyeY(rows: number): number {
  return Math.max(2, Math.round(rows * 0.54))
}

function getPixelFaceEditLayout(
  settings: PixelJellyfishSettings,
  faceCanvas: PixelBellCanvas
): {
  body: PixelBellCanvas
  cols: number
  rows: number
  bodyLeft: number
  bodyTop: number
  faceLeft: number
  faceTop: number
} {
  const body = getPixelJellyfishRenderableBellCanvas(settings)
  const bodyEyeY = pixelCanvasEyeY(body.rows)
  const faceEyeY = pixelCanvasEyeY(faceCanvas.rows)
  const eyeY = Math.max(bodyEyeY, faceEyeY)
  const cols = Math.max(body.cols, faceCanvas.cols)
  const rows = Math.max(1, eyeY + Math.max(body.rows - bodyEyeY, faceCanvas.rows - faceEyeY))
  const centerX = Math.floor(cols / 2)

  return {
    body,
    cols,
    rows,
    bodyLeft: centerX - Math.floor(body.cols / 2),
    bodyTop: eyeY - bodyEyeY,
    faceLeft: centerX - Math.floor(faceCanvas.cols / 2),
    faceTop: eyeY - faceEyeY,
  }
}

function placePixelCanvasInGrid(
  canvas: PixelBellCanvas,
  cols: number,
  rows: number,
  left: number,
  top: number,
  palette = canvas.palette
): PixelBellCanvas {
  const pixels = new Array<number>(cols * rows).fill(0)

  for (let row = 0; row < canvas.rows; row += 1) {
    for (let col = 0; col < canvas.cols; col += 1) {
      const cell = canvas.pixels[row * canvas.cols + col]
      if (cell <= 0 || cell > canvas.palette.length) continue
      const targetX = left + col
      const targetY = top + row
      if (targetX < 0 || targetX >= cols || targetY < 0 || targetY >= rows) continue
      pixels[targetY * cols + targetX] = cell
    }
  }

  return { cols, rows, palette, pixels }
}

/** Reference silhouette for face editing. It uses the current live head size, centered and eye-row
 *  aligned to the requested edit grid. */
export function createPixelFaceGuideCanvas(
  settings: PixelJellyfishSettings,
  cols?: number,
  rows?: number
): PixelBellCanvas {
  const color = normalizeColor(settings.bell.color, DEFAULT_PIXEL_JELLYFISH_SETTINGS.bell.color)
  const body = getPixelJellyfishRenderableBellCanvas(settings)
  return alignPixelJellyfishHeadToFaceGrid(body, cols ?? body.cols, rows ?? body.rows, color)
}

/** Build the editable FACE canvas for the current head. The frame grows to fit both today's head
 *  and the saved expression, but existing face pixels are never resampled or squeezed. */
export function createPixelFaceEditCanvas(
  settings: PixelJellyfishSettings,
  canvas: PixelBellCanvas
): PixelBellCanvas {
  const layout = getPixelFaceEditLayout(settings, canvas)
  return placePixelCanvasInGrid(canvas, layout.cols, layout.rows, layout.faceLeft, layout.faceTop)
}

/** Current head silhouette in the exact dynamic grid used by {@link createPixelFaceEditCanvas}. */
export function createPixelFaceEditGuideCanvas(
  settings: PixelJellyfishSettings,
  canvas: PixelBellCanvas
): PixelBellCanvas {
  const color = normalizeColor(settings.bell.color, DEFAULT_PIXEL_JELLYFISH_SETTINGS.bell.color)
  const layout = getPixelFaceEditLayout(settings, canvas)
  const bodyMask: PixelBellCanvas = {
    ...layout.body,
    palette: [color],
    pixels: layout.body.pixels.map((cell) => (cell > 0 ? 1 : 0)),
  }
  return placePixelCanvasInGrid(
    bodyMask,
    layout.cols,
    layout.rows,
    layout.bodyLeft,
    layout.bodyTop,
    [color]
  )
}

/** Seed a hand-drawn FACE: a transparent canvas sized to the current head with two neutral eye dots
 *  in the eye colour, so the user edits a starting expression rather than a blank grid. */
export function createDefaultPixelFaceCanvas(settings: PixelJellyfishSettings): PixelBellCanvas {
  const body = getPixelJellyfishRenderableBellCanvas(settings)
  const cols = body.cols
  const rows = body.rows
  const ink = normalizeColor(settings.eyeBgColor, '#303030')
  const palette = [
    ink,
    '#ffffff',
    '#111827',
    normalizeColor(settings.bell.color, '#8ae2ff'),
  ].filter((color, index, all) => all.indexOf(color) === index)
  const pixels = new Array<number>(cols * rows).fill(0)
  const center = Math.round((cols - 1) / 2)
  const eyeRow = clamp(Math.round(rows * 0.54), 0, rows - 1)
  const eyeOffset = Math.max(2, Math.round(cols * 0.18))
  for (const eyeX of [center - eyeOffset, center + eyeOffset]) {
    if (eyeX >= 0 && eyeX < cols) pixels[eyeRow * cols + eyeX] = 1
  }

  return { cols, rows, palette, pixels }
}

/** Stable id for a saved hand-drawn face. */
export function createPixelDrawnFaceId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `face-${Date.now()}-${Math.round(Math.random() * 1e6)}`
  )
}

function normalizeBell(value: unknown): PixelJellyfishBellSettings {
  const raw = isRecord(value) ? value : {}
  const bell = { ...DEFAULT_PIXEL_JELLYFISH_SETTINGS.bell }

  for (const slider of PIXEL_JELLYFISH_BELL_SLIDERS) {
    bell[slider.key] = normalizeNumber(
      raw[slider.key],
      bell[slider.key],
      slider.min,
      slider.max,
      slider.step
    )
  }

  bell.shape = normalizeEnum(raw.shape, PIXEL_JELLY_BELL_SHAPES, bell.shape)
  bell.color = normalizeColor(raw.color, bell.color)
  return bell
}

function normalizeTentacles(
  value: unknown,
  bell: PixelJellyfishBellSettings
): PixelJellyfishTentacleSettings {
  const raw = isRecord(value) ? value : {}
  const tentacles = { ...DEFAULT_PIXEL_JELLYFISH_SETTINGS.tentacles }

  for (const slider of PIXEL_JELLYFISH_TENTACLE_SLIDERS) {
    const max = slider.key === 'spread' ? getPixelJellyfishTentacleSpreadMax(bell) : slider.max
    tentacles[slider.key] = normalizeNumber(
      raw[slider.key],
      tentacles[slider.key],
      slider.min,
      max,
      slider.step
    )
  }

  tentacles.color = normalizeColor(raw.color, tentacles.color)
  return tentacles
}

export function getPixelJellyfishBellBottomWidth(bell: PixelJellyfishBellSettings): number {
  const bodyWidth = Math.max(1, Math.round(bell.width))
  // squash is a skirt inset in pixel cells (per side); convert to CSS px to match bell.width.
  const bottomInset = Math.round(bell.squash) * PIXEL_JELLYFISH_RENDER_PIXEL_SIZE
  return Math.max(1, bodyWidth - bottomInset * 2)
}

export function getPixelJellyfishTentacleSpreadMax(bell: PixelJellyfishBellSettings): number {
  const spreadSlider = PIXEL_JELLYFISH_TENTACLE_SLIDERS.find((slider) => slider.key === 'spread')
  if (!spreadSlider) return getPixelJellyfishBellBottomWidth(bell)
  return clamp(getPixelJellyfishBellBottomWidth(bell), spreadSlider.min, spreadSlider.max)
}

export function getPixelJellyScale(settings: PixelJellyfishSettings): number {
  const { min, max } = PIXEL_JELLYFISH_SCALE_RANGE
  const value =
    typeof settings.scale === 'number' && Number.isFinite(settings.scale) ? settings.scale : 1
  return clamp(value, min, max)
}

/** Render cell size after applying the avatar's overall-size multiplier. The renderer must use
 *  this together with {@link scalePixelJellyGeometry} so the avatar grows while its pixel layout
 *  stays identical. */
export function getEffectivePixelSize(
  settings: PixelJellyfishSettings,
  basePixelSize: number = PIXEL_JELLYFISH_RENDER_PIXEL_SIZE
): number {
  return basePixelSize * getPixelJellyScale(settings)
}

/** Scale ONLY the CSS-px geometry by `factor`. Cell-unit fields (roundness, squash, beadSize),
 *  physics and colors are intentionally left untouched — they describe the pixel grid, which
 *  stays constant while the cell size scales. Pass `factor = scale` alongside a render
 *  `pixelSize * factor` so the avatar enlarges with an unchanged pixel layout. The `factor` is
 *  arbitrary so callers can compose extra display zoom (e.g. previews) with the user's scale. */
export function scalePixelJellyGeometry(
  settings: PixelJellyfishSettings,
  factor: number
): PixelJellyfishSettings {
  if (!Number.isFinite(factor) || factor === 1) return settings
  return {
    ...settings,
    bell: {
      ...settings.bell,
      width: settings.bell.width * factor,
      topWidth: settings.bell.topWidth * factor,
      height: settings.bell.height * factor,
    },
    tentacles: {
      ...settings.tentacles,
      gap: settings.tentacles.gap * factor,
      spread: settings.tentacles.spread * factor,
    },
  }
}

// Worst-case envelope factors. The visual canvas (and therefore the window) must
// contain not just the jellyfish at rest, but everything its live animation reaches:
// tentacles swaying on the wind, the whole body leaning when the window is dragged
// fast, and the feed gesture flinging a tentacle outward. We size to this envelope
// ONCE per settings change rather than chasing the per-frame bounding box (which
// would jitter the window). All geometry is in CSS px, matching the slider values.
const RENDER_PIXEL_SIZE = PIXEL_JELLYFISH_RENDER_PIXEL_SIZE
const PIXEL_JELLY_LEAN_SWEEP_RAD = 0.5 // mirrors LEAN_MAX: full body tilt while dragging
const PIXEL_JELLY_WIND_SWAY_FACTOR = 6 // wind drift accumulated along the rope
const PIXEL_JELLY_ENVELOPE_MARGIN = 10 // breathing room around the whole shape
const PIXEL_JELLY_ELASTIC_SIDE_FACTOR = 0.65 // loose ropes spend part of stretch sideways
const PIXEL_JELLY_TOP_MARGIN = 8
const PIXEL_JELLY_BOTTOM_MARGIN = 18

function getTentacleSliderProgress(
  key: PixelJellyfishTentacleNumberKey,
  value: number,
  invert = false
): number {
  const slider = PIXEL_JELLYFISH_TENTACLE_SLIDERS.find((item) => item.key === key)
  if (!slider || slider.max === slider.min) return 0
  const progress = clamp((value - slider.min) / (slider.max - slider.min), 0, 1)
  return invert ? 1 - progress : progress
}

function smoothProgress(value: number): number {
  const t = clamp(value, 0, 1)
  return t * t * (3 - 2 * t)
}

function getTentacleRestLengthPressure(restLength: number): number {
  const segments = PIXEL_JELLYFISH_TENTACLE_SLIDERS.find((item) => item.key === 'segments')
  const gap = PIXEL_JELLYFISH_TENTACLE_SLIDERS.find((item) => item.key === 'gap')
  const beadSize = PIXEL_JELLYFISH_TENTACLE_SLIDERS.find((item) => item.key === 'beadSize')
  if (!segments || !gap || !beadSize) return 0

  // beadSize is in pixel cells; convert to CSS px so it shares units with gap-derived lengths.
  const minLength = Math.max(0, segments.min - 1) * gap.min + beadSize.min * RENDER_PIXEL_SIZE
  const maxLength = Math.max(0, segments.max - 1) * gap.max + beadSize.max * RENDER_PIXEL_SIZE
  if (maxLength <= minLength) return 0

  return smoothProgress((restLength - minLength) / (maxLength - minLength))
}

function getPixelJellyfishElasticity(settings: PixelJellyfishSettings): {
  restLength: number
  tipReach: number
  windSway: number
  gestureOutward: number
  elasticSlack: number
  lengthPressure: number
  upperSwingSlack: number
} {
  const { tentacles } = settings
  const effBell = getEffectiveBellDimensions(settings)
  const beadPx = tentacles.beadSize * RENDER_PIXEL_SIZE
  const restLength = Math.max(0, tentacles.segments - 1) * tentacles.gap + beadPx
  const lengthPressure = getTentacleRestLengthPressure(restLength)
  const tipReach = restLength + effBell.height * 0.28
  const windSway = tentacles.wind * tentacles.segments * PIXEL_JELLY_WIND_SWAY_FACTOR
  const gestureOutward =
    clamp((tentacles.spread / RENDER_PIXEL_SIZE) * 0.22, 3, 7) * RENDER_PIXEL_SIZE
  const looseRope = getTentacleSliderProgress('tension', tentacles.tension, true)
  const inertia = getTentacleSliderProgress('friction', tentacles.friction)
  const mouseReach = tentacles.mouseForce * tentacles.segments
  const rawElasticSlack = (restLength + windSway + mouseReach) * looseRope * (0.35 + inertia * 0.65)
  const elasticSlack = rawElasticSlack * lengthPressure
  const upperSwingSlack = clamp(
    (restLength * 0.22 + windSway + mouseReach * 1.5) *
      (0.35 + looseRope * 0.65) *
      (0.5 + inertia * 0.5),
    PIXEL_JELLY_ENVELOPE_MARGIN,
    FLOATING_AVATAR_BUTTON_SIZE
  )

  return {
    restLength,
    tipReach,
    windSway,
    gestureOutward,
    elasticSlack,
    lengthPressure,
    upperSwingSlack,
  }
}

export function getPixelJellyfishBodyCenterY(settings: PixelJellyfishSettings): number {
  const { tentacles } = settings
  const effBell = getEffectiveBellDimensions(settings)
  const { upperSwingSlack } = getPixelJellyfishElasticity(settings)
  const base =
    upperSwingSlack +
    PIXEL_JELLY_TOP_MARGIN +
    tentacles.beadSize * RENDER_PIXEL_SIZE +
    Math.max(3, Math.round(effBell.height / RENDER_PIXEL_SIZE)) * RENDER_PIXEL_SIZE * 0.58
  return base * getPixelJellyScale(settings)
}

export function getPixelJellyfishVisualSize(settings: PixelJellyfishSettings): {
  width: number
  height: number
} {
  const { tentacles } = settings
  const effBell = getEffectiveBellDimensions(settings)
  const {
    restLength,
    tipReach,
    windSway,
    gestureOutward,
    elasticSlack,
    lengthPressure,
    upperSwingSlack,
  } = getPixelJellyfishElasticity(settings)
  const beadPx = tentacles.beadSize * RENDER_PIXEL_SIZE
  const leanSweep = tipReach * Math.sin(PIXEL_JELLY_LEAN_SWEEP_RAD)
  const stableLeanSweep = leanSweep * (0.45 + lengthPressure * 0.55)
  const stableGestureOutward = gestureOutward * (0.35 + lengthPressure * 0.65)

  // x is centered and tentacles fan symmetrically, so the box is symmetric about
  // the body: half-width covers bell, spread, sway, lean and gesture on one side.
  // Curl drives a tip-weighted lateral coil independent of wind; reserve sideways room for it.
  const curlSway = tentacles.curl * tentacles.segments * PIXEL_JELLY_WIND_SWAY_FACTOR * 0.5
  const halfWidth =
    effBell.width / 2 +
    tentacles.spread / 2 +
    beadPx +
    stableLeanSweep +
    windSway +
    curlSway +
    stableGestureOutward +
    elasticSlack * PIXEL_JELLY_ELASTIC_SIDE_FACTOR +
    PIXEL_JELLY_ENVELOPE_MARGIN

  // Verlet ropes can stretch beyond the rest pose when they are long, loose, windy or
  // mouse-repelled. Give that elastic tail room vertically, while width still has a live
  // resize controller for rare extra-wide frames.
  const height =
    upperSwingSlack +
    PIXEL_JELLY_TOP_MARGIN +
    beadPx +
    effBell.height * 0.86 +
    restLength +
    beadPx +
    PIXEL_JELLY_BOTTOM_MARGIN +
    windSway * 0.5 +
    elasticSlack

  // Overall-size scales the whole envelope: geometry and the render cell grow together, so
  // the box grows by the same factor the renderer enlarges each pixel by.
  const scale = getPixelJellyScale(settings)
  const clampSize = (value: number): number =>
    Math.round(
      clamp(
        value * scale,
        FLOATING_AVATAR_PIXEL_MIN_VISUAL_SIZE,
        FLOATING_AVATAR_PIXEL_MAX_VISUAL_SIZE
      )
    )

  return {
    width: clampSize(halfWidth * 2),
    height: clampSize(height),
  }
}

export function getFloatingAvatarWindowMetrics(
  appearance: FloatingAvatarAppearance
): FloatingAvatarWindowMetrics {
  const visual =
    appearance.variant === 'pixel'
      ? getPixelJellyfishVisualSize(appearance.pixel)
      : {
          width: FLOATING_AVATAR_CLASSIC_VISUAL_SIZE,
          height: FLOATING_AVATAR_CLASSIC_VISUAL_SIZE,
        }
  const buttonBottomInset = FLOATING_AVATAR_WINDOW_EDGE_INSET
  const buttonTopInset =
    appearance.variant === 'pixel'
      ? Math.max(
          0,
          Math.round(
            getPixelJellyfishBodyCenterY(appearance.pixel) - FLOATING_AVATAR_BUTTON_SIZE / 2
          )
        )
      : Math.max(
          0,
          Math.round(
            Math.max(FLOATING_AVATAR_BUTTON_SIZE, visual.height) -
              FLOATING_AVATAR_BUTTON_SIZE +
              FLOATING_AVATAR_DOCK_GAP
          )
        )
  const buttonRightInset = Math.max(
    FLOATING_AVATAR_WINDOW_EDGE_INSET,
    Math.round(
      FLOATING_AVATAR_WINDOW_EDGE_INSET + visual.width / 2 - FLOATING_AVATAR_BUTTON_SIZE / 2
    )
  )
  const dockHeight =
    Math.max(FLOATING_AVATAR_BUTTON_SIZE, visual.height) +
    buttonBottomInset +
    FLOATING_AVATAR_DOCK_GAP

  // Both variants floor at the same square min — the body's live reach grows the window
  // above this, but it never shrinks below it, so the resting window stays stable.
  const windowWidth = Math.max(
    FLOATING_AVATAR_WINDOW_MIN_SIZE,
    Math.round(visual.width + FLOATING_AVATAR_WINDOW_EDGE_INSET * 2)
  )
  const windowHeight = Math.max(FLOATING_AVATAR_WINDOW_MIN_SIZE, Math.round(dockHeight))

  return {
    buttonSize: FLOATING_AVATAR_BUTTON_SIZE,
    buttonRightInset,
    buttonTopInset,
    buttonBottomInset,
    visualWidth: visual.width,
    visualHeight: visual.height,
    dockHeight,
    windowWidth,
    windowHeight,
  }
}

function normalizePixelDrawnFaces(value: unknown, fallbackColor: string): PixelDrawnFace[] {
  if (!Array.isArray(value)) return []
  const faces: PixelDrawnFace[] = []
  for (const item of value) {
    if (!isRecord(item)) continue
    const canvas = normalizePixelBellCanvas(item.canvas, fallbackColor)
    if (!canvas) continue
    const id = typeof item.id === 'string' && item.id ? item.id : createPixelDrawnFaceId()
    faces.push({ id, canvas })
    if (faces.length >= PIXEL_DRAWN_FACE_MAX) break
  }
  return faces
}

/** FLOATING_AVATAR_NAME_MAX_LENGTH 限制水母名字的最大字符数。 */
export const FLOATING_AVATAR_NAME_MAX_LENGTH = 32

/** 清理水母名字；空值表示尚未命名。 */
export function normalizeFloatingAvatarName(value: unknown): string {
  return typeof value === 'string'
    ? Array.from(value.trim()).slice(0, FLOATING_AVATAR_NAME_MAX_LENGTH).join('')
    : ''
}

/** 归一化持久化或 IPC 输入的水母外观。 */
export function normalizeFloatingAvatarAppearance(value: unknown): FloatingAvatarAppearance {
  const raw = isRecord(value) ? value : {}
  const rawPixel = isRecord(raw.pixel) ? raw.pixel : {}
  const bell = normalizeBell(rawPixel.bell)
  const tentacles = normalizeTentacles(rawPixel.tentacles, bell)
  const eyeBgColor = normalizeColor(
    rawPixel.eyeBgColor,
    DEFAULT_PIXEL_JELLYFISH_SETTINGS.eyeBgColor
  )
  const customFaces = normalizePixelDrawnFaces(rawPixel.customFaces, eyeBgColor)
  const activeCustomFaceId =
    typeof rawPixel.activeCustomFaceId === 'string' &&
    customFaces.some((face) => face.id === rawPixel.activeCustomFaceId)
      ? rawPixel.activeCustomFaceId
      : null

  return {
    variant: raw.variant === 'classic' ? 'classic' : 'pixel',
    pixel: {
      bell,
      tentacles,
      eyeBgColor,
      scale: normalizeNumber(
        rawPixel.scale,
        DEFAULT_PIXEL_JELLYFISH_SETTINGS.scale,
        PIXEL_JELLYFISH_SCALE_RANGE.min,
        PIXEL_JELLYFISH_SCALE_RANGE.max,
        PIXEL_JELLYFISH_SCALE_RANGE.step
      ),
      expression: normalizeEnum(
        rawPixel.expression,
        PIXEL_JELLY_EXPRESSIONS,
        DEFAULT_PIXEL_JELLYFISH_SETTINGS.expression
      ),
      customBell: normalizePixelBellCanvas(rawPixel.customBell, bell.color),
      customFaces,
      activeCustomFaceId,
    },
  }
}

/** Normalize a saved appearance preset received through settings persistence or IPC. */
export function normalizeFloatingAvatarAppearancePreset(
  value: unknown
): FloatingAvatarAppearancePreset | null {
  if (!isRecord(value)) return null

  const appearance = normalizeFloatingAvatarAppearance(value.appearance)
  return {
    id:
      typeof value.id === 'string' && value.id
        ? value.id
        : `avatar-preset-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`,
    appearance,
    activeCustomFaceId:
      typeof value.activeCustomFaceId === 'string'
        ? value.activeCustomFaceId
        : appearance.pixel.activeCustomFaceId,
    savedAt:
      typeof value.savedAt === 'number' && Number.isFinite(value.savedAt)
        ? value.savedAt
        : Date.now(),
  }
}

export function normalizeFloatingAvatarAppearancePresets(
  value: unknown
): FloatingAvatarAppearancePreset[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const preset = normalizeFloatingAvatarAppearancePreset(item)
    return preset ? [preset] : []
  })
}

/** 建议生成状态只包含繁忙标记和递增版本，不携带会话内容。 */
export type SuggestionGenerationState = { active: boolean; revision: number }

/** PixelJellyRopeSnapshot 是一条触手相对伞盖中心的格坐标。 */
export interface PixelJellyRopeSnapshot {
  phase: number
  side: number
  points: { x: number; y: number; ox: number; oy: number }[]
}

/** PixelJellyMotionSnapshot 是像素水母可跨窗口延续的运动状态。 */
export interface PixelJellyMotionSnapshot {
  ropes: PixelJellyRopeSnapshot[]
  deform: { x: number; y: number; grabX: number; grabY: number; lean: number; leanV: number }
  time: number
  dragVelocityX: number
}

