import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { login as loginApi, type LoginPayload } from '@/api/auth';
import { ROLES, isAppRole, type AppRole } from '@/constants/role';

const TOKEN_KEY = 'auth_token';
const USERNAME_KEY = 'auth_username';
const ROLE_KEY = 'auth_role';

export const useAuthStore = defineStore('auth', () => {
	function readRoleFromStorage(): AppRole | null {
		const raw = localStorage.getItem(ROLE_KEY);
		return isAppRole(raw) ? raw : null;
	}

	const token = ref<string | null>(localStorage.getItem(TOKEN_KEY));
	const username = ref<string | null>(localStorage.getItem(USERNAME_KEY));
	const role = ref<AppRole | null>(readRoleFromStorage());

	const isLoggedIn = computed(() => Boolean(token.value));

	function setSession(t: string, name: string, r: AppRole) {
		token.value = t;
		username.value = name;
		role.value = r;
		localStorage.setItem(TOKEN_KEY, t);
		localStorage.setItem(USERNAME_KEY, name);
		localStorage.setItem(ROLE_KEY, r);
	}

	function clearSession() {
		token.value = null;
		username.value = null;
		role.value = null;
		localStorage.removeItem(TOKEN_KEY);
		localStorage.removeItem(USERNAME_KEY);
		localStorage.removeItem(ROLE_KEY);
	}

	async function login(payload: LoginPayload) {
		const res = await loginApi(payload);
		setSession(res.token, res.user.username, res.user.role);
	}

	function logout() {
		clearSession();
	}

	function syncFromStorage() {
		token.value = localStorage.getItem(TOKEN_KEY);
		username.value = localStorage.getItem(USERNAME_KEY);
		role.value = readRoleFromStorage();
	}

	/** 是否为管理员（可访问滚动测试等） */
	const isAdmin = computed(() => role.value === ROLES.ADMIN);

	/** 路由 meta.roles 未配置则任意登录用户可进；配置了则需命中其一 */
	function hasRouteAccess(routeRoles: readonly AppRole[] | undefined): boolean {
		if (!routeRoles?.length) return true;
		if (!role.value) return false;
		return routeRoles.includes(role.value);
	}

	return {
		token,
		username,
		role,
		isLoggedIn,
		isAdmin,
		login,
		logout,
		clearSession,
		syncFromStorage,
		hasRouteAccess,
	};
});
