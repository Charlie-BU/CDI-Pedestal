import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GetMyInfo200Response } from "@/cam-auto-generate/CDIService/namespaces";

const tokenA = "test-access-token-a";
const tokenB = "test-access-token-b";
const response: GetMyInfo200Response = {
    status: 200,
    message: "ok",
    user: {
        id: 1, username: "test-user-a", nickname: null, email: null, role: "user", level: 1,
        created_at: "2026-01-01T00:00:00Z", has_password: true, auth_providers: [],
    },
};

let useUser: typeof import("@/hooks/useUser").useUser;
let cache: typeof import("@/services/cache");
let tokenKey: string;
let requestConfig: InternalAxiosRequestConfig | undefined;
let resolveRequest: (response: AxiosResponse) => void;
let rejectRequest: (error: unknown) => void;
let rejectImmediately: boolean;
const refreshErrorHandled = vi.fn();

const cacheKey = (token: string) => cache.createCacheKey({
    method: "GET", baseURL: "/api/cdi", url: "/v1/user/getMyInfo",
}, token);

const failRequest = (status?: number) => rejectRequest(new AxiosError(
    "test request failure", status ? "ERR_BAD_RESPONSE" : "ERR_NETWORK", requestConfig,
    undefined, status ? { data: {}, status, statusText: "Error", headers: {}, config: requestConfig! } : undefined,
));

beforeEach(async () => {
    vi.resetModules();
    vi.stubGlobal("indexedDB", new IDBFactory());
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clear(),
    });
    refreshErrorHandled.mockClear();
    requestConfig = undefined;
    rejectImmediately = false;
    const actualCreate = axios.create.bind(axios);
    vi.spyOn(axios, "create").mockImplementation((config) => actualCreate({
        ...config,
        adapter: (request) => {
            requestConfig = request;
            if (rejectImmediately) {
                return Promise.reject(new AxiosError("test unauthorized", "ERR_BAD_RESPONSE", request, undefined, {
                    data: {}, status: 401, statusText: "Unauthorized", headers: {}, config: request,
                }));
            }
            return new Promise<AxiosResponse>((resolve, reject) => {
                resolveRequest = resolve;
                rejectRequest = reject;
            });
        },
    }));
    cache = await import("@/services/cache");
    const { CDIService, TOKEN_KEY } = await import("@/services/CDIService");
    tokenKey = TOKEN_KEY;
    const getMyInfo = CDIService.GetMyInfoGET.bind(CDIService);
    vi.spyOn(CDIService, "GetMyInfoGET").mockImplementation((request, options) => getMyInfo(request, {
        ...options,
        onCacheRefreshError: (error) => {
            options?.onCacheRefreshError?.(error);
            refreshErrorHandled(error);
        },
    }));
    ({ useUser } = await import("@/hooks/useUser"));
    localStorage.setItem(tokenKey, tokenA);
    useUser.setState({ accessToken: tokenA, user: null, loading: false });
});

afterEach(async () => {
    await cache.clearCachedResponsesForToken(tokenA);
    await cache.clearCachedResponsesForToken(tokenB);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe("integration: getMyInfo cache and authentication", () => {
    it("updates a cached user when background refresh succeeds", async () => {
        await cache.cacheResponse(cacheKey(tokenA), response);
        await useUser.getState().fetchUser();
        await vi.waitFor(() => expect(requestConfig).toBeDefined());
        resolveRequest({ data: { ...response, user: { ...response.user, nickname: "test-updated" } },
            status: 200, statusText: "OK", headers: {}, config: requestConfig! });
        await vi.waitFor(() => expect(useUser.getState()).toMatchObject({
            user: { nickname: "test-updated" }, accessToken: tokenA, loading: false,
        }));
    });

    it("does not restore the cached user after an immediate background 401", async () => {
        await cache.cacheResponse(cacheKey(tokenA), response);
        rejectImmediately = true;
        await useUser.getState().fetchUser();
        await vi.waitFor(() => expect(refreshErrorHandled).toHaveBeenCalled());
        expect(useUser.getState()).toMatchObject({ user: null, accessToken: "", loading: false });
        expect(localStorage.getItem(tokenKey)).toBeNull();
    });

    it("clears the session and its cache when background refresh returns 401", async () => {
        await cache.cacheResponse(cacheKey(tokenA), response);
        await cache.cacheResponse(cacheKey(tokenB), response);
        await useUser.getState().fetchUser();
        expect(useUser.getState()).toMatchObject({ user: response.user, accessToken: tokenA, loading: false });
        await vi.waitFor(() => expect(requestConfig).toBeDefined());
        expect(requestConfig!.headers.get("Authorization")).toBe(`Bearer ${tokenA}`);
        failRequest(401);

        await vi.waitFor(() => expect(useUser.getState()).toMatchObject({ user: null, accessToken: "", loading: false }));
        expect(localStorage.getItem(tokenKey)).toBeNull();
        await vi.waitFor(async () => expect(await cache.getCachedResponse(cacheKey(tokenA))).toBeUndefined());
        expect(await cache.getCachedResponse(cacheKey(tokenB))).toMatchObject({ data: response });
    });

    it.each([500, undefined])("preserves the cached session on background failure %s", async (status) => {
        await cache.cacheResponse(cacheKey(tokenA), response);
        await useUser.getState().fetchUser();
        await vi.waitFor(() => expect(requestConfig).toBeDefined());
        failRequest(status);
        await vi.waitFor(() => expect(refreshErrorHandled).toHaveBeenCalled());
        expect(useUser.getState()).toMatchObject({ user: response.user, accessToken: tokenA, loading: false });
        expect(localStorage.getItem(tokenKey)).toBe(tokenA);
    });

    it("ignores a cached session's late 401 after switching tokens", async () => {
        await cache.cacheResponse(cacheKey(tokenA), response);
        await useUser.getState().fetchUser();
        await vi.waitFor(() => expect(requestConfig).toBeDefined());
        localStorage.setItem(tokenKey, tokenB);
        useUser.setState({ accessToken: tokenB, user: { ...response.user, id: 2 }, loading: true });
        failRequest(401);
        await vi.waitFor(() => expect(refreshErrorHandled).toHaveBeenCalled());
        expect(useUser.getState()).toMatchObject({ accessToken: tokenB, user: { id: 2 }, loading: true });
        expect(localStorage.getItem(tokenKey)).toBe(tokenB);
    });

    it("clears the session and finishes loading on 401 without a cache", async () => {
        const pending = useUser.getState().fetchUser();
        expect(useUser.getState().loading).toBe(true);
        await vi.waitFor(() => expect(requestConfig).toBeDefined());
        failRequest(401);
        await pending;
        expect(useUser.getState()).toMatchObject({ user: null, accessToken: "", loading: false });
        expect(localStorage.getItem(tokenKey)).toBeNull();
    });

    it.each(["success", "401"])("ignores an old foreground %s after switching tokens", async (result) => {
        const pending = useUser.getState().fetchUser();
        await vi.waitFor(() => expect(requestConfig).toBeDefined());
        localStorage.setItem(tokenKey, tokenB);
        useUser.setState({ accessToken: tokenB, user: { ...response.user, id: 2 }, loading: true });
        if (result === "401") failRequest(401);
        else resolveRequest({ data: response, status: 200, statusText: "OK", headers: {}, config: requestConfig! });
        await pending;
        expect(useUser.getState()).toMatchObject({ accessToken: tokenB, user: { id: 2 }, loading: true });
        expect(localStorage.getItem(tokenKey)).toBe(tokenB);
    });
});
