import { ROLES, type AppRole } from '@/constants/role';

/** localStorage 键；v1 为模块 id，v2 为路由 name，解析时自动迁移 v1 */
export const PERMISSION_STORAGE_KEY = 'vue-admin-ai:route-permissions-v1';

/** 可配置的路由 name（与 asyncRoutes 一致，含仪表盘） */
export function allConfigurableRouteNames(): string[] {
	return [
		'dashboard',
		'demo',
		'scroll-test',
		...Array.from({ length: 8 }, (_, i) => `scroll-test-p${i + 1}`),
		'system',
		'system-permission',
	];
}

export type RoleRouteNameConfig = Record<AppRole, string[]>;

/**
 * 与 filterRoutesByAllowedNames 一致：配置里勾选父路由 name 时，子路由也应视为可访问
 *（用于导航守卫 isRouteAllowed，避免仅存 system 却无法匹配 to.name === system-permission）
 */
export function expandStoredRouteKeysForAccessCheck(names: readonly string[]): Set<string> {
	const out = new Set(names);
	if (out.has('system')) {
		out.add('system-permission');
	}
	if (out.has('scroll-test')) {
		for (let i = 1; i <= 8; i++) {
			out.add(`scroll-test-p${i}`);
		}
	}
	return out;
}

const LEGACY_MODULE_IDS = ['demo', 'scroll-test', 'system'] as const;

export function defaultRoleRouteConfig(): RoleRouteNameConfig {
	return {
		[ROLES.ADMIN]: ['dashboard', 'demo', 'system', 'scroll-test'],
		[ROLES.OPERATOR]: ['dashboard', 'demo'],
	};
}

function migrateLegacyModuleIds(arr: string[]): string[] {
	const out = new Set<string>();
	out.add('dashboard');
	for (const x of arr) {
		if (x === 'demo') out.add('demo');
		if (x === 'scroll-test') {
			out.add('scroll-test');
			for (let i = 1; i <= 8; i++) out.add(`scroll-test-p${i}`);
		}
		if (x === 'system') {
			out.add('system');
			out.add('system-permission');
		}
	}
	return [...out];
}

export function parseStoredPermissionConfig(raw: string | null): RoleRouteNameConfig {
	const base = defaultRoleRouteConfig();
	if (!raw) return base;
	try {
		const o = JSON.parse(raw) as Record<string, unknown>;
		const known = new Set(allConfigurableRouteNames());
		const out: RoleRouteNameConfig = { ...base };
		for (const role of [ROLES.ADMIN, ROLES.OPERATOR] as const) {
			const arr = o[role];
			if (!Array.isArray(arr) || !arr.every((x) => typeof x === 'string')) continue;
			const isLegacy =
				arr.length > 0 && arr.every((x) => (LEGACY_MODULE_IDS as readonly string[]).includes(x));
			const names = (isLegacy ? migrateLegacyModuleIds(arr) : arr).filter((x) => known.has(x));
			if (names.length) out[role] = names;
		}
		return out;
	} catch {
		return base;
	}
}
