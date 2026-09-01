import axios, { AxiosHeaders, type AxiosRequestConfig } from "axios";
import CDIServiceService from "@/cam-auto-generate/CDIService";

export const TOKEN_KEY = "cdi_access_token";

const http = axios.create({
    baseURL: "/api/cam",
    timeout: 60000,
    headers: { "Content-Type": "application/json" },
});

http.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_KEY) || "";
    if (token) {
        const headers = AxiosHeaders.from(config.headers);
        headers.set("Authorization", `Bearer ${token}`);
        config.headers = headers;
    }
    return config;
});

export const CDIService = new CDIServiceService<AxiosRequestConfig>({
    request: (config, options) =>
        http.request({ ...options, ...config }).then((response) => response.data),
});
