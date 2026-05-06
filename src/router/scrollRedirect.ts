import { getActivePinia } from 'pinia';
import type { RouteLocationGeneric, RouteLocationNormalizedLoaded } from 'vue-router';
import { getFirstAllowedRouteName } from '@/router/firstAllowedRoute';
import { useAuthStore } from '@/stores/auth';
import { usePermissionConfigStore } from '@/stores/permissionConfig';

const SCROLL_LEAF_ORDER: string[] = Array.from({ length: 8 }, (_, i) => `scroll-test-p${i + 1}`);

/** 进入 /scroll-test 时跳到当前角色允许的第一个子页 */
export function scrollTestRedirect(to: RouteLocationGeneric, from: RouteLocationNormalizedLoaded) {
	void to;
	void from;
	const pinia = getActivePinia();
	if (!pinia) return { name: 'scroll-test-p1' as const };
	const auth = useAuthStore();
	const perm = usePermissionConfigStore();
	perm.loadFromStorage();
	if (!auth.role) return { name: 'scroll-test-p1' as const };
	const allowed = perm.allowedSetForRole(auth.role);
	if (allowed.has('scroll-test')) return { name: 'scroll-test-p1' as const };
	for (const n of SCROLL_LEAF_ORDER) {
		if (allowed.has(n)) return { name: n };
	}
	return { name: getFirstAllowedRouteName(auth.role) };
}
