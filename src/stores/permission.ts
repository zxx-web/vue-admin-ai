import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { RouteRecordNameGeneric, RouteRecordRaw } from 'vue-router';
import type { AppRole } from '@/constants/role';
import { expandRouteKeysForAccessCheck } from '@/constants/permissions';
import { fetchMyRoutes } from '@/api/permission';
import { asyncChildRoutes } from '@/router/asyncRoutes';
import { filterRoutesByAllowedNames } from '@/router/routeHelpers';
import { ROUTE_NAME } from '@/router/constantRoutes';

const PUBLIC_NAMES = new Set<string>([
	ROUTE_NAME.LOGIN,
	ROUTE_NAME.ROOT_PLACEHOLDER,
	ROUTE_NAME.NOT_FOUND,
	ROUTE_NAME.ADMIN_ROOT,
]);

function firstLeafName(routes: RouteRecordRaw[]): string | undefined {
	for (const r of routes) {
		if (r.children?.length) {
			const n = firstLeafName(r.children);
			if (n) return n;
		} else if (typeof r.name === 'string') {
			return r.name;
		}
	}
}

export const usePermissionStore = defineStore('permission', () => {
	const allowedNames = ref<string[]>([]);
	let ready: Promise<void> | undefined;
	let cachedRole: AppRole | null = null;

	const allowed = computed(() => expandRouteKeysForAccessCheck(allowedNames.value));
	const menuRoutes = computed(() => filterRoutesByAllowedNames(asyncChildRoutes, allowed.value));

	async function load(role: AppRole) {
		if (cachedRole === role && ready) return ready;
		cachedRole = role;
		ready = (async () => {
			allowedNames.value = await fetchMyRoutes(role);
		})();
		return ready;
	}

	function reset() {
		allowedNames.value = [];
		cachedRole = null;
		ready = undefined;
	}

	function isRouteAllowed(name: RouteRecordNameGeneric) {
		if (typeof name !== 'string') return true;
		if (PUBLIC_NAMES.has(name)) return true;
		return allowed.value.has(name);
	}

	function firstRouteName() {
		return firstLeafName(menuRoutes.value) ?? 'dashboard';
	}

	return { menuRoutes, allowed, load, reset, isRouteAllowed, firstRouteName };
});
