import { afterEach, describe, expect, it } from "vitest";
import {
    cacheResponse,
    clearCachedResponsesForToken,
    createCacheKey,
    getCachedResponse,
    isSameCachedData,
} from "@/services/cache";

const key = (token: string, url: string) => createCacheKey({ method: "get", url }, token);

afterEach(async () => {
    await new Promise<void>((resolve) => {
        const request = indexedDB.deleteDatabase("cdi-pedestal-cache");
        request.onsuccess = request.onerror = request.onblocked = () => resolve();
    });
});

describe("cache", () => {
    it("uses stable, token-isolated keys without persisting the token", () => {
        const left = createCacheKey({ method: "GET", url: "/me", params: { b: 2, a: 1 } }, "token-a");
        const reordered = createCacheKey({ method: "get", url: "/me", params: { a: 1, b: 2 } }, "token-a");
        expect(left).toBe(reordered);
        expect(left).not.toContain("token-a");
        expect(left).not.toBe(key("token-b", "/me"));
    });

    it("reads data and clears only the selected token namespace", async () => {
        await cacheResponse(key("token-a", "/me"), { user: "a" });
        await cacheResponse(key("token-b", "/me"), { user: "b" });
        await clearCachedResponsesForToken("token-a");
        await expect(getCachedResponse(key("token-a", "/me"))).resolves.toBeUndefined();
        await expect(getCachedResponse(key("token-b", "/me"))).resolves.toMatchObject({ data: { user: "b" } });
    });

    it("compares JSON data independently of object key order", () => {
        expect(isSameCachedData({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
        expect(isSameCachedData({ a: 1 }, { a: 2 })).toBe(false);
    });
});
