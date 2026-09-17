import { describe, expect, it } from "vitest";
import { matchApplication, applicationName } from "@/subApplications";
import { cam } from "./fixtures/applications";
describe("database application routing", () => {
    it("matches path segments and excludes disabled applications", () => {
        expect(matchApplication([cam], "/cam/service/1")).toBe(cam);
        expect(matchApplication([cam], "/camera")).toBeUndefined();
        expect(matchApplication([{ ...cam, enabled: false }], "/cam")).toBeUndefined();
    });
    it("selects database labels by language", () => {
        const names = { name_zh: "应用", name_en: "Application" };
        expect(applicationName(names, "zh-CN")).toBe("应用");
        expect(applicationName(names, "en-US")).toBe("Application");
    });
});
