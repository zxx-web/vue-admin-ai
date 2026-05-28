import { getActivePinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import type { RouteLocationNormalized, RouteRecordRaw } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
	loginRoute,
	notFoundRoute,
	rootPlaceholderRoute,
	ROUTE_NAME,
} from '@/router/constantRoutes';
import { useAuthStore } from '@/stores/auth';
import { usePermissionStore } from '@/stores/permission';
const SKIP_RETRY_NAMES = new Set<string>([
	ROUTE_NAME.NOT_FOUND,
	ROUTE_NAME.ROOT_PLACEHOLDER,
	ROUTE_NAME.LOGIN,
]);

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [loginRoute, rootPlaceholderRoute, notFoundRoute],
});

function removeIfExists(name: string) {
	if (router.hasRoute(name)) router.removeRoute(name);
}

function createAdminRoot(children: RouteRecordRaw[]): RouteRecordRaw {
	const perm = usePermissionStore();
	return {
		path: '/',
		name: ROUTE_NAME.ADMIN_ROOT,
		component: () => import('@/layouts/AdminLayout.vue'),
		redirect: () => {
			const first = children[0];
			if (!first?.path) return { name: perm.firstRouteName() };
			const p = first.path;
			return { path: p.startsWith('/') ? p : `/${p}` };
		},
		meta: { requiresAuth: true, title: '首页' },
		children,
	};
}

function mountRoutes() {
	const perm = usePermissionStore();
	const children = perm.menuRoutes;
	removeIfExists(ROUTE_NAME.ROOT_PLACEHOLDER);
	removeIfExists(ROUTE_NAME.NOT_FOUND);
	removeIfExists(ROUTE_NAME.ADMIN_ROOT);
	router.addRoute(createAdminRoot(children));
	router.addRoute(notFoundRoute);
}

function retryAfterMount(to: RouteLocationNormalized) {
	const perm = usePermissionStore();
	const name = typeof to.name === 'string' ? to.name : '';
	if (name && !SKIP_RETRY_NAMES.has(name) && router.hasRoute(name)) {
		return { name, params: to.params, query: to.query, hash: to.hash, replace: true };
	}
	if (to.path && to.path !== '/' && to.path !== '/login') {
		return { path: to.path, query: to.query, hash: to.hash, replace: true };
	}
	return { name: perm.firstRouteName(), query: to.query, hash: to.hash, replace: true };
}

export function resetDynamicRoutes() {
	removeIfExists(ROUTE_NAME.ADMIN_ROOT);
	removeIfExists(ROUTE_NAME.NOT_FOUND);
	if (!router.hasRoute(ROUTE_NAME.ROOT_PLACEHOLDER)) {
		router.addRoute(rootPlaceholderRoute);
	}
	router.addRoute(notFoundRoute);
	if (getActivePinia()) usePermissionStore().reset();
}

/** 用 store 里已有的权限重新 addRoute；调用前须已 perm.load。一次 replace：能留当前页则留，否则直接去首页 */
export async function remountBusinessRoutes() {
	const auth = useAuthStore();
	if (!auth.isLoggedIn || !auth.role || !router.hasRoute(ROUTE_NAME.ADMIN_ROOT)) return;
	const perm = usePermissionStore();
	const loc = router.currentRoute.value;
	mountRoutes();
	const name = typeof loc.name === 'string' ? loc.name : '';
	const target =
		name && !perm.isRouteAllowed(name)
			? { name: perm.firstRouteName() }
			: { path: loc.path, query: { ...loc.query }, hash: loc.hash };
	return router.replace(target);
}

router.beforeEach(async (to) => {
	const auth = useAuthStore();
	auth.syncFromStorage();

	if (!auth.isLoggedIn) {
		if (to.name === ROUTE_NAME.NOT_FOUND) {
			return { name: ROUTE_NAME.LOGIN, query: { redirect: to.fullPath } };
		}
		if (to.meta.requiresAuth) {
			return { name: ROUTE_NAME.LOGIN, query: { redirect: to.fullPath } };
		}
		return true;
	}

	if (!auth.role) {
		auth.clearSession();
		return { name: ROUTE_NAME.LOGIN };
	}

	const perm = usePermissionStore();
	try {
		await perm.load(auth.role);
	} catch {
		ElMessage.error('权限加载失败');
		return false;
	}

	if (!router.hasRoute(ROUTE_NAME.ADMIN_ROOT)) {
		mountRoutes();
		return retryAfterMount(to);
	}

	if (to.meta.guestOnly) return { name: perm.firstRouteName() };

	if (!perm.isRouteAllowed(to.name)) {
		ElMessage.warning('无权访问该页面');
		return { name: perm.firstRouteName() };
	}

	return true;
});

export default router;
