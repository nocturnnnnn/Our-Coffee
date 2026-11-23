export type UserRole = 'admin' | 'kasir' | 'barista';

export type User = {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    is_active: boolean;
    avatar?: string;
    email_verified_at?: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

export type Auth = {
    user: User;
};

export type ActiveShift = {
    id: number;
    opening_cash: number;
    opened_at: string;
} | null;
