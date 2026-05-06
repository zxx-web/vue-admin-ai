import type { RouteRecordRaw } from 'vue-router';

export const ROUTE_NAME = {
	LOGIN: 'login',
	ROOT_PLACEHOLDER: 'RootPlaceholder',
	NOT_FOUND: 'NotFound',
	ADMIN_ROOT: 'AdminRoot',
} as const;

export const loginRoute: RouteRecordRaw = {
	path: '/login',
	name: ROUTE_NAME.LOGIN,
	component: () => import('@/views/LoginView.vue'),
	meta: { guestOnly: true },
};

export const rootPlaceholderRoute: RouteRecordRaw = {
	path: '/',
	name: ROUTE_NAME.ROOT_PLACEHOLDER,
	redirect: '/login',
};

export const notFoundRoute: RouteRecordRaw = {
	path: '/:pathMatch(.*)*',
	name: ROUTE_NAME.NOT_FOUND,
	component: () => import('@/views/NotFoundView.vue'),
	meta: { hidden: true, title: '页面不存在' },
};
