import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Button, Result } from "@cloud-materials/common";

interface Props {
    children: ReactNode;
}

interface State {
    failed: boolean;
}

class RemoteBoundary extends Component<Props, State> {
    state: State = { failed: false };

    static getDerivedStateFromError(): State {
        return { failed: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error("Failed to load remote application", error, info);
    }

    render() {
        if (this.state.failed) {
            return (
                <Result
                    status="error"
                    title="平台加载失败"
                    subTitle="请确认子应用已经发布并且远程入口地址可访问。"
                    extra={
                        <Button type="primary" onClick={() => window.location.reload()}>
                            重新加载
                        </Button>
                    }
                />
            );
        }
        return this.props.children;
    }
}

export default RemoteBoundary;

