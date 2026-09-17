import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { Button, CModal, Input, Message, Result, Select, Space, Table, Tag, Typography } from "@cloud-materials/common";
import { useTranslation } from "react-i18next";
import { useUser } from "@/hooks/useUser";
import { useApplications } from "@/hooks/useApplications";
import { CDIService } from "@/services/CDIService";
import { normalizeApplication, applicationName, type ApplicationConfig, type ApplicationInput } from "@/subApplications";
import ApplicationForm from "./ApplicationForm";
import styles from "./index.module.less";

/** EMPTY_APPLICATION：新建表单初值，不预置任何子应用地址。 */
const EMPTY_APPLICATION: ApplicationInput = { app_key: "", name_zh: "", name_en: "", description_zh: "", description_en: "", icon_url: "", app_type: "federation", route_path: "", frontend_url: "", remote_name: "", exposed_module: "./App", backend_url: "", sort_order: 0, enabled: true, show_in_menu: true, require_login: true };
/** applicationInput：移除管理记录的只读字段。 */
const applicationInput = (row: ApplicationConfig): ApplicationInput => Object.fromEntries(Object.keys(EMPTY_APPLICATION).map((key) => [key, row[key as keyof ApplicationInput]])) as unknown as ApplicationInput;

/** formatUpdatedAt：按浏览器本地时区显示更新时间，精确到秒。 */
const formatUpdatedAt = (value: string) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    const pad = (part: number) => String(part).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

/** ApplicationSettings：固定基座页面，仅 L0 可操作数据库配置。 */
export default function ApplicationSettings() {
    const { t, i18n } = useTranslation();
    const { user, accessToken, openLoginModal } = useUser();
    const refreshDirectory = useApplications((state) => state.load);
    const [items, setItems] = useState<ApplicationConfig[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [type, setType] = useState("");
    const [enabled, setEnabled] = useState("");
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const [revision, setRevision] = useState(0);
    const [saving, setSaving] = useState(false);
    const draggedId = useRef<number | null>(null);
    const [dragging, setDragging] = useState<number | null>(null);
    const [dropTarget, setDropTarget] = useState<number | null>(null);
    const canManage = Boolean(accessToken && user?.level === 0);
    const showError = useCallback(() => Message.error(t("applications.errors.REQUEST_FAILED")), [t]);
    useEffect(() => {
        if (!canManage) return;
        const controller = new AbortController();
        setLoading(true); setFailed(false);
        CDIService.GetAllSubApplicationsGET({ page: String(page), page_size: "20", search, app_type: type, enabled }, { signal: controller.signal }).then((response) => {
            if (!controller.signal.aborted) { setItems(response.items.map(normalizeApplication)); setTotal(response.total); }
        }).catch(() => { if (!controller.signal.aborted) { setFailed(true); showError(); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [canManage, accessToken, page, search, type, enabled, revision, showError]);
    const refresh = async () => { setRevision((value) => value + 1); await refreshDirectory(accessToken); };
    const mutate = async (action: () => Promise<unknown>) => {
        setSaving(true);
        try { await action(); await refresh(); Message.success(t("applications.saved")); }
        catch { showError(); }
        finally { setSaving(false); }
    };
    const edit = (row?: ApplicationConfig) => {
        const initial = row ? applicationInput(row) : { ...EMPTY_APPLICATION };
        const modal = CModal.openArcoForm({
            title: t(row ? "applications.edit" : "applications.create"),
            content: <ApplicationForm initial={initial} editing={Boolean(row)} />,
            arcoFormProps: { initialValues: initial, layout: "vertical" },
            okText: t("applications.save"), cancelText: t("common.cancel"),
            onOk: async (values, form) => {
                await form.validate();
                const data = { ...initial, ...values } as ApplicationInput;
                if (data.app_type === "iframe") Object.assign(data, { remote_name: "", exposed_module: "", backend_url: "" });
                try {
                    if (row) await CDIService.UpdateSubApplicationPOST({ id: row.id, values: data, Authorization: "" }); else await CDIService.CreateSubApplicationPOST({ ...data, Authorization: "" });
                    modal.close(); await refresh(); Message.success(t("applications.saved"));
                } catch { showError(); }
            },
        });
    };
    const move = async (sourceId: number, targetId: number) => mutate(async () => {
        const all: ApplicationConfig[] = [];
        let next = 1;
        let expected = Infinity;
        while (all.length < expected) {
            const response = await CDIService.GetAllSubApplicationsGET({ page: String(next++), page_size: "100" });
            expected = response.total;
            if (!response.items.length) break;
            all.push(...response.items.map(normalizeApplication));
        }
        const index = all.findIndex((item) => item.id === sourceId);
        const destination = all.findIndex((item) => item.id === targetId);
        if (all.length !== expected || index < 0 || destination < 0) throw new Error("INVALID_APPLICATION_ORDER");
        if (index === destination) return;
        const [moved] = all.splice(index, 1);
        all.splice(destination, 0, moved);
        await CDIService.ReorderSubApplicationsPOST({ ids: all.map((item) => item.id), Authorization: "" });
    });
    const clearDrag = () => { draggedId.current = null; setDragging(null); setDropTarget(null); };
    if (!accessToken) return <Result title={t("login.required")} extra={<Button onClick={openLoginModal}>{t("login.login")}</Button>} />;
    if (!user) return <Result title={t("applications.loadingUser")} />;
    if (!canManage) return <Result status="403" title={t("applications.forbidden")} />;
    return <section style={{ padding: "24px 0" }}>
        <Typography.Title heading={4}>{t("applications.title")}</Typography.Title>
        <Typography.Paragraph>{t("applications.description")}</Typography.Paragraph>
        <Space wrap style={{ marginBottom: 20 }}>
            <Input.Search allowClear placeholder={t("applications.search")} onSearch={(value) => { setPage(1); setSearch(value); }} />
            <Select style={{ width: 160 }} value={type} onChange={(value) => { setPage(1); setType(value); }}>
                <Select.Option value="">{t("applications.allTypes")}</Select.Option>
                <Select.Option value="federation">{t("applications.types.federation")}</Select.Option>
                <Select.Option value="iframe">{t("applications.types.iframe")}</Select.Option>
            </Select>
            <Select style={{ width: 140 }} value={enabled} onChange={(value) => { setPage(1); setEnabled(value); }}>
                <Select.Option value="">{t("applications.allStates")}</Select.Option>
                <Select.Option value="true">{t("applications.enabled")}</Select.Option>
                <Select.Option value="false">{t("applications.disabled")}</Select.Option>
            </Select>
            <Button type="primary" onClick={() => edit()}>{t("applications.create")}</Button>
        </Space>
        {failed ? <Result title={t("applications.directoryFailed")} /> : <Table<ApplicationConfig> className={styles.table} rowKey="id" data={items} loading={loading || saving} scroll={{ x: "max-content" }} pagination={{ current: page, pageSize: 20, total, onChange: setPage }} onRow={(row) => ({
            className: [dragging === row.id ? styles.dragging : "", dropTarget === row.id ? styles.dropTarget : ""].filter(Boolean).join(" "),
            onDragOver: (event: DragEvent<HTMLTableRowElement>) => {
                if (draggedId.current === null || draggedId.current === row.id || loading || saving) return;
                event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDropTarget(row.id);
            },
            onDrop: (event: DragEvent<HTMLTableRowElement>) => {
                event.preventDefault();
                const sourceId = draggedId.current;
                clearDrag();
                if (sourceId !== null && sourceId !== row.id && !loading && !saving) void move(sourceId, row.id);
            },
        })} columns={[
            { title: "", width: 48, fixed: "left", render: (_, row) => <button type="button" className={styles.dragHandle} draggable={!loading && !saving} disabled={loading || saving}
                aria-label={t("applications.dragOrder")} title={t("applications.dragOrder")}
                onDragStart={(event) => {
                    draggedId.current = row.id; setDragging(row.id);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", String(row.id));
                    const element = event.currentTarget.closest("tr");
                    if (element) event.dataTransfer.setDragImage(element, 24, element.getBoundingClientRect().height / 2);
                }} onDragEnd={clearDrag}
                onKeyDown={(event) => {
                    const direction = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
                    if (!direction || loading || saving) return;
                    event.preventDefault();
                    const target = items[items.findIndex((item) => item.id === row.id) + direction];
                    if (target) void move(row.id, target.id);
                }}>
                <svg width="16" height="20" viewBox="0 0 16 20" fill="currentColor" aria-hidden="true">{[5, 10, 15].flatMap((cy) => [5, 11].map((cx) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.5" />))}</svg>
            </button> },
            { title: t("applications.name"), width: 200, fixed: "left", render: (_, row) => <div className={styles.application}>
                <span className={styles.icon}>{row.icon_url && <img src={row.icon_url} alt="" width={24} height={24} />}</span>
                <div className={styles.nameBlock}>
                    <div className={styles.ellipsis} title={applicationName(row, i18n.resolvedLanguage)}>{applicationName(row, i18n.resolvedLanguage)}</div>
                    <div className={`${styles.ellipsis} ${styles.identifier}`} title={row.app_key}>{row.app_key}</div>
                </div>
            </div> },
            { title: t("applications.fields.app_type"), width: 180, render: (_, row) => t(`applications.types.${row.app_type}`) },
            { title: t("applications.fields.route_path"), width: 200, dataIndex: "route_path" },
            { title: t("applications.state"), width: 100, render: (_, row) => <Tag color={row.enabled ? "green" : "gray"}>{t(row.enabled ? "applications.enabled" : "applications.disabled")}</Tag> },
            { title: t("applications.fields.show_in_menu"), width: 100, render: (_, row) => <Tag color={row.show_in_menu ? "green" : "gray"}>{t(row.show_in_menu ? "applications.yes" : "applications.no")}</Tag> },
            { title: t("applications.updated"), width: 180, dataIndex: "updated_at", render: (value: string) => formatUpdatedAt(value) },
            { title: t("applications.operations"), width: 240, render: (_, row) => <Space>
                <Button size="mini" onClick={() => edit(row)}>{t("applications.edit")}</Button>
                <Button size="mini" disabled={saving} onClick={() => void mutate(() => CDIService.SetSubApplicationEnabledPOST({ id: row.id, enabled: !row.enabled, Authorization: "" }))}>{t(row.enabled ? "applications.disable" : "applications.enable")}</Button>
                <Button size="mini" status="danger" disabled={saving} onClick={() => CModal.confirm({ title: t("applications.delete"), content: t("applications.deleteConfirm", { name: applicationName(row, i18n.resolvedLanguage) }), onOk: () => mutate(() => CDIService.DeleteSubApplicationByIdPOST({ id: row.id, Authorization: "" })) })}>{t("applications.delete")}</Button>
            </Space> },
        ]} />}
    </section>;
}
