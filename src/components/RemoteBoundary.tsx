import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Button, Result } from "@cloud-materials/common";
import i18n from "@/i18n";

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
                <div className="shell-error">
                    <Result
                        status="error"
                        title={i18n.t("remote.loadFailedTitle")}
                        subTitle={i18n.t("remote.loadFailedDescription")}
                        extra={
                            <Button
                                type="primary"
                                onClick={() => window.location.reload()}
                            >
                                {i18n.t("remote.reload")}
                            </Button>
                        }
                    />
                </div>
            );
        }
        return this.props.children;
    }
}

export default RemoteBoundary;
