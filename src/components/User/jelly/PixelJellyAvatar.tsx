/** 绘制像素水母、触手物理与交互姿态，动画调度由固定帧率循环负责。 */
import { forwardRef, useEffect, useImperativeHandle, useRef, type MouseEvent } from 'react'
import './generatingMotion.css'
import { GENERATING_BREATH_PERIOD_MS, sampleGeneratingSway } from './generatingMotion'
import { startPixelAnimationLoop } from './pixelAnimationLoop'
import {
  getPixelJellyfishBodyCenterY,
  getPixelJellyfishBellShapeWidth,
  trimPixelBellCanvasToContent,
  PIXEL_JELLYFISH_RENDER_PIXEL_SIZE,
  type FloatingAvatarDockSide,
  type PixelJellyExpression,
  type PixelBellCanvas,
  type PixelJellyfishSettings,
  type PixelJellyMotionSnapshot,
} from './appearance'

/** 导出头像支持的表情类型。 */
export type { PixelJellyExpression }

const LEAN_DRIVE = 0.22
const LEAN_MAX = 0.5
const LEAN_STIFFNESS = 0.18
const LEAN_DAMPING = 0.85
const GESTURE_TILT = 0.35
const DIZZY_DURATION = 3200
const DIZZY_WOBBLE = 0.3
const DIZZY_WOBBLE_SPEED = 0.018
const DIZZY_TURN_WINDOW_MS = 850
const DIZZY_TURN_COUNT = 3
const DIZZY_TURN_DOT_MAX = 0.25
const DIZZY_MIN_SAMPLE_DISTANCE = 8
const DIZZY_MIN_SPEED = 0.55
const DIZZY_COOLDOWN_MS = DIZZY_DURATION + 900
const EDGE_POSE_TILT = 0.22
const EDGE_POSE_PEEK_TILT = 0.08
const EDGE_POSE_REST_OFFSET = 1.25
const EDGE_POSE_HOVER_OFFSET = 2.25
const EDGE_POSE_EASE = 0.16
const EDGE_POSE_HOVER_EASE = 0.18
const EDGE_WAVE_ARC_RAISE = 1.5
const EDGE_WAVE_ARC_SWING = 0.32
const EDGE_WAVE_ARC_DRIFT = 0.5
const EDGE_WAVE_TIP_LIFT = 1.35
const EDGE_WAVE_SPEED = 0.012
const EDGE_WAVE_TAIL_PHASE = 1.7
const MOUSE_REPEL_RADIUS = 40
const MOUSE_STIR_RADIUS = 58
const MOUSE_STIR_SPEED = 0.027
const MOUSE_STIR_SWIRL = 0.68
const MOUSE_STIR_PULSE = 0.22
const COLOR_WAVE_PALETTE = ['#8ae2ff', '#fff06a', '#ff8fc7', '#8cf6ff', '#c7a2ff']
const SUNGLASSES_LENS_HEX = '#111827'
const SUNGLASSES_LENS_PIXELS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [0, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
]

type PixelJellyAvatarProps = {
  settings: PixelJellyfishSettings
  isMunching: boolean
  /** 建议生成提示不改变窗口定位或点击区域。 */
  isGenerating?: boolean
  /** 每次截屏递增，用于触发像素相机动画。 */
  captureNonce?: number
  pixelSize?: number
  /** 右下角探头姿态，独立于桌面单边停靠。 */
  cornerPeek?: boolean
  dockSide?: FloatingAvatarDockSide
  isHovered?: boolean
  hasSunglasses?: boolean
  expression?: PixelJellyExpression
  /** 上报裁切前的可见半宽，单位为 CSS 像素，供宿主窗口调整绘制空间。 */
  onExtents?: (halfWidth: number) => void
}

export type PixelJellyAvatarHandle = {
  /** 返回当前已绘制头部的视口边界，排除触手和透明画布。 */
  getHeadBounds: () => DOMRect | null
  setMousePosition: (clientX: number, clientY: number) => void
  clearMouse: () => void
  recordDragMotion: (deltaX: number, deltaY: number) => void
  /** 导出触手、形变与时钟，供另一块画布延续同一姿态。 */
  exportMotion: () => PixelJellyMotionSnapshot | null
  /** 用快照覆盖当前运动状态；触手结构不匹配时忽略。 */
  importMotion: (snapshot: PixelJellyMotionSnapshot) => void
}

type RopePoint = {
  x: number
  y: number
  ox: number
  oy: number
}

type Rope = {
  phase: number
  side: number
  points: RopePoint[]
}

type PixelJellyRuntime = {
  getHeadBounds: () => DOMRect | null
  setMousePosition: (clientX: number, clientY: number) => void
  clearMouse: () => void
  refreshLayout: () => void
  refreshCanvas: () => void
  triggerFeed: () => void
  triggerCapture: () => void
  recordDragMotion: (deltaX: number, deltaY: number) => void
  exportMotion: () => PixelJellyMotionSnapshot | null
  importMotion: (snapshot: PixelJellyMotionSnapshot) => void
}

type CanvasRowColorResolver = (row: number, baseColor: number) => number

type CanvasDrawOptions = {
  pivotYOverride?: number
  rowColor?: CanvasRowColorResolver
}

type TimedAction = {
  start: number
  duration: number
  side?: number
}

type RuntimeState = {
  jelly: { x: number; y: number }
  mouse: { x: number; y: number; active: boolean }
  deform: { x: number; y: number; grabX: number; grabY: number; lean: number; leanV: number }
  layout: { baseX: number; baseY: number; minX: number; maxX: number }
  edgePose: { direction: number; hover: number }
  dragMotion: {
    lastDirX: number
    lastDirY: number
    lastSampleAt: number
    lastTurnAt: number
    sharpTurns: number
    lastDizzyAt: number
  }
  actions: {
    tentacle: TimedAction
    talk: TimedAction
    colorWave: TimedAction
    dizzy: TimedAction
    capture: {
      start: number
      duration: number
      side: number
      angle: number
      dx: number
      dy: number
    }
  }
  ropes: Rope[]
  nextTentacleSide: number
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value))

const odd = (value: number): number => {
  const rounded = Math.round(value)
  return rounded % 2 === 0 ? rounded + 1 : rounded
}

const hexToUint32 = (hex: string): number => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0
}

const COLOR_WAVE_COLORS = COLOR_WAVE_PALETTE.map(hexToUint32)
const SUNGLASSES_LENS_COLOR = hexToUint32(SUNGLASSES_LENS_HEX)

/** 像素相机的栅格模板，每个字符对应一格，句点表示透明。 */
const CAMERA_SPRITE_ROWS = [
  '....MM..R..',
  'DDDDDDDDDDD',
  'DMMMMMMMFFD',
  'DDDGGGGGDDD',
  'DDDGISSGDDD',
  'DDDGSSSGDDD',
  'DDDGGGGGDDD',
  'DDDDDDDDDDD',
]
const CAMERA_SPRITE_HEX: Record<string, string> = {
  D: '#232a33',
  M: '#3b434f',
  G: '#5b6573',
  S: '#0d121a',
  I: '#c3e6ff',
  F: '#ffef9e',
  R: '#ff6f6f',
}
const CAMERA_W = CAMERA_SPRITE_ROWS[0].length
const CAMERA_H = CAMERA_SPRITE_ROWS.length
const CAMERA_CELLS: number[] = (() => {
  const cells = new Array<number>(CAMERA_W * CAMERA_H).fill(0)
  CAMERA_SPRITE_ROWS.forEach((row, y) => {
    ;[...row].forEach((ch, x) => {
      if (ch !== '.') cells[y * CAMERA_W + x] = hexToUint32(CAMERA_SPRITE_HEX[ch])
    })
  })
  return cells
})()
const CAMERA_FLASH_COLOR = hexToUint32('#ffffff')
const CAMERA_DURATION_MS = 900
/** 镜头中心相对于相机中心的格数偏移。 */
const CAMERA_LENS_OFFSET_X = 5 - CAMERA_W / 2
const CAMERA_LENS_OFFSET_Y = 4.5 - CAMERA_H / 2

const smooth = (value: number): number => {
  const t = clamp(value, 0, 1)
  return t * t * (3 - 2 * t)
}

const actionAmount = (action: TimedAction, now: number): number => {
  const elapsed = now - action.start
  if (elapsed < 0 || elapsed > action.duration) return 0
  return elapsed / action.duration
}

const tentacleGesture = (progress: number): { outward: number; lift: number } => {
  const outward =
    progress < 0.16
      ? smooth(progress / 0.16)
      : progress < 0.82
        ? 1
        : 1 - smooth((progress - 0.82) / 0.18)
  const lift =
    progress < 0.42
      ? smooth((progress - 0.12) / 0.3)
      : progress < 0.68
        ? 1
        : 1 - smooth((progress - 0.68) / 0.32)

  return {
    outward: Math.max(0, outward),
    lift: Math.max(0, lift),
  }
}

export const PixelJellyAvatar = forwardRef<PixelJellyAvatarHandle, PixelJellyAvatarProps>(
  function PixelJellyAvatar(
    {
      settings,
      isMunching,
      isGenerating = false,
      captureNonce,
      pixelSize = PIXEL_JELLYFISH_RENDER_PIXEL_SIZE,
      dockSide = 'none',
      cornerPeek = false,
      isHovered = false,
      hasSunglasses = false,
      expression,
      onExtents,
    },
    ref
  ): React.JSX.Element {
    const activeExpression = expression ?? settings.expression
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const generatingRef = useRef(isGenerating)
    const reducedMotionRef = useRef(false)
    const settingsRef = useRef(settings)
    const pixelSizeRef = useRef(pixelSize)
    const cornerPeekRef = useRef(cornerPeek)
    const dockSideRef = useRef<FloatingAvatarDockSide>(dockSide)
    const isHoveredRef = useRef(isHovered)
    const hasSunglassesRef = useRef(hasSunglasses)
    const expressionRef = useRef<PixelJellyExpression>(activeExpression)
    const onExtentsRef = useRef(onExtents)
    const runtimeRef = useRef<PixelJellyRuntime | null>(null)

    useEffect(() => {
      generatingRef.current = isGenerating
    }, [isGenerating])

    useEffect(() => {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)')
      const sync = (): void => {
        reducedMotionRef.current = media.matches
      }
      sync()
      media.addEventListener('change', sync)
      return () => media.removeEventListener('change', sync)
    }, [])

    useEffect(() => {
      onExtentsRef.current = onExtents
    }, [onExtents])

    useImperativeHandle(
      ref,
      () => ({
        setMousePosition: (clientX, clientY) => {
          runtimeRef.current?.setMousePosition(clientX, clientY)
        },
        clearMouse: () => {
          runtimeRef.current?.clearMouse()
        },
        recordDragMotion: (deltaX, deltaY) => {
          runtimeRef.current?.recordDragMotion(deltaX, deltaY)
        },
        getHeadBounds: () => runtimeRef.current?.getHeadBounds() ?? null,
        exportMotion: () => runtimeRef.current?.exportMotion() ?? null,
        importMotion: (snapshot) => {
          runtimeRef.current?.importMotion(snapshot)
        },
      }),
      []
    )

    useEffect(() => {
      settingsRef.current = settings
      runtimeRef.current?.refreshLayout()
    }, [settings])

    useEffect(() => {
      pixelSizeRef.current = pixelSize
      runtimeRef.current?.refreshCanvas()
    }, [pixelSize])

    useEffect(() => {
      cornerPeekRef.current = cornerPeek
    }, [cornerPeek])

    useEffect(() => {
      dockSideRef.current = dockSide
    }, [dockSide])

    useEffect(() => {
      isHoveredRef.current = isHovered
    }, [isHovered])

    useEffect(() => {
      hasSunglassesRef.current = hasSunglasses
    }, [hasSunglasses])

    useEffect(() => {
      expressionRef.current = activeExpression
    }, [activeExpression])

    useEffect(() => {
      if (isMunching) runtimeRef.current?.triggerFeed()
    }, [isMunching])

    useEffect(() => {
      if (captureNonce) runtimeRef.current?.triggerCapture()
    }, [captureNonce])

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return undefined

      const ctx = canvas.getContext('2d', { alpha: true })
      if (!ctx) return undefined

      let cols = 0
      let rows = 0
      let imgData = ctx.createImageData(1, 1)
      let buf32 = new Uint32Array(imgData.data.buffer)
      let time = 0
      // 记录裁切前绘制内容的水平范围，单位为像素格。
      let drawingHead = false
      let headBounds: { left: number; top: number; right: number; bottom: number } | null = null
      let frameMinX = 0
      let frameMaxX = 0
      let prevJellyX = 0
      let gestureTilt = 0
      let dizzyTilt = 0
      let windowDragVelocityX = 0

      const state: RuntimeState = {
        jelly: { x: 8, y: 5 },
        mouse: { x: -1000, y: -1000, active: false },
        deform: { x: 0, y: 0, grabX: 0, grabY: 0, lean: 0, leanV: 0 },
        layout: { baseX: 8, baseY: 5, minX: 8, maxX: 8 },
        edgePose: { direction: 0, hover: 0 },
        dragMotion: {
          lastDirX: 0,
          lastDirY: 0,
          lastSampleAt: 0,
          lastTurnAt: 0,
          sharpTurns: 0,
          lastDizzyAt: 0,
        },
        actions: {
          tentacle: { start: 0, duration: 1300, side: 1 },
          talk: { start: 0, duration: 1200 },
          colorWave: { start: 0, duration: 760 },
          dizzy: { start: 0, duration: 3200 },
          capture: { start: 0, duration: CAMERA_DURATION_MS, side: 1, angle: 0, dx: 0, dy: 0 },
        },
        ropes: [],
        nextTentacleSide: 1,
      }

      const activePixelSize = (): number => pixelSizeRef.current
      const toGrid = (value: number): number => value / activePixelSize()
      const activeSettings = (): PixelJellyfishSettings => settingsRef.current
      /** 计算身体的像素格范围，手绘形状忽略透明编辑边距。 */
      const effectiveBellCells = (): { cols: number; rows: number } => {
        const s = activeSettings()
        if (s.customBell) {
          const body = trimPixelBellCanvasToContent(s.customBell)
          return { cols: body.cols, rows: body.rows }
        }
        return {
          cols: Math.max(5, odd(toGrid(s.bell.width))),
          rows: Math.max(3, Math.round(toGrid(s.bell.height))),
        }
      }
      const edgeDirection = (): number => {
        if (cornerPeekRef.current) return -1
        const side = dockSideRef.current
        if (side === 'left') return 1
        if (side === 'right') return -1
        return 0
      }

      const edgeOffset = (): number =>
        cornerPeekRef.current
          ? 0
          : state.edgePose.direction *
            (EDGE_POSE_REST_OFFSET + state.edgePose.hover * EDGE_POSE_HOVER_OFFSET)

      const edgeTilt = (): number =>
        cornerPeekRef.current
          ? -Math.PI / 4
          : state.edgePose.direction * (EDGE_POSE_TILT + state.edgePose.hover * EDGE_POSE_PEEK_TILT)

      const isEdgeHoverPoseActive = (): boolean =>
        Math.abs(state.edgePose.direction) > 0.05 && state.edgePose.hover > 0.05

      const applyJellyPose = (immediate: boolean): void => {
        const targetX = clamp(
          state.layout.baseX + edgeOffset(),
          state.layout.minX,
          state.layout.maxX
        )
        const targetY = state.layout.baseY

        if (immediate) {
          state.jelly.x = targetX
          state.jelly.y = targetY
          return
        }

        state.jelly.x += (targetX - state.jelly.x) * EDGE_POSE_EASE
        state.jelly.y += (targetY - state.jelly.y) * EDGE_POSE_EASE
      }

      const positionJelly = (): void => {
        const { tentacles } = activeSettings()
        const { cols: bodyWidth, rows: bodyHeight } = effectiveBellCells()
        // beadSize 已按像素格计量，无需换算。
        const beadPadding = Math.max(1, Math.round(tentacles.beadSize))
        const topMargin = toGrid(8)
        const bottomMargin = toGrid(18)
        const horizontalPadding = bodyWidth / 2 + beadPadding + 1
        const leftBound = Math.min(horizontalPadding, cols / 2)
        const rightBound = Math.max(leftBound, cols - leftBound)
        const topRoom = bodyHeight * 0.58 + beadPadding + topMargin
        const tentacleDepth =
          bodyHeight * 0.28 +
          Math.max(0, tentacles.segments - 1) * toGrid(tentacles.gap) +
          beadPadding +
          bottomMargin
        const maxYForTentacles = rows - tentacleDepth

        state.layout.baseX = clamp(cols / 2, leftBound, rightBound)
        state.layout.minX = leftBound
        state.layout.maxX = rightBound
        if (maxYForTentacles >= topRoom) {
          state.layout.baseY = clamp(
            toGrid(getPixelJellyfishBodyCenterY(activeSettings())),
            topRoom,
            maxYForTentacles
          )
          applyJellyPose(true)
          return
        }

        const fallbackMinY = Math.min(topRoom, Math.max(2, rows - 2))
        const fallbackMaxY = Math.max(fallbackMinY, rows - Math.max(2, beadPadding))
        state.layout.baseY = clamp(rows * 0.42, fallbackMinY, fallbackMaxY)
        applyJellyPose(true)
      }

      /** 记录所有头部绘制路径的不透明像素边界，包括倾斜后的直接采样。 */
      const recordHeadBounds = (x0: number, y0: number, x1: number, y1: number): void => {
        if (!drawingHead || x1 <= x0 || y1 <= y0) return
        if (!headBounds) headBounds = { left: x0, top: y0, right: x1, bottom: y1 }
        else {
          headBounds.left = Math.min(headBounds.left, x0)
          headBounds.top = Math.min(headBounds.top, y0)
          headBounds.right = Math.max(headBounds.right, x1)
          headBounds.bottom = Math.max(headBounds.bottom, y1)
        }
      }

      const fillRect = (
        x: number,
        y: number,
        width: number,
        height: number,
        color: number
      ): void => {
        // 先记录裁切前范围，让宿主可在身体触及画布边缘时扩展窗口。
        if (x < frameMinX) frameMinX = x
        if (x + width > frameMaxX) frameMaxX = x + width
        const x0 = clamp(Math.round(x), 0, cols)
        const y0 = clamp(Math.round(y), 0, rows)
        const x1 = clamp(Math.round(x + width), 0, cols)
        const y1 = clamp(Math.round(y + height), 0, rows)

        recordHeadBounds(x0, y0, x1, y1)
        for (let yy = y0; yy < y1; yy += 1) {
          const offset = yy * cols
          for (let xx = x0; xx < x1; xx += 1) {
            buf32[offset + xx] = color
          }
        }
      }

      const resolveBaseAnchor = (index: number): { x: number; y: number } => {
        const { tentacles } = activeSettings()
        const { count, spread } = tentacles
        const bellHeight = effectiveBellCells().rows
        const t = count === 1 ? 0.5 : index / (count - 1)
        // 身体的奇数宽行以整格列为中心；触手锚点对齐同一格中心，避免取整破坏左右对称。
        const offset = (t - 0.5) * toGrid(spread)
        const cellCenterX = Math.round(state.jelly.x) + 0.5

        return {
          x: cellCenterX + Math.sign(offset) * Math.round(Math.abs(offset)),
          y: state.jelly.y + bellHeight * 0.28 + Math.sin(t * Math.PI),
        }
      }

      const makeRopes = (): void => {
        const { tentacles } = activeSettings()
        const { count, segments, gap } = tentacles
        const ropes: Rope[] = []

        for (let i = 0; i < count; i += 1) {
          const t = count === 1 ? 0.5 : i / (count - 1)
          const side = t - 0.5
          const anchor = resolveBaseAnchor(i)
          const phase = Math.abs(side) * Math.PI * 2
          const points: RopePoint[] = []

          for (let j = 0; j < segments; j += 1) {
            points.push({
              x: anchor.x,
              y: anchor.y + j * toGrid(gap),
              ox: anchor.x,
              oy: anchor.y + j * toGrid(gap),
            })
          }

          ropes.push({ phase, side, points })
        }

        state.ropes = ropes
      }

      const resize = (): void => {
        const rect = canvas.getBoundingClientRect()
        const cellSize = activePixelSize()
        cols = Math.max(1, Math.ceil(rect.width / cellSize))
        rows = Math.max(1, Math.ceil(rect.height / cellSize))
        canvas.width = cols
        canvas.height = rows
        imgData = ctx.createImageData(cols, rows)
        buf32 = new Uint32Array(imgData.data.buffer)

        const prevX = state.jelly.x
        const prevY = state.jelly.y
        positionJelly()
        prevJellyX = state.jelly.x

        // 窗口尺寸变化时平移现有触手，保留运动状态；只有结构变化才重建。
        const { count, segments } = activeSettings().tentacles
        if (state.ropes.length === count && state.ropes[0]?.points.length === segments) {
          const dx = state.jelly.x - prevX
          const dy = state.jelly.y - prevY
          if (dx !== 0 || dy !== 0) {
            for (const rope of state.ropes) {
              for (const p of rope.points) {
                p.x += dx
                p.y += dy
                p.ox += dx
                p.oy += dy
              }
            }
          }
        } else {
          makeRopes()
        }
      }

      const resolveAnchor = (index: number): { x: number; y: number } => {
        const anchor = resolveBaseAnchor(index)
        const bellHeight = effectiveBellCells().rows
        const angle = (state.deform.lean || 0) + gestureTilt + dizzyTilt + edgeTilt()
        const bodyH = Math.max(3, Math.round(bellHeight))
        const pivotX = Math.round(state.jelly.x)
        const pivotY = Math.round(state.jelly.y - bodyH * 0.58) + (bodyH - 1)
        const cosA = Math.cos(angle)
        const sinA = Math.sin(angle)
        const ox = anchor.x - pivotX
        const oy = anchor.y - pivotY

        return {
          x: pivotX + ox * cosA - oy * sinA,
          y: pivotY + ox * sinA + oy * cosA,
        }
      }

      /** 返回当前手绘表情；空值表示使用参数化表情。 */
      const resolveActiveFace = (): PixelBellCanvas | null => {
        const s = activeSettings()
        if (!s.activeCustomFaceId) return null
        return s.customFaces.find((face) => face.id === s.activeCustomFaceId)?.canvas ?? null
      }

      /** 绘制随身体倾斜的像素图层，跳过透明格并允许表情共用身体旋转中心。 */
      const drawCanvasCells = (
        canvas: PixelBellCanvas,
        centerX: number,
        top: number,
        angle: number,
        options: CanvasDrawOptions = {}
      ): void => {
        const { pivotYOverride, rowColor } = options
        const cCols = canvas.cols
        const cRows = canvas.rows
        const left = centerX - Math.floor(cCols / 2)
        const pivotY = pivotYOverride ?? top + (cRows - 1)
        const palette = canvas.palette.map((hex) => hexToUint32(hex))
        const cellColor = (col: number, row: number): number => {
          const v = canvas.pixels[row * cCols + col]
          if (v <= 0 || v > palette.length) return 0
          const baseColor = palette[v - 1]
          return rowColor ? rowColor(row, baseColor) : baseColor
        }

        if (Math.abs(angle) < 0.01) {
          for (let row = 0; row < cRows; row += 1) {
            for (let col = 0; col < cCols; col += 1) {
              const color = cellColor(col, row)
              if (color !== 0) fillRect(left + col, top + row, 1, 1, color)
            }
          }
          return
        }

        // 逆向旋转采样可保持像素格清晰，避免倾斜后出现空隙。
        const pivotX = centerX
        const cosA = Math.cos(angle)
        const sinA = Math.sin(angle)
        let minX = Infinity
        let maxX = -Infinity
        let minY = Infinity
        let maxY = -Infinity
        const corners = [
          [left, top],
          [left + cCols, top],
          [left, top + cRows],
          [left + cCols, top + cRows],
        ]
        for (const [cx, cy] of corners) {
          const ox = cx - pivotX
          const oy = cy - pivotY
          minX = Math.min(minX, pivotX + ox * cosA - oy * sinA)
          maxX = Math.max(maxX, pivotX + ox * cosA - oy * sinA)
          minY = Math.min(minY, pivotY + ox * sinA + oy * cosA)
          maxY = Math.max(maxY, pivotY + ox * sinA + oy * cosA)
        }
        const gx0 = clamp(Math.floor(minX) - 1, 0, cols)
        const gx1 = clamp(Math.ceil(maxX) + 1, 0, cols)
        const gy0 = clamp(Math.floor(minY) - 1, 0, rows)
        const gy1 = clamp(Math.ceil(maxY) + 1, 0, rows)
        for (let gy = gy0; gy < gy1; gy += 1) {
          const offY = gy - pivotY
          const rowOff = gy * cols
          for (let gx = gx0; gx < gx1; gx += 1) {
            const ox = gx - pivotX
            const col = Math.round(pivotX + ox * cosA + offY * sinA) - left
            const row = Math.round(pivotY - ox * sinA + offY * cosA) - top
            if (col < 0 || col >= cCols || row < 0 || row >= cRows) continue
            const color = cellColor(col, row)
            if (color !== 0) {
              buf32[rowOff + gx] = color
              recordHeadBounds(gx, gy, gx + 1, gy + 1)
            }
          }
        }
      }

      /** 绘制独立表情图层，包含预设、手绘、眩晕、说话和隐私墨镜状态。 */
      const drawFaceLayer = (params: {
        centerX: number
        top: number
        frameCols: number
        frameRows: number
        angle: number
        dragX: number
        dragY: number
        grabX: number
        grabRowT: number
        eyeColor: number
        now: number
      }): void => {
        const {
          centerX,
          top,
          frameCols,
          frameRows,
          angle,
          dragX,
          dragY,
          grabX,
          grabRowT,
          eyeColor,
          now,
        } = params
        const activeFace = resolveActiveFace()
        const cosA = Math.cos(angle)
        const sinA = Math.sin(angle)
        const pivotX = centerX
        const pivotY = top + (frameRows - 1)
        const rot = (px: number, py: number): { x: number; y: number } => ({
          x: Math.round(pivotX + (px - pivotX) * cosA - (py - pivotY) * sinA),
          y: Math.round(pivotY + (px - pivotX) * sinA + (py - pivotY) * cosA),
        })
        const eyeT = 0.54
        const eyeY = top + Math.max(2, Math.round(frameRows * eyeT))
        const eyeGrip = clamp(1 - Math.abs(eyeT - grabRowT) * 1.65, 0, 1)
        const eyeShift = Math.round(
          dragX * (0.18 - eyeT * 0.28) + dragX * eyeGrip * (0.42 + Math.abs(grabX) * 0.36)
        )
        const eyeCounterX = Math.abs(dragX) > 0.35 ? -Math.sign(dragX) : 0
        const eyeCounterY = Math.abs(dragY) > 0.45 ? -Math.sign(dragY) : 0
        const eyeOffset = Math.max(2, Math.round(frameCols * 0.18))
        const baseEyeX = centerX + eyeShift + eyeCounterX
        const baseEyeY = eyeY + eyeCounterY
        const dizzy = now - state.actions.dizzy.start < state.actions.dizzy.duration
        const drawScreenPixel = (px: number, py: number, color: number): void => {
          fillRect(Math.round(px), Math.round(py), 1, 1, color)
        }
        const drawRotLens = (cx: number, cy: number, color: number): void => {
          const center = rot(cx, cy)
          for (const [dx, dy] of SUNGLASSES_LENS_PIXELS) {
            drawScreenPixel(center.x + dx, center.y + dy, color)
          }
        }
        const drawRotPixel = (px: number, py: number, color: number): void => {
          const p = rot(px, py)
          drawScreenPixel(p.x, p.y, color)
        }
        const drawRotLine = (
          startX: number,
          startY: number,
          endX: number,
          endY: number,
          color: number
        ): void => {
          const start = rot(startX, startY)
          const end = rot(endX, endY)
          const steps = Math.max(Math.abs(end.x - start.x), Math.abs(end.y - start.y), 1)

          for (let step = 0; step <= steps; step += 1) {
            const t = step / steps
            drawScreenPixel(start.x + (end.x - start.x) * t, start.y + (end.y - start.y) * t, color)
          }
        }
        // 表情使用单格图元，保持低分辨率下的轮廓清晰。
        const drawExpressionEyes = (
          expression: PixelJellyExpression,
          leftX: number,
          rightX: number,
          y: number
        ): void => {
          if (expression === 'sleepy' || expression === 'calm') {
            const half = expression === 'sleepy' ? 2 : 1
            drawRotLine(leftX - half, y, leftX + half, y, eyeColor)
            drawRotLine(rightX - half, y, rightX + half, y, eyeColor)
            return
          }
          if (expression === 'proud') {
            for (const ex of [leftX, rightX]) {
              drawRotPixel(ex - 1, y, eyeColor)
              drawRotPixel(ex, y - 1, eyeColor)
              drawRotPixel(ex + 1, y, eyeColor)
            }
            return
          }
          if (expression === 'excited' || expression === 'surprised') {
            for (const ex of [leftX, rightX]) {
              drawRotPixel(ex, y - 1, eyeColor)
              drawRotPixel(ex, y, eyeColor)
            }
            return
          }
          if (expression === 'focused') {
            drawRotPixel(leftX, y, eyeColor)
            drawRotPixel(rightX, y, eyeColor)
            drawRotLine(leftX - 1, y - 2, leftX + 1, y - 1, eyeColor)
            drawRotLine(rightX - 1, y - 1, rightX + 1, y - 2, eyeColor)
            return
          }
          if (expression === 'stuck') {
            drawRotPixel(leftX + 1, y, eyeColor)
            drawRotPixel(rightX - 1, y, eyeColor)
            return
          }
          if (expression === 'curious') {
            drawRotPixel(leftX, y + 1, eyeColor)
            drawRotPixel(rightX, y - 1, eyeColor)
            return
          }
          drawRotPixel(leftX, y, eyeColor)
          drawRotPixel(rightX, y, eyeColor)
        }
        const drawExpressionMouth = (
          expression: PixelJellyExpression,
          mouthX: number,
          mouthY: number,
          chatter: number
        ): void => {
          if (chatter > 0) {
            const mouthWidth = 1 + Math.round(chatter * 2)
            const mouthHeight = 1 + Math.round(chatter)
            const m = rot(mouthX, mouthY)
            fillRect(m.x - Math.floor(mouthWidth / 2), m.y, mouthWidth, mouthHeight, eyeColor)
            return
          }
          if (expression === 'neutral') return
          if (expression === 'excited' || expression === 'proud') {
            drawRotLine(mouthX - 1, mouthY, mouthX + 1, mouthY, eyeColor)
            drawRotPixel(mouthX - 2, mouthY - 1, eyeColor)
            drawRotPixel(mouthX + 2, mouthY - 1, eyeColor)
            return
          }
          if (expression === 'surprised') {
            drawRotPixel(mouthX, mouthY, eyeColor)
            drawRotPixel(mouthX, mouthY + 1, eyeColor)
            return
          }
          if (expression === 'stuck') {
            drawRotLine(mouthX - 2, mouthY, mouthX + 2, mouthY, eyeColor)
            return
          }
          if (expression === 'sleepy') {
            drawRotLine(mouthX - 1, mouthY + 1, mouthX + 1, mouthY + 1, eyeColor)
            return
          }
          if (expression === 'focused') {
            drawRotPixel(mouthX, mouthY, eyeColor)
            return
          }
          drawRotLine(mouthX - 1, mouthY, mouthX + 1, mouthY, eyeColor)
        }

        if (hasSunglassesRef.current) {
          const lensRadius = 1
          const lensOffset = Math.round(clamp(frameCols * 0.16, 2, 3))
          const lensY = baseEyeY
          const leftLensX = baseEyeX - lensOffset
          const rightLensX = baseEyeX + lensOffset

          drawRotLine(
            leftLensX - lensRadius - 1,
            lensY,
            rightLensX + lensRadius + 1,
            lensY,
            SUNGLASSES_LENS_COLOR
          )
          drawRotLens(leftLensX, lensY, SUNGLASSES_LENS_COLOR)
          drawRotLens(rightLensX, lensY, SUNGLASSES_LENS_COLOR)
        } else if (dizzy) {
          const dashHalf = Math.max(1, Math.round(eyeOffset * 0.6))
          const dizzyEyeGap = Math.round(eyeOffset * 1.9)
          const dle = rot(baseEyeX - dizzyEyeGap, baseEyeY)
          const dre = rot(baseEyeX + dizzyEyeGap, baseEyeY)
          fillRect(dle.x - dashHalf, dle.y, dashHalf * 2 + 1, 1, eyeColor)
          fillRect(dre.x - dashHalf, dre.y, dashHalf * 2 + 1, 1, eyeColor)
        } else if (activeFace) {
          // 手绘表情有独立栅格，将眼睛行对齐身体眼睛行。
          const activeFaceEyeY = Math.max(2, Math.round(activeFace.rows * eyeT))
          const activeFaceTop = baseEyeY - activeFaceEyeY
          drawCanvasCells(activeFace, centerX, activeFaceTop, angle, { pivotYOverride: pivotY })
        } else {
          drawExpressionEyes(
            expressionRef.current,
            baseEyeX - eyeOffset,
            baseEyeX + eyeOffset,
            baseEyeY
          )
        }

        const talkProgress = actionAmount(state.actions.talk, now)
        if (!dizzy && !activeFace && !isEdgeHoverPoseActive()) {
          const chatter = Math.abs(Math.sin(talkProgress * Math.PI * 5))
          const expression = expressionRef.current
          if (talkProgress > 0 || expression !== 'neutral') {
            drawExpressionMouth(
              expression,
              centerX + eyeCounterX,
              eyeY + 2 + eyeCounterY,
              talkProgress > 0 ? chatter : 0
            )
          }
        }
      }

      const resolveColorWaveRow = (
        row: number,
        height: number,
        fallbackColor: number,
        now: number
      ): number => {
        const colorWaveProgress = isEdgeHoverPoseActive()
          ? 0
          : actionAmount(state.actions.colorWave, now)
        const colorWaveHead = colorWaveProgress * (height + COLOR_WAVE_COLORS.length + 2)
        const waveIndex = Math.floor(colorWaveHead - row)
        return colorWaveProgress > 0 && waveIndex >= 0 && waveIndex < COLOR_WAVE_COLORS.length
          ? COLOR_WAVE_COLORS[waveIndex]
          : fallbackColor
      }

      /** 绘制手绘身体及共用表情图层，并保持相同倾斜姿态。 */
      const renderCustomBell = (body: PixelBellCanvas, eyeColor: number, now: number): void => {
        const centerX = Math.round(state.jelly.x)
        const top = Math.round(state.jelly.y - body.rows * 0.58)
        const angle = (state.deform.lean || 0) + gestureTilt + dizzyTilt + edgeTilt()
        drawCanvasCells(body, centerX, top, angle, {
          rowColor: (row, baseColor) => resolveColorWaveRow(row, body.rows, baseColor, now),
        })
        drawFaceLayer({
          centerX,
          top,
          frameCols: body.cols,
          frameRows: body.rows,
          angle,
          dragX: 0,
          dragY: 0,
          grabX: 0,
          grabRowT: 0.5,
          eyeColor,
          now,
        })
      }

      const drawBell = (bodyColor: number, eyeColor: number, now: number): void => {
        const { bell, customBell } = activeSettings()
        const { x, y } = state.jelly
        if (customBell) {
          renderCustomBell(trimPixelBellCanvasToContent(customBell), eyeColor, now)
          return
        }
        const { cols: bodyWidth, rows: bodyHeight } = effectiveBellCells()
        const dragX = clamp(state.deform.x, -4, 4)
        const dragY = clamp(state.deform.y, -3, 3)
        const grabX = clamp(state.deform.grabX || 0, -1, 1)
        const grabY = clamp(state.deform.grabY || 0, -1, 1)
        const activeHeight = Math.max(3, bodyHeight + Math.round(clamp(-dragY, -1, 1)))
        const topWidth = clamp(odd(toGrid(bell.topWidth)), 3, bodyWidth)
        // roundness 与 squash 已按像素格计量。
        const corner = Math.max(1, Math.round(bell.roundness))
        const maxBottomInset = Math.round(bell.squash)
        const top = Math.round(y - activeHeight * 0.58)
        const widthBoost = Math.round(
          Math.min(3, Math.abs(dragX) * 0.75 + Math.max(0, dragY) * 0.65)
        )
        const centerX = Math.round(x)
        const grabRowT = clamp(0.5 + grabY * 0.5, 0, 1)
        const rowLeft = new Array<number>(activeHeight)
        const rowRight = new Array<number>(activeHeight)
        const rowColor = new Array<number>(activeHeight)

        for (let row = 0; row < activeHeight; row += 1) {
          const lowerT = row / Math.max(1, activeHeight - 1)
          const rowGrip = clamp(1 - Math.abs(lowerT - grabRowT) * 1.65, 0, 1)
          const rowShift = Math.round(
            dragX * (0.18 - lowerT * 0.28) + dragX * rowGrip * (0.42 + Math.abs(grabX) * 0.36)
          )

          const shapeWidth = getPixelJellyfishBellShapeWidth(
            bell.shape,
            row,
            activeHeight,
            topWidth,
            bodyWidth,
            corner
          )
          const bottomInset =
            lowerT > 0.45 ? Math.round(((lowerT - 0.45) / 0.55) * maxBottomInset) : 0
          const rawRowWidth = shapeWidth - bottomInset * 2 + widthBoost * (1 - lowerT * 0.4)
          const rowWidth = Math.max(3, odd(rawRowWidth))
          const edgePull = Math.round(dragX * Math.abs(grabX) * rowGrip * 0.36)
          let left = centerX - Math.floor(rowWidth / 2) + rowShift
          let right = centerX + Math.floor(rowWidth / 2) + 1 + rowShift

          if (grabX < -0.2) {
            left += edgePull
          } else if (grabX > 0.2) {
            right += edgePull
          }

          if (right - left < 3) {
            if (grabX < 0) left = right - 3
            else right = left + 3
          }

          rowColor[row] = resolveColorWaveRow(row, activeHeight, bodyColor, now)
          rowLeft[row] = left
          rowRight[row] = right
        }

        const angle = (state.deform.lean || 0) + gestureTilt + dizzyTilt + edgeTilt()
        const cosA = Math.cos(angle)
        const sinA = Math.sin(angle)
        const pivotX = centerX
        const pivotY = top + (activeHeight - 1)

        if (Math.abs(angle) < 0.01) {
          for (let row = 0; row < activeHeight; row += 1) {
            fillRect(rowLeft[row], top + row, rowRight[row] - rowLeft[row], 1, rowColor[row])
          }
        } else {
          let minX = Infinity
          let maxX = -Infinity
          let minY = Infinity
          let maxY = -Infinity

          for (let row = 0; row < activeHeight; row += 1) {
            const gy = top + row
            for (let c = 0; c < 2; c += 1) {
              const ox = (c === 0 ? rowLeft[row] : rowRight[row] - 1) - pivotX
              const oy = gy - pivotY
              const rx = pivotX + ox * cosA - oy * sinA
              const ry = pivotY + ox * sinA + oy * cosA
              minX = Math.min(minX, rx)
              maxX = Math.max(maxX, rx)
              minY = Math.min(minY, ry)
              maxY = Math.max(maxY, ry)
            }
          }

          const x0 = clamp(Math.floor(minX) - 1, 0, cols)
          const x1 = clamp(Math.ceil(maxX) + 1, 0, cols)
          const y0 = clamp(Math.floor(minY) - 1, 0, rows)
          const y1 = clamp(Math.ceil(maxY) + 1, 0, rows)

          for (let dy = y0; dy < y1; dy += 1) {
            const offY = dy - pivotY
            const rowOff = dy * cols
            for (let dx = x0; dx < x1; dx += 1) {
              const ox = dx - pivotX
              const sx = pivotX + ox * cosA + offY * sinA
              const sy = pivotY - ox * sinA + offY * cosA
              const row = Math.round(sy) - top
              if (row < 0 || row >= activeHeight) continue
              const sxi = Math.round(sx)
              if (sxi >= rowLeft[row] && sxi < rowRight[row]) {
                buf32[rowOff + dx] = rowColor[row]
                recordHeadBounds(dx, dy, dx + 1, dy + 1)
              }
            }
          }
        }

        drawFaceLayer({
          centerX,
          top,
          frameCols: bodyWidth,
          frameRows: activeHeight,
          angle,
          dragX,
          dragY,
          grabX,
          grabRowT,
          eyeColor,
          now,
        })
      }

      const triggerGesture = (side?: number): void => {
        const now = Date.now()
        const gestureSide = side ?? state.nextTentacleSide
        if (side === undefined) {
          state.nextTentacleSide = -gestureSide
        }
        state.actions.tentacle = { start: now, duration: 1300, side: gestureSide }
        state.actions.talk = { start: now, duration: 1200 }
        state.actions.colorWave = { start: now, duration: 760 }
      }

      const updateDizzyMotion = (deltaX: number, deltaY: number, now: number): void => {
        const motion = state.dragMotion
        const idleMs = motion.lastSampleAt > 0 ? now - motion.lastSampleAt : 0
        if (idleMs > DIZZY_TURN_WINDOW_MS) {
          motion.lastDirX = 0
          motion.lastDirY = 0
          motion.sharpTurns = 0
        }

        const distance = Math.hypot(deltaX, deltaY)
        const elapsedMs = motion.lastSampleAt > 0 ? Math.max(16, now - motion.lastSampleAt) : 16
        motion.lastSampleAt = now

        if (distance < DIZZY_MIN_SAMPLE_DISTANCE || distance / elapsedMs < DIZZY_MIN_SPEED) {
          if (now - motion.lastTurnAt > DIZZY_TURN_WINDOW_MS) {
            motion.sharpTurns = 0
          }
          return
        }

        const dirX = deltaX / distance
        const dirY = deltaY / distance

        if (motion.lastDirX !== 0 || motion.lastDirY !== 0) {
          const dot = dirX * motion.lastDirX + dirY * motion.lastDirY
          if (dot <= DIZZY_TURN_DOT_MAX) {
            motion.sharpTurns =
              now - motion.lastTurnAt <= DIZZY_TURN_WINDOW_MS ? motion.sharpTurns + 1 : 1
            motion.lastTurnAt = now
          } else if (now - motion.lastTurnAt > DIZZY_TURN_WINDOW_MS) {
            motion.sharpTurns = 0
          }
        }

        motion.lastDirX = dirX
        motion.lastDirY = dirY

        if (
          motion.sharpTurns >= DIZZY_TURN_COUNT &&
          now - motion.lastDizzyAt > DIZZY_COOLDOWN_MS &&
          actionAmount(state.actions.dizzy, now) === 0
        ) {
          motion.lastDizzyAt = now
          motion.sharpTurns = 0
          state.actions.dizzy = { start: now, duration: DIZZY_DURATION }
        }
      }

      const drawCamera = (now: number): void => {
        const cap = state.actions.capture
        const elapsed = now - cap.start
        if (elapsed < 0 || elapsed > cap.duration) return
        const t = elapsed / cap.duration

        // 相机逐行越过固定出口线弹出，短暂保持后回落；lift 从完全隐藏过渡到完全露出。
        const easeOutBack = (x: number): number => {
          const c1 = 2.2
          return 1 + (c1 + 1) * (x - 1) ** 3 + c1 * (x - 1) ** 2
        }
        const lift = t < 0.45 ? easeOutBack(t / 0.45) : t < 0.72 ? 1 : 1 - smooth((t - 0.72) / 0.28)
        if (lift <= 0) return

        const bodyH = Math.max(3, Math.round(effectiveBellCells().rows))
        // 上升同时向外倾斜，回落时反向恢复。
        const angle = cap.angle * lift
        const cosI = Math.cos(-angle)
        const sinI = Math.sin(-angle)
        const halfW = CAMERA_W / 2
        const halfH = CAMERA_H / 2
        const reach = Math.ceil(Math.hypot(halfW, halfH)) + 1

        // 仅绘制出口线上方的格子，并对齐整行，保持逐格弹出效果。
        const slotLine = Math.round(state.jelly.y + bodyH)
        const cx = Math.round(state.jelly.x + cap.dx * lift)
        const cy = Math.round(slotLine + halfH - lift * (2 * halfH + 1 + cap.dy))

        const gy0 = Math.max(0, Math.floor(cy - reach))
        const gy1 = Math.min(rows - 1, Math.min(slotLine - 1, Math.ceil(cy + reach)))
        const gx0 = Math.max(0, Math.floor(cx - reach))
        const gx1 = Math.min(cols - 1, Math.ceil(cx + reach))
        for (let gy = gy0; gy <= gy1; gy += 1) {
          for (let gx = gx0; gx <= gx1; gx += 1) {
            const ox = gx + 0.5 - cx
            const oy = gy + 0.5 - cy
            const col = Math.floor(ox * cosI - oy * sinI + halfW)
            const row = Math.floor(ox * sinI + oy * cosI + halfH)
            if (col < 0 || col >= CAMERA_W || row < 0 || row >= CAMERA_H) continue
            const color = CAMERA_CELLS[row * CAMERA_W + col]
            if (color !== 0) buf32[gy * cols + gx] = color
          }
        }

        // 相机完全露出后，镜头闪烁两次。
        if (lift > 0.95 && ((t > 0.45 && t < 0.51) || (t > 0.56 && t < 0.62))) {
          const cosF = Math.cos(angle)
          const sinF = Math.sin(angle)
          const lx = cx + CAMERA_LENS_OFFSET_X * cosF - CAMERA_LENS_OFFSET_Y * sinF
          const ly = cy + CAMERA_LENS_OFFSET_X * sinF + CAMERA_LENS_OFFSET_Y * cosF
          for (let dy = -1; dy <= 1; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
              const px = Math.round(lx + dx)
              const py = Math.round(ly + dy)
              if (px >= 0 && px < cols && py >= 0 && py < rows && py < slotLine) {
                buf32[py * cols + px] = CAMERA_FLASH_COLOR
              }
            }
          }
        }
      }

      const step = (): void => {
        const { bell, tentacles, eyeBgColor } = activeSettings()
        time += 1
        const now = Date.now()
        state.deform.x *= 0.86
        state.deform.y *= 0.86
        state.deform.grabX *= 0.9
        state.deform.grabY *= 0.9
        if (Math.abs(state.deform.x) < 0.02) state.deform.x = 0
        if (Math.abs(state.deform.y) < 0.02) state.deform.y = 0
        if (Math.abs(state.deform.grabX) < 0.02) state.deform.grabX = 0
        if (Math.abs(state.deform.grabY) < 0.02) state.deform.grabY = 0

        const dockDirection = edgeDirection()
        const hoverTarget = dockDirection !== 0 && isHoveredRef.current ? 1 : 0
        state.edgePose.direction += (dockDirection - state.edgePose.direction) * EDGE_POSE_EASE
        state.edgePose.hover += (hoverTarget - state.edgePose.hover) * EDGE_POSE_HOVER_EASE
        if (Math.abs(dockDirection - state.edgePose.direction) < 0.01) {
          state.edgePose.direction = dockDirection
        }
        if (Math.abs(hoverTarget - state.edgePose.hover) < 0.01) {
          state.edgePose.hover = hoverTarget
        }
        applyJellyPose(false)

        const vx = state.jelly.x - prevJellyX + windowDragVelocityX
        prevJellyX = state.jelly.x
        windowDragVelocityX *= 0.68

        const leanTarget = clamp(vx * LEAN_DRIVE, -LEAN_MAX, LEAN_MAX)
        state.deform.leanV += (leanTarget - state.deform.lean) * LEAN_STIFFNESS
        state.deform.leanV *= LEAN_DAMPING
        state.deform.lean += state.deform.leanV
        if (
          Math.abs(state.deform.leanV) < 0.0005 &&
          Math.abs(leanTarget - state.deform.lean) < 0.0005
        ) {
          state.deform.lean = leanTarget
          state.deform.leanV = 0
        }

        const dizzyElapsed = now - state.actions.dizzy.start
        const dizzyActive = dizzyElapsed >= 0 && dizzyElapsed < state.actions.dizzy.duration
        const dizzyProgress = dizzyActive ? dizzyElapsed / state.actions.dizzy.duration : 1
        dizzyTilt = dizzyActive
          ? Math.sin(now * DIZZY_WOBBLE_SPEED) * DIZZY_WOBBLE * (1 - dizzyProgress)
          : 0

        const bellColor = hexToUint32(bell.color)
        const tentacleColor = hexToUint32(tentacles.color)
        const eyeColor = hexToUint32(eyeBgColor)
        buf32.fill(0)
        frameMinX = state.jelly.x
        frameMaxX = state.jelly.x

        const tentacleAction = state.actions.tentacle
        const tentacleProgress = actionAmount(tentacleAction, now)
        const tentacleMove =
          tentacleProgress > 0 ? tentacleGesture(tentacleProgress) : { outward: 0, lift: 0 }
        gestureTilt =
          tentacleProgress > 0
            ? (tentacleAction.side || 1) * tentacleMove.outward * GESTURE_TILT
            : 0

        for (let r = 0; r < state.ropes.length; r += 1) {
          const rope = state.ropes[r]
          const anchor = resolveAnchor(r)
          const points = rope.points
          points[0].x = anchor.x
          points[0].y = anchor.y
          points[0].ox = anchor.x
          points[0].oy = anchor.y

          for (let i = 1; i < points.length; i += 1) {
            const pt = points[i]
            const vxPoint = (pt.x - pt.ox) * tentacles.friction
            const vyPoint = (pt.y - pt.oy) * tentacles.friction
            pt.ox = pt.x
            pt.oy = pt.y

            const sideDir = rope.side < 0 ? -1 : 1
            const mirrored = Math.abs(rope.side)
            const tailT = i / Math.max(1, points.length - 1)
            const drift =
              Math.sin(time * 0.026 + i * 0.6 + rope.phase) * toGrid(tentacles.wind) * sideDir
            const sway =
              Math.cos(time * 0.018 + mirrored * 0.5 + i * 0.11) *
              toGrid(tentacles.wind) *
              0.44 *
              sideDir
            // 卷曲波的振幅与频率随 curl 增大，并在触手末端增强。
            const curlBend =
              Math.sin(time * 0.03 + i * (0.6 + tentacles.curl * 7) + rope.phase) *
              toGrid(tentacles.curl) *
              1.7 *
              tailT *
              sideDir
            const generatingSway = sampleGeneratingSway(
              now,
              rope.phase,
              tailT,
              generatingRef.current,
              reducedMotionRef.current
            )
            pt.x += vxPoint + drift + sway + curlBend + generatingSway
            pt.y += vyPoint + toGrid(tentacles.gravity)

            const dxm = pt.x - state.mouse.x
            const dym = pt.y - state.mouse.y
            const md2 = dxm * dxm + dym * dym
            const repelRadius = toGrid(MOUSE_REPEL_RADIUS)
            const stirRadius = toGrid(MOUSE_STIR_RADIUS)
            if (state.mouse.active && md2 < stirRadius * stirRadius && md2 > 0.01) {
              const md = Math.sqrt(md2)
              const unitX = dxm / md
              const unitY = dym / md
              const mouseForce = toGrid(tentacles.mouseForce)

              if (md < repelRadius) {
                const repelForce = smooth(1 - md / repelRadius) * mouseForce
                pt.x += unitX * repelForce
                pt.y += unitY * repelForce
              }

              const wake = smooth(1 - md / stirRadius)
              const stirPhase = time * MOUSE_STIR_SPEED + rope.phase * 1.7 + i * 0.73
              const tailWeight = 0.28 + tailT * 0.72
              const swirl = Math.sin(stirPhase) * mouseForce * MOUSE_STIR_SWIRL * wake * tailWeight
              const pulse =
                Math.cos(stirPhase * 0.73 + rope.side * 2.1) *
                mouseForce *
                MOUSE_STIR_PULSE *
                wake *
                tailT

              pt.x += -unitY * swirl + unitX * pulse
              pt.y += unitX * swirl + unitY * pulse * 0.45
            }
          }

          for (let pass = 0; pass < 3; pass += 1) {
            for (let i = 1; i < points.length; i += 1) {
              const a = points[i - 1]
              const b = points[i]
              const dx = b.x - a.x
              const dy = b.y - a.y
              const dist = Math.hypot(dx, dy) || 1
              const diff = (dist - toGrid(tentacles.gap)) / dist
              const ox = dx * diff * 0.5 * tentacles.tension
              const oy = dy * diff * 0.5 * tentacles.tension
              if (i > 1) {
                a.x += ox
                a.y += oy
              }
              b.x -= ox
              b.y -= oy
            }
          }

          const beadSize = Math.max(1, Math.round(tentacles.beadSize))
          for (let i = 1; i < points.length; i += 1) {
            const pt = points[i]
            let drawX = pt.x
            let drawY = pt.y
            const gestureSide = tentacleAction.side || 1
            const edgeWaveSide = Math.sign(state.edgePose.direction)
            const isGestureSide = gestureSide > 0 ? rope.side > 0.45 : rope.side < -0.45
            const isEdgeWaveSide =
              edgeWaveSide > 0 ? rope.side > 0.45 : edgeWaveSide < 0 && rope.side < -0.45
            const edgeWaveAmount = isEdgeWaveSide ? state.edgePose.hover : 0

            if (
              ((tentacleMove.outward > 0 || tentacleMove.lift > 0) && isGestureSide) ||
              edgeWaveAmount > 0
            ) {
              const tailT = i / Math.max(1, points.length - 1)
              const bendWeight = Math.pow(tailT, 1.7)
              const liftWeight = Math.pow(tailT, 1.15)
              const bellHeight = effectiveBellCells().rows
              const topMiddleY = state.jelly.y - bellHeight * 0.18
              const restingTipY = anchor.y + (points.length - 1) * toGrid(tentacles.gap)
              const liftTarget = Math.max(4, restingTipY - topMiddleY)
              const outwardTarget = clamp(toGrid(tentacles.spread) * 0.22, 3, 7)

              if (isGestureSide) {
                drawX += bendWeight * tentacleMove.outward * outwardTarget * gestureSide
                drawY -= liftWeight * tentacleMove.lift * liftTarget
              }

              if (edgeWaveAmount > 0) {
                const primaryWave = Math.sin(
                  now * EDGE_WAVE_SPEED + rope.phase * 0.7 + tailT * EDGE_WAVE_TAIL_PHASE
                )
                const secondaryWave =
                  Math.sin(now * EDGE_WAVE_SPEED * 0.63 + rope.phase * 1.3 + tailT * 2.9) * 0.35
                const wave = primaryWave + secondaryWave
                const arcWeight = Math.pow(tailT, 0.7)
                const arcAngle =
                  -edgeWaveSide *
                  (EDGE_WAVE_ARC_RAISE + wave * EDGE_WAVE_ARC_SWING) *
                  edgeWaveAmount *
                  arcWeight
                const rootX = anchor.x
                const rootY = anchor.y
                const armX = drawX - rootX
                const armY = drawY - rootY
                const cosA = Math.cos(arcAngle)
                const sinA = Math.sin(arcAngle)
                const rotatedX = rootX + armX * cosA - armY * sinA
                const rotatedY = rootY + armX * sinA + armY * cosA

                drawX =
                  rotatedX +
                  bendWeight * outwardTarget * EDGE_WAVE_ARC_DRIFT * edgeWaveSide * edgeWaveAmount
                drawY = rotatedY - liftWeight * EDGE_WAVE_TIP_LIFT * edgeWaveAmount
              }
            }

            fillRect(drawX - beadSize / 2, drawY - beadSize / 2, beadSize, beadSize, tentacleColor)
          }
        }

        headBounds = null
        drawingHead = true
        drawBell(bellColor, eyeColor, now)
        drawingHead = false
        drawCamera(now)
        ctx.putImageData(imgData, 0, 0)

        // 以窗口中心计算半宽，覆盖停靠屏幕边缘时向内探出的身体。
        const windowCenterX = cols / 2
        const halfWidth =
          Math.max(windowCenterX - frameMinX, frameMaxX - windowCenterX) * activePixelSize()
        onExtentsRef.current?.(halfWidth)
      }

      runtimeRef.current = {
        getHeadBounds: () => {
          if (!headBounds || cols <= 0 || rows <= 0) return null
          const rect = canvas.getBoundingClientRect()
          const scaleX = rect.width / cols
          const scaleY = rect.height / rows
          return new DOMRect(
            rect.left + headBounds.left * scaleX,
            rect.top + headBounds.top * scaleY,
            (headBounds.right - headBounds.left) * scaleX,
            (headBounds.bottom - headBounds.top) * scaleY
          )
        },
        setMousePosition: (clientX, clientY) => {
          const rect = canvas.getBoundingClientRect()
          const cellSize = activePixelSize()
          state.mouse = {
            x: (clientX - rect.left) / cellSize,
            y: (clientY - rect.top) / cellSize,
            active: true,
          }
        },
        clearMouse: () => {
          state.mouse.active = false
        },
        refreshLayout: () => {
          if (cols <= 0 || rows <= 0) return
          positionJelly()
          prevJellyX = state.jelly.x
          makeRopes()
        },
        refreshCanvas: () => {
          resize()
          makeRopes()
        },
        // 触手以伞盖中心为原点导出，另一块画布无论尺寸如何都能原样接上。
        exportMotion: () => ({
          ropes: state.ropes.map((rope) => ({
            phase: rope.phase,
            side: rope.side,
            points: rope.points.map((point) => ({
              x: point.x - state.jelly.x,
              y: point.y - state.jelly.y,
              ox: point.ox - state.jelly.x,
              oy: point.oy - state.jelly.y,
            })),
          })),
          deform: { ...state.deform },
          time,
          dragVelocityX: windowDragVelocityX,
        }),
        importMotion: (snapshot) => {
          const { count, segments } = activeSettings().tentacles
          if (
            snapshot.ropes.length !== count ||
            snapshot.ropes.some((rope) => rope.points.length !== segments)
          ) {
            return
          }
          state.ropes = snapshot.ropes.map((rope) => ({
            phase: rope.phase,
            side: rope.side,
            points: rope.points.map((point) => ({
              x: point.x + state.jelly.x,
              y: point.y + state.jelly.y,
              ox: point.ox + state.jelly.x,
              oy: point.oy + state.jelly.y,
            })),
          }))
          state.deform = { ...snapshot.deform }
          time = snapshot.time
          windowDragVelocityX = snapshot.dragVelocityX
          prevJellyX = state.jelly.x
        },
        recordDragMotion: (deltaX, deltaY) => {
          const cellSize = activePixelSize()
          const moveX = clamp(deltaX / cellSize, -6, 6)
          const moveY = clamp(deltaY / cellSize, -6, 6)
          const speed = Math.hypot(moveX, moveY)
          const now = Date.now()

          updateDizzyMotion(deltaX, deltaY, now)
          windowDragVelocityX += moveX
          state.deform.x += moveX * 0.85
          state.deform.y += moveY * 0.62
          state.deform.grabX = clamp(moveX * 0.22, -1, 1)
          state.deform.grabY = clamp(moveY * 0.22, -1, 1)

          if (speed > 0.2 && now - state.actions.colorWave.start > 220) {
            state.actions.colorWave = { start: now, duration: 760 }
          }

          for (const rope of state.ropes) {
            const points = rope.points
            for (let i = 1; i < points.length; i += 1) {
              const tailT = i / Math.max(1, points.length - 1)
              points[i].x -= moveX * 0.36 * tailT
              points[i].y -= moveY * 0.16 * tailT
            }
          }
        },
        triggerFeed: () => {
          triggerGesture()
        },
        triggerCapture: () => {
          const now = Date.now()
          const side = Math.random() < 0.5 ? -1 : 1
          // 随机选择相机弹出时的角度、水平偏移和抬升高度。
          const angle = side * (0.1 + Math.random() * 0.32)
          const dx = side * (1 + Math.random() * 4)
          const dy = Math.random() * 3.5
          state.actions.capture = { start: now, duration: CAMERA_DURATION_MS, side, angle, dx, dy }
          // 仅抬起同侧触手托住相机。
          state.actions.tentacle = { start: now, duration: 1100, side }
        },
      }

      resize()
      const observer = new ResizeObserver(resize)
      observer.observe(canvas)
      const stopAnimation = startPixelAnimationLoop(step)

      return () => {
        stopAnimation()
        observer.disconnect()
        runtimeRef.current = null
      }
    }, [])

    const handleMouseMove = (event: MouseEvent<HTMLDivElement>): void => {
      runtimeRef.current?.setMousePosition(event.clientX, event.clientY)
    }

    const handleMouseLeave = (): void => {
      runtimeRef.current?.clearMouse()
    }

    return (
      <div
        style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        aria-hidden="true"
      >
        <canvas
          ref={canvasRef}
          className={isGenerating ? 'select-none pixel-jelly-generating' : 'select-none'}
          style={
            {
              '--jelly-breath-period': `${GENERATING_BREATH_PERIOD_MS}ms`,
              width: '100%',
              height: '100%',
              imageRendering: 'pixelated',
              overflow: 'visible',
              pointerEvents: 'none',
            } as React.CSSProperties
          }
        />
      </div>
    )
  }
)
