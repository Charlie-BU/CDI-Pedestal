/** 翻译资源节点：表示可嵌套的 i18n 文案对象。 */
type TranslationResource = Record<string, unknown>;

/** 内容覆盖配置：以语言代码为键的翻译资源集合。 */
export type ContentOverride = Record<string, TranslationResource>;

/** isTranslationResource：判断值是否为普通翻译资源对象。 */
function isTranslationResource(value: unknown): value is TranslationResource {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** isContentOverride：判断值是否为以语言代码组织的覆盖配置。 */
function isContentOverride(value: unknown): value is ContentOverride {
    return (
        isTranslationResource(value) &&
        Object.values(value).every(isTranslationResource)
    );
}

/** parseContentOverride：解析环境变量中的内容覆盖配置。 */
export function parseContentOverride(raw: string | undefined): ContentOverride {
    if (!raw) return {};

    try {
        const parsed: unknown = JSON.parse(raw);
        return isContentOverride(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

/** mergeContentOverride：仅覆盖默认资源中已存在的字符串文案。 */
function mergeContentOverride<T extends TranslationResource>(
    defaults: T,
    overrides: TranslationResource | undefined,
): T {
    if (!overrides) return defaults;

    return Object.fromEntries(
        Object.entries(defaults).map(([key, defaultValue]) => {
            const overrideValue = overrides[key];
            if (
                isTranslationResource(defaultValue) &&
                isTranslationResource(overrideValue)
            ) {
                return [key, mergeContentOverride(defaultValue, overrideValue)];
            }

            return [
                key,
                typeof defaultValue === "string" && typeof overrideValue === "string"
                    ? overrideValue
                    : defaultValue,
            ];
        }),
    ) as T;
}

/** applyContentOverride：将指定语言的环境变量文案合并到默认资源。 */
export function applyContentOverride<T extends TranslationResource>(
    defaults: T,
    contentOverride: ContentOverride,
    locale: string,
): T {
    return mergeContentOverride(defaults, contentOverride[locale]);
}
