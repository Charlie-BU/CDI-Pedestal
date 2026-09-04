import { render, screen } from "@testing-library/react";
import { Form } from "@cloud-materials/common";
import { beforeEach, describe, expect, it } from "vitest";
import i18n from "@/i18n";
import SetPasswordForm from "@/components/User/SetPasswordForm";

describe("SetPasswordForm", () => {
    beforeEach(async () => {
        await i18n.changeLanguage("zh-CN");
    });

    it("只要求新密码和确认密码，不展示旧密码字段", () => {
        render(
            <Form>
                <SetPasswordForm />
            </Form>,
        );

        expect(screen.queryByPlaceholderText("请输入旧密码")).not.toBeInTheDocument();
        expect(screen.getByPlaceholderText("请输入新密码")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("请再次输入新密码")).toBeInTheDocument();
    });
});
