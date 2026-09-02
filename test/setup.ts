import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { afterEach, vi } from "vitest";

afterEach(() => {
    window.localStorage?.clear?.();
    vi.restoreAllMocks();
    vi.useRealTimers();
});
