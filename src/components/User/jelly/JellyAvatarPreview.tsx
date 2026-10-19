/** 名片预览复用浮窗的完整画布与像素比例，只对最终画面等比缩放。 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  DEFAULT_FLOATING_AVATAR_APPEARANCE,
  getEffectivePixelSize,
  getFloatingAvatarWindowMetrics,
  getPixelJellyScale,
  scalePixelJellyGeometry,
  type PixelJellyfishSettings,
} from './appearance'
import { pixelContentBounds } from './content-bounds'
import { PixelJellyAvatar } from './PixelJellyAvatar'

/** JellyAvatarPreviewProps 是名片预览的输入。 */
interface JellyAvatarPreviewProps {
  settings: PixelJellyfishSettings
  /** 水母可见包络占宿主的比例；包络含触手摆动余量，大于 1 时身体仍落在宿主内。 */
  fill?: number
  centerVisible?: boolean
}

/** JellyAvatarPreview 在宿主范围内完整展示保存的形象及表情。 */
export function JellyAvatarPreview({ settings, fill = 0.9, centerVisible = false }: JellyAvatarPreviewProps) {
  const host = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState(1)
  const [center, setCenter] = useState({ x: 0, y: 0 })
  const metrics = useMemo(
    () =>
      getFloatingAvatarWindowMetrics({
        ...DEFAULT_FLOATING_AVATAR_APPEARANCE,
        pixel: settings,
      }),
    [settings]
  )
  const renderSettings = useMemo(
    () => scalePixelJellyGeometry(settings, getPixelJellyScale(settings)),
    [settings]
  )
  useLayoutEffect(() => {
    const element = host.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      // 按水母真正占用的可见区域缩放，留一点边距，不按整个浮窗盒子算。
      setFit(
        Math.min(
          entry.contentRect.width / metrics.visualWidth,
          entry.contentRect.height / metrics.visualHeight
        ) * fill
      )
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [metrics.visualWidth, metrics.visualHeight, fill])
  // 头像按可见像素居中；只在挂载/尺寸/配置变化后的短暂稳定期校准，保留后续自然动画。
  useLayoutEffect(() => {
    if (!centerVisible) return;
    const element = host.current;
    if (!element) return;
    let frame = 0, attempts = 0;
    setCenter({ x: 0, y: 0 });
    const align = () => {
      const canvas = element.querySelector('canvas');
      if (canvas?.width && canvas.height) {
        const context = canvas.getContext('2d');
        if (context) {
          const bounds = pixelContentBounds(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
          if (bounds) {
            const source = canvas.getBoundingClientRect(), target = element.getBoundingClientRect();
            const dx = target.x + target.width / 2 - (source.x + (bounds.left + bounds.right) / 2 * source.width / canvas.width);
            const dy = target.y + target.height / 2 - (source.y + (bounds.top + bounds.bottom) / 2 * source.height / canvas.height);
            setCenter(old => Math.abs(dx) < 0.25 && Math.abs(dy) < 0.25 ? old : { x: old.x + dx, y: old.y + dy });
          }
        }
      }
      if (++attempts < 30) frame = requestAnimationFrame(align);
    };
    frame = requestAnimationFrame(align);
    return () => cancelAnimationFrame(frame);
  }, [centerVisible, settings, fit]);
  // 浮窗盒子底部留有停靠间隙，水母在盒子里偏上；把盒子整体下移半个差值，让水母落在宿主中心。
  const centerOffsetY = ((metrics.dockHeight - metrics.visualHeight) / 2) * fit
  return (
    <div ref={host} style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
      <div
        
        style={{
          flexShrink: 0,
          width: metrics.windowWidth,
          height: metrics.dockHeight,
          transform: `translate(${centerVisible ? center.x : 0}px, ${centerOffsetY + (centerVisible ? center.y : 0)}px) scale(${fit})`,
        }}
      >
        <PixelJellyAvatar
          settings={renderSettings}
          pixelSize={getEffectivePixelSize(settings)}
          isMunching={false}
          expression={settings.expression}
        />
      </div>
    </div>
  )
}
