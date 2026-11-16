/** Роли пользователей системы. Иерархия: user < moderator < admin. */
export type Role = 'user' | 'moderator' | 'admin';

/** Публичный профиль пользователя. */
export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

/** Входные данные регистрации. */
export interface RegisterInput {
  email: string;
  name: string;
  password: string;
}

/** Входные данные входа. */
export interface LoginInput {
  email: string;
  password: string;
}

/** Патч профиля: в MVP разрешено менять только имя. */
export interface UpdateProfileInput {
  name: string;
}