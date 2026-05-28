import { ROLES, type AppRole } from '@/constants/role';

const KNOWN = new Set([
	'dashboard',
	'demo',
	'scroll-test',
	...Array.from({ length: 8 }, (_, i) => `scroll-test-p${i + 1}`),
	'system',
	'system-permission',
	'workflow',
	'workflow-designer',
	'leave',
	'leave-apply',
	'leave-todos',
	'leave-task-approve',
]);

export type RoleRouteNameConfig = Record<AppRole, string[]>;

export function expandRouteKeysForAccessCheck(names: readonly string[]): Set<string> {
	const out = new Set(names);
	if (out.has('system')) out.add('system-permission');
	if (out.has('scroll-test')) {
		for (let i = 1; i <= 8; i++) out.add(`scroll-test-p${i}`);
	}
	if (out.has('workflow')) out.add('workflow-designer');
	if (out.has('leave')) {
		out.add('leave-apply');
		out.add('leave-todos');
		out.add('leave-task-approve');
	}
	if (out.has('leave-todos')) out.add('leave-task-approve');
	return out;
}

export function defaultRoleRouteConfig(): RoleRouteNameConfig {
	return {
		[ROLES.ADMIN]: ['dashboard', 'demo', 'system', 'scroll-test', 'workflow', 'leave'],
		[ROLES.MANAGER]: ['dashboard', 'demo', 'leave'],
		[ROLES.OPERATOR]: ['dashboard', 'demo', 'leave'],
	};
}

function pickNames(raw: unknown): string[] {
	const arr = Array.isArray(raw)
		? raw
		: raw && typeof raw === 'object' && Array.isArray((raw as { routes?: unknown }).routes)
			? (raw as { routes: unknown[] }).routes
			: [];
	return arr.filter((x): x is string => typeof x === 'string' && KNOWN.has(x));
}

export function normalizeMyRouteNamesFromApi(raw: unknown, role: AppRole): string[] {
	const names = pickNames(raw);
	return names.length ? names : [...defaultRoleRouteConfig()[role]];
}

export function normalizeRouteConfigFromApi(raw: unknown): RoleRouteNameConfig {
	const fallback = defaultRoleRouteConfig();
	if (!raw || typeof raw !== 'object') return { ...fallback };

	const o = raw as Record<string, unknown>;
	const out = { ...fallback };
	for (const role of [ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATOR] as const) {
		const names = pickNames(o[role]);
		if (names.length) out[role] = names;
	}
	return out;
}
