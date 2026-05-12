import type { RouteRecordRaw } from 'vue-router';
import type { AppRole } from '@/constants/role';
import { asyncChildRoutes } from '@/router/asyncRoutes';
import { filterRoutesByAllowedNames } from '@/router/routeHelpers';
import { usePermissionConfigStore } from '@/stores/permissionConfig';

/** 过滤后第一个「叶子」路由 name，避免返回仅含 redirect 的父级（如 system → system-permission 与守卫死循环） */
function firstLeafRouteName(routes: RouteRecordRaw[]): string | undefined {
	for (const r of routes) {
		if (r.children?.length) {
			const inner = firstLeafRouteName(r.children);
			if (inner) return inner;
		} else if (r.name != null && typeof r.name === 'string') {
			return r.name;
		}
	}
	return undefined;
}

/** 当前角色过滤后第一个可访问子路由的 name（用于登录后首页、无权限回退等） */
export function getFirstAllowedRouteName(role: AppRole | null): string {
	if (!role) return 'dashboard';
	const perm = usePermissionConfigStore();
	perm.loadFromStorage();
	const filtered = filterRoutesByAllowedNames(asyncChildRoutes, perm.allowedSetForRole(role));
	const leaf = firstLeafRouteName(filtered);
	if (leaf) return leaf;
	return 'dashboard';
}
