import axios, { AxiosHeaders } from "axios";
import type { AxiosError } from "axios";

export const TOKEN_KEY = "cdi_access_token";

export const http = axios.create({
    baseURL: import.meta.env.VITE_API_PUBLIC_BASE_URL || "/api",
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

http.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => Promise.reject(error),
);

