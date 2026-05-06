import type { AppRole } from '@/constants/role';
import { asyncChildRoutes } from '@/router/asyncRoutes';
import { filterRoutesByAllowedNames } from '@/router/routeHelpers';
import { usePermissionConfigStore } from '@/stores/permissionConfig';

/** 当前角色过滤后第一个可访问子路由的 name（用于登录后首页、无权限回退等） */
export function getFirstAllowedRouteName(role: AppRole | null): string {
	if (!role) return 'dashboard';
	const perm = usePermissionConfigStore();
	perm.loadFromStorage();
	const filtered = filterRoutesByAllowedNames(asyncChildRoutes, perm.allowedSetForRole(role));
	const n = filtered[0]?.name;
	if (typeof n === 'string') return n;
	return 'demo';
}
