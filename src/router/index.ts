import { getActivePinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { ElMessage } from 'element-plus';
import { asyncChildRoutes } from '@/router/asyncRoutes';
import {
	loginRoute,
	notFoundRoute,
	rootPlaceholderRoute,
	ROUTE_NAME,
} from '@/router/constantRoutes';
import { getFirstAllowedRouteName } from '@/router/firstAllowedRoute';
import { filterRoutesByAllowedNames } from '@/router/routeHelpers';
import { useAuthStore } from '@/stores/auth';
import { usePermissionConfigStore } from '@/stores/permissionConfig';
import { usePermissionStore } from '@/stores/permission';
import type { AppRole } from '@/constants/role';

function createAdminRootRoute(children: RouteRecordRaw[], role: AppRole): RouteRecordRaw {
	return {
		path: '/',
		name: ROUTE_NAME.ADMIN_ROOT,
		component: () => import('@/layouts/AdminLayout.vue'),
		redirect: () => {
			const first = children[0];
			if (!first?.path) return { name: getFirstAllowedRouteName(role) };
			const p = first.path;
			return { path: p.startsWith('/') ? p : `/${p}` };
		},
		meta: { requiresAuth: true, title: '首页' },
		children,
	};
}

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [loginRoute, rootPlaceholderRoute, notFoundRoute],
});

function mountBusinessRoutes(role: AppRole) {
	const permCfg = usePermissionConfigStore();
	permCfg.loadFromStorage();
	const filtered = filterRoutesByAllowedNames(asyncChildRoutes, permCfg.allowedSetForRole(role));
	const permission = usePermissionStore();
	permission.setMenuRoutes(filtered);

	if (router.hasRoute(ROUTE_NAME.ROOT_PLACEHOLDER)) {
		router.removeRoute(ROUTE_NAME.ROOT_PLACEHOLDER);
	}
	if (router.hasRoute(ROUTE_NAME.NOT_FOUND)) {
		router.removeRoute(ROUTE_NAME.NOT_FOUND);
	}
	if (router.hasRoute(ROUTE_NAME.ADMIN_ROOT)) {
		router.removeRoute(ROUTE_NAME.ADMIN_ROOT);
	}

	router.addRoute(createAdminRootRoute(filtered, role));
	router.addRoute(notFoundRoute);
}

export function resetDynamicRoutes() {
	if (router.hasRoute(ROUTE_NAME.ADMIN_ROOT)) {
		router.removeRoute(ROUTE_NAME.ADMIN_ROOT);
	}
	if (router.hasRoute(ROUTE_NAME.NOT_FOUND)) {
		router.removeRoute(ROUTE_NAME.NOT_FOUND);
	}
	if (!router.hasRoute(ROUTE_NAME.ROOT_PLACEHOLDER)) {
		router.addRoute(rootPlaceholderRoute);
	}
	router.addRoute(notFoundRoute);
	if (getActivePinia()) {
		usePermissionStore().reset();
	}
}

/** 权限配置变更后重新注册动态路由并刷新当前页匹配 */
export function remountBusinessRoutes() {
	const auth = useAuthStore();
	if (!auth.isLoggedIn || !auth.role || !router.hasRoute(ROUTE_NAME.ADMIN_ROOT)) return;
	const loc = router.currentRoute.value;
	mountBusinessRoutes(auth.role);
	return router.replace({ path: loc.path, query: { ...loc.query }, hash: loc.hash });
}

router.beforeEach((to) => {
	const auth = useAuthStore();
	auth.syncFromStorage();

	if (auth.isLoggedIn && auth.role && !router.hasRoute(ROUTE_NAME.ADMIN_ROOT)) {
		mountBusinessRoutes(auth.role);
		return { path: to.path, query: to.query, hash: to.hash, replace: true };
	}

	if (to.name === ROUTE_NAME.NOT_FOUND && !auth.isLoggedIn) {
		return { name: ROUTE_NAME.LOGIN, query: { redirect: to.fullPath } };
	}

	if (to.meta.requiresAuth && !auth.isLoggedIn) {
		return { name: ROUTE_NAME.LOGIN, query: { redirect: to.fullPath } };
	}

	if (to.meta.guestOnly && auth.isLoggedIn && auth.role) {
		return { name: getFirstAllowedRouteName(auth.role) };
	}

	const permCfg = usePermissionConfigStore();
	permCfg.loadFromStorage();
	if (auth.isLoggedIn && auth.role && !permCfg.isRouteAllowed(auth.role, to.name)) {
		ElMessage.warning('当前账号无权访问该页面');
		return { name: getFirstAllowedRouteName(auth.role) };
	}

	return true;
});

export default router;
