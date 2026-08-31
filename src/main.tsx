import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@cloud-materials/common/dist/css/index.css";
import "./i18n";
import App from "./App";
import "./App.less";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);

