import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Form } from "@cloud-materials/common";
import { afterEach, beforeEach, expect, it } from "vitest";
import ApplicationForm from "@/components/ApplicationSettings/ApplicationForm";
import { cam } from "../fixtures/applications";
import i18n from "@/i18n";
beforeEach(async () => { await i18n.changeLanguage("zh-CN"); });
afterEach(cleanup);
it("validates the route prefix inline and hides sort order when creating", async () => {
    render(<Form layout="vertical"><ApplicationForm initial={cam} editing={false} /></Form>);
    const route = screen.getByText(i18n.t('applications.fields.route_path')).closest('.arco-form-item')?.querySelector('input') as HTMLInputElement;
    expect(route).not.toBeNull();
    fireEvent.change(route, { target: { value: "cam" } });
    fireEvent.blur(route);
    expect(await screen.findByText("路径必须以 / 开头")).toBeInTheDocument();
    fireEvent.change(route, { target: { value: "/cam" } });
    fireEvent.blur(route);
    expect(screen.queryByText("排序值")).not.toBeInTheDocument();
    expect(screen.getByText("基础信息")).toHaveStyle({ marginBottom: "16px" });
});
it("hides sort order when editing", () => {
    render(<Form layout="vertical"><ApplicationForm initial={cam} editing /></Form>);
    expect(screen.queryByText("排序值")).not.toBeInTheDocument();
});
