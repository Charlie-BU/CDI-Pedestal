/** 为建议生成提供轻微触须驱动力，不移动身体或窗口。 */

/** 呼吸与触须使用同一呼吸周期。 */
export const GENERATING_BREATH_PERIOD_MS = 1600

/** 返回像素格单位的轻摆力；停止和减少动态效果时不增加驱动力。 */
export function sampleGeneratingSway(
  elapsedMs: number,
  phase: number,
  tail: number,
  generating: boolean,
  reducedMotion: boolean
): number {
  if (!generating || reducedMotion) return 0
  return Math.sin((elapsedMs * Math.PI * 2) / GENERATING_BREATH_PERIOD_MS + phase) * 0.035 * tail
}
