import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import zhCN from "./locales/zh-CN.json";
import enUS from "./locales/en-US.json";
import { applyContentOverride, parseContentOverride } from "./contentOverride";

const contentOverride = parseContentOverride(
    import.meta.env.VITE_CONTENT_OVERRIDE,
);

i18n.use(LanguageDetector).use(initReactI18next).init({
    resources: {
        "zh-CN": {
            translation: applyContentOverride(zhCN, contentOverride, "zh-CN"),
        },
        "en-US": {
            translation: applyContentOverride(enUS, contentOverride, "en-US"),
        },
    },
    fallbackLng: "zh-CN",
    interpolation: { escapeValue: false },
    detection: {
        order: ["localStorage", "navigator", "htmlTag"],
        caches: ["localStorage"],
    },
});

export default i18n;
