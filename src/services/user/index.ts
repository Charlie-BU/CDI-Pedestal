import { http } from "@/request";
import type {
    LoginRequest,
    LoginResponse,
    ModifyPasswordRequest,
    RegisterRequest,
    StatusResponse,
    UserResponse,
} from "./types";

const prefix = "/v1/user";

export const login = async (data: LoginRequest) =>
    (await http.post<LoginResponse>(`${prefix}/login`, data)).data;

export const register = async (data: RegisterRequest) =>
    (await http.post<StatusResponse>(`${prefix}/register`, data)).data;

export const modifyPassword = async (data: ModifyPasswordRequest) =>
    (await http.post<StatusResponse>(`${prefix}/modifyPassword`, data)).data;

export const getMyInfo = async () =>
    (await http.get<UserResponse>(`${prefix}/getMyInfo`)).data;
