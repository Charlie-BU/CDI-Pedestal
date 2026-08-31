export interface LoginRequest {
    username: string;
    password: string;
}

export interface RegisterRequest {
    username: string;
    password: string;
    nickname: string;
    email: string;
    role: string;
}

export interface ModifyPasswordRequest {
    old_password: string;
    new_password: string;
}

export interface UserProfile {
    id: number;
    username: string;
    nickname: string;
    email: string;
    role: string;
    level: number;
    created_at: string;
}

export interface StatusResponse {
    status: number;
    message: string;
}

export interface LoginResponse extends StatusResponse {
    access_token: string;
}

export interface UserResponse extends StatusResponse {
    user: UserProfile;
}

export type UserRole =
    | "frontend"
    | "backend"
    | "fullstack"
    | "qa"
    | "devops"
    | "product_manager"
    | "designer"
    | "architect"
    | "proj_lead"
    | "guest";

