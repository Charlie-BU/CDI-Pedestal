import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Form } from "@cloud-materials/common";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import DebugForm from "@/components/LocalDebug/DebugForm";
import LocalDebugButton from "@/components/LocalDebug";
import i18n from "@/i18n";

import { setDebugApplications } from "@/localDebug";
import { cam } from "../fixtures/applications";

beforeEach(async () => { setDebugApplications([cam]); await i18n.changeLanguage("zh-CN"); });
afterEach(() => {
    cleanup();
    document.querySelector('meta[name="cdi-local-debug"]')?.remove();
});

describe("local debug UI", () => {
    it("hides the button without the header flag and shows it with the flag", () => {
        const { rerender } = render(<LocalDebugButton />);
        expect(screen.queryByRole("button", { name: "本地调试" })).not.toBeInTheDocument();
        document.head.insertAdjacentHTML("beforeend", '<meta name="cdi-local-debug" content="1">');
        rerender(<LocalDebugButton />);
        expect(screen.getByRole("button", { name: "本地调试" })).toBeInTheDocument();
    });
    it("groups optional fields by application and validates invalid addresses", async () => {
        render(<Form layout="vertical"><DebugForm /></Form>);
        expect(screen.getByRole("group", { name: "CAM" })).toBeInTheDocument();
        const frontend = screen.getByPlaceholderText("http://localhost:9100");
        expect(frontend).toHaveValue("");
        expect(screen.getByPlaceholderText("http://localhost:9101")).toHaveValue("");
        expect(screen.getAllByText(/数据库/)).toHaveLength(2);
        fireEvent.change(frontend, { target: { value: "javascript:alert(1)" } });
        fireEvent.blur(frontend);
        expect(await screen.findByText(/请输入完整的 HTTP/)).toBeInTheDocument();
    });
});
