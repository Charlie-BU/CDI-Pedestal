import { Button, CModal, Message } from "@cloud-materials/common";
import { useTranslation } from "react-i18next";
import { isLocalDebugEnabled, readDebugSettings, saveDebugSettings } from "@/localDebug";
import DebugForm from "./DebugForm";

/** LocalDebugButton：打开与登录弹窗一致的本地调试配置表单。 */
export default function LocalDebugButton({ className }: { className?: string }) {
    const { t } = useTranslation();
    if (!isLocalDebugEnabled()) return null;
    const open = () => {
        CModal.openArcoForm({
            title: t("localDebug.title"),
            content: <DebugForm />,
            arcoFormProps: { initialValues: readDebugSettings(), layout: "vertical" },
            cancelText: t("common.cancel"),
            okText: t("localDebug.save"),
            onOk: async (values, form) => {
                await form.validate();
                try { saveDebugSettings(values); }
                catch { Message.error(t("localDebug.saveFailed")); return; }
                window.location.reload();
            },
        });
    };
    return <Button type="text" className={className} onClick={open}>{t("localDebug.button")}</Button>;
}
