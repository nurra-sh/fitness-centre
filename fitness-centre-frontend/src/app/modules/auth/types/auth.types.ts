export interface LoginBody {
    email: string
    password: string
}

export interface LoginResponse {
    type: 'bearer'
    token: string
    user: User;
    message: string
}

export interface User {
    id: number
    fullName: string
    email: string
    phone: string | null
    cardNumber: string | null
    mustChangePassword: boolean // вошёл с временным паролем от админа, нужно сменить
    roleId: RolesIdEnum
    createdAt: string
    updatedAt: string
}

export interface RegisterBody {
    email: string;
    password: string;
    password_confirmation: string;
    fullName: string;
    phone: string;
}

export interface RegisterResponse {
    message: string
}

export interface GetMeResponse {
    user: User
}
export interface ChangePasswordBody {
    currentPassword: string
    password: string
    password_confirmation: string
}

export interface ChangePasswordResponse {
    message: string
    user: User
}

export enum RolesEnum {
    ADMIN = 'ADMIN',
    USER = 'USER'
}

// id ролей в БД (таблица roles): 1 = USER, 2 = ADMIN
export enum RolesIdEnum {
    ADMIN = 2,
    USER = 1
}