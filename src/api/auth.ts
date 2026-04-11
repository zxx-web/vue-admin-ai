import request from '@/utils/request';
import { ROLES, type AppRole } from '@/constants/role';

export type LoginPayload = {
	username: string;
	password: string;
};

export type LoginResult = {
	token: string;
	user: { username: string; role: AppRole };
};

/** 后端约定：POST /auth/login，body: { username, password }，返回 user.role */
export async function login(payload: LoginPayload): Promise<LoginResult> {
	if (import.meta.env.VITE_MOCK_AUTH === 'true') {
		await new Promise((r) => setTimeout(r, 400));
		if (payload.username === 'admin' && payload.password === 'admin123') {
			return {
				token: `mock.${btoa(`${payload.username}:${Date.now()}`)}`,
				user: { username: payload.username, role: ROLES.ADMIN },
			};
		}
		if (payload.username === 'user' && payload.password === 'user123') {
			return {
				token: `mock.${btoa(`${payload.username}:${Date.now()}`)}`,
				user: { username: payload.username, role: ROLES.OPERATOR },
			};
		}
		throw new Error('用户名或密码错误（演示：admin/admin123 或 user/user123）');
	}

	const { data } = await request.post<LoginResult>('/auth/login', payload);
	return data;
}
