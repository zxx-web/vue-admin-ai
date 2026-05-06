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
import { filterRoutesByRole } from '@/router/routeHelpers';
import { useAuthStore } from '@/stores/auth';
import { usePermissionStore } from '@/stores/permission';
import type { AppRole } from '@/constants/role';

function createAdminRootRoute(children: RouteRecordRaw[]): RouteRecordRaw {
	return {
		path: '/',
		name: ROUTE_NAME.ADMIN_ROOT,
		component: () => import('@/layouts/AdminLayout.vue'),
		redirect: '/dashboard',
		meta: { requiresAuth: true, title: '首页' },
		children,
	};
}

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [loginRoute, rootPlaceholderRoute, notFoundRoute],
});

function mountBusinessRoutes(role: AppRole) {
	const filtered = filterRoutesByRole(asyncChildRoutes, role);
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

	router.addRoute(createAdminRootRoute(filtered));
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

	if (to.meta.guestOnly && auth.isLoggedIn) {
		return { name: 'dashboard' };
	}

	if (auth.isLoggedIn && !auth.hasRouteAccess(to.meta.roles)) {
		ElMessage.warning('当前账号无权访问该页面');
		return { name: 'dashboard' };
	}

	return true;
});

export default router;
