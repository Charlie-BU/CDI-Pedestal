/** 调度像素头像的固定帧率绘制，隐藏时释放动画回调，恢复时不补跑积压帧。 */

/** 像素动画的物理步长以每秒 60 次更新为基准。 */
export const PIXEL_ANIMATION_FRAMES_PER_SECOND = 60

/** 启动头像绘制并返回释放动画帧与可见性订阅的函数。 */
export function startPixelAnimationLoop(draw: () => void): () => void {
  const frameDuration = 1000 / PIXEL_ANIMATION_FRAMES_PER_SECOND
  let frame: number | undefined
  let lastFrameIndex: number | undefined
  let disposed = false

  /** 将显示器时间映射到物理帧，避免浮点误差让 60 Hz 回调误跳帧。 */
  const tick = (now: number): void => {
    frame = undefined
    if (disposed || document.hidden) return
    const frameIndex = Math.round(now / frameDuration)
    if (frameIndex !== lastFrameIndex) {
      lastFrameIndex = frameIndex
      draw()
    }
    if (!disposed && !document.hidden) frame = requestAnimationFrame(tick)
  }

  /** 隐藏后取消待执行帧，恢复时从当前时刻重新开始。 */
  const syncVisibility = (): void => {
    if (frame !== undefined) cancelAnimationFrame(frame)
    frame = undefined
    lastFrameIndex = undefined
    if (!disposed && !document.hidden) frame = requestAnimationFrame(tick)
  }

  document.addEventListener('visibilitychange', syncVisibility)
  syncVisibility()
  return () => {
    disposed = true
    if (frame !== undefined) cancelAnimationFrame(frame)
    document.removeEventListener('visibilitychange', syncVisibility)
  }
}
