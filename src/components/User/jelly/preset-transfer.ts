/** Client preset transfer/selection rules, copied from useFloatingAvatarAppearanceController.ts. */
import { DEFAULT_FLOATING_AVATAR_APPEARANCE, normalizeFloatingAvatarAppearance, normalizeFloatingAvatarAppearancePreset, type FloatingAvatarAppearance, type FloatingAvatarAppearancePreset, type PixelDrawnFace, type PixelJellyfishSettings } from './appearance';
const AVATAR_APPEARANCE_PRESET_TRANSFER_TYPE = 'airjelly.floating-avatar-presets';
const AVATAR_APPEARANCE_PRESET_TRANSFER_SCHEMA_VERSION = 1;
type AvatarAppearancePreset = FloatingAvatarAppearancePreset;
type AvatarAppearancePresetTransferFile = { type: typeof AVATAR_APPEARANCE_PRESET_TRANSFER_TYPE; schemaVersion: 1; exportedAt: string; presets: AvatarAppearancePreset[]; customFaces: PixelDrawnFace[] };
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
export function normalizeAvatarAppearancePresetAppearance(
  appearance: unknown
): FloatingAvatarAppearance {
  const normalized = normalizeFloatingAvatarAppearance(appearance)
  return {
    ...normalized,
    pixel: {
      ...normalized.pixel,
      customFaces: [],
      activeCustomFaceId: null,
    },
  }
}

export function mergeAvatarAppearancePresetSelection(
  current: FloatingAvatarAppearance,
  presetAppearance: FloatingAvatarAppearance,
  presetActiveCustomFaceId: string | null = null
): FloatingAvatarAppearance {
  const normalizedCurrent = normalizeFloatingAvatarAppearance(current)
  const normalizedPreset = normalizeAvatarAppearancePresetAppearance(presetAppearance)
  const activeCustomFaceId =
    presetActiveCustomFaceId &&
    normalizedCurrent.pixel.customFaces.some((face) => face.id === presetActiveCustomFaceId)
      ? presetActiveCustomFaceId
      : null

  return normalizeFloatingAvatarAppearance({
    ...normalizedPreset,
    pixel: {
      ...normalizedPreset.pixel,
      customFaces: normalizedCurrent.pixel.customFaces,
      activeCustomFaceId,
    },
  })
}

/** getAvatarAppearancePresetPreviewPixel 把预设引用的自绘表情从当前表情库补回，供缩略图渲染。 */
export function getAvatarAppearancePresetPreviewPixel(
  preset: AvatarAppearancePreset,
  customFaces: PixelDrawnFace[]
): PixelJellyfishSettings {
  const presetFace = preset.activeCustomFaceId
    ? customFaces.find((face) => face.id === preset.activeCustomFaceId)
    : null
  if (!presetFace) return preset.appearance.pixel

  return {
    ...preset.appearance.pixel,
    customFaces: [presetFace],
    activeCustomFaceId: presetFace.id,
  }
}

function normalizeAvatarAppearancePreset(value: unknown): AvatarAppearancePreset | null {
  const normalized = normalizeFloatingAvatarAppearancePreset(value)
  if (!normalized) return null

  return {
    ...normalized,
    appearance: normalizeAvatarAppearancePresetAppearance(normalized.appearance),
  }
}

function normalizeAvatarAppearancePresets(value: unknown): AvatarAppearancePreset[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const preset = normalizeAvatarAppearancePreset(item)
    return preset ? [preset] : []
  })
}

function normalizeAvatarAppearancePresetFaces(value: unknown): PixelDrawnFace[] {
  return normalizeFloatingAvatarAppearance({
    ...DEFAULT_FLOATING_AVATAR_APPEARANCE,
    pixel: {
      ...DEFAULT_FLOATING_AVATAR_APPEARANCE.pixel,
      customFaces: value,
      activeCustomFaceId: null,
    },
  }).pixel.customFaces
}

export function parseAvatarAppearancePresetTransferFile(
  value: unknown
): AvatarAppearancePresetTransferFile {
  if (
    !isRecord(value) ||
    value.type !== AVATAR_APPEARANCE_PRESET_TRANSFER_TYPE ||
    value.schemaVersion !== AVATAR_APPEARANCE_PRESET_TRANSFER_SCHEMA_VERSION ||
    !Array.isArray(value.presets) ||
    !Array.isArray(value.customFaces)
  ) {
    throw new Error('Unsupported avatar preset file.')
  }

  return {
    type: AVATAR_APPEARANCE_PRESET_TRANSFER_TYPE,
    schemaVersion: AVATAR_APPEARANCE_PRESET_TRANSFER_SCHEMA_VERSION,
    exportedAt: typeof value.exportedAt === 'string' ? value.exportedAt : new Date().toISOString(),
    presets: normalizeAvatarAppearancePresets(
      value.presets.filter((preset) => isRecord(preset) && isRecord(preset.appearance))
    ),
    customFaces: normalizeAvatarAppearancePresetFaces(value.customFaces),
  }
}


/** Team policy: first normalized preset; invalid/null/non-pixel config returns null for the caller to choose its fallback. */
export function appearanceFromJellyConfig(value: unknown): FloatingAvatarAppearance | null {
 if (value == null) return null;
 try {
  const transfer = parseAvatarAppearancePresetTransferFile(value);
  const preset = transfer.presets[0];
  if (!preset || preset.appearance.variant !== 'pixel') return null;
  return mergeAvatarAppearancePresetSelection({ ...DEFAULT_FLOATING_AVATAR_APPEARANCE, pixel: { ...DEFAULT_FLOATING_AVATAR_APPEARANCE.pixel, customFaces: transfer.customFaces } }, preset.appearance, preset.activeCustomFaceId);
 } catch { return null; }
}
