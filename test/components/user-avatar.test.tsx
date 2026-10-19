import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import UserAvatar from "@/components/User/UserAvatar";

vi.mock("@/components/User/jelly/JellyAvatarPreview", () => ({
    JellyAvatarPreview: ({ settings }: { settings: unknown }) => <div data-testid="jelly-avatar">{JSON.stringify(settings)}</div>,
}));
const config = {
    type: "airjelly.floating-avatar-presets", schemaVersion: 1, exportedAt: "2026-09-01T00:00:00Z", customFaces: [],
    presets: [{ id: "sample", activeCustomFaceId: null, savedAt: 1, appearance: { variant: "pixel", pixel: {
        bell: { shape: "blob", color: "#c7a2ff", width: 47, topWidth: 29, height: 43 },
        expression: "excited", scale: 0.9,
    } } }],
};
const user = { username: "Alice", nickname: "小明" };
afterEach(cleanup);
describe("UserAvatar", () => {
    it("keeps the nickname or username initial without a configuration", () => {
        const view = render(<UserAvatar user={user} size={32} />);
        expect(screen.getByText("小")).toBeVisible();
        expect(screen.queryByTestId("jelly-avatar")).toBeNull();
        view.rerender(<UserAvatar user={{ username: "Alice", jelly_config: null }} size={32} />);
        expect(screen.getByText("A")).toBeVisible();
    });
    it("renders the configured first preset and keeps popover click handlers", async () => {
        const onClick = vi.fn();
        const view = render(<UserAvatar user={{ ...user, jelly_config: config }} size={32} onClick={onClick} />);
        const jelly = await screen.findByTestId("jelly-avatar");
        expect(jelly).toHaveTextContent('"color":"#c7a2ff"');
        expect(jelly).toHaveTextContent('"expression":"excited"');
        expect(screen.queryByText("小")).toBeNull();
        fireEvent.click(jelly);
        expect(onClick).toHaveBeenCalledOnce();
        view.rerender(<UserAvatar user={user} size={32} />);
        expect(screen.getByText("小")).toBeVisible();
        expect(screen.queryByTestId("jelly-avatar")).toBeNull();
    });
    it.each([{}, { ...config, schemaVersion: 2 }, { ...config, presets: [] }, { ...config, presets: [{ ...config.presets[0], appearance: { variant: "classic" } }] }])("keeps initials for an unsupported configuration", async jelly_config => {
        render(<UserAvatar user={{ ...user, jelly_config }} size={40} />);
        expect(await screen.findByText("小")).toBeVisible();
        expect(screen.queryByTestId("jelly-avatar")).toBeNull();
    });
});
