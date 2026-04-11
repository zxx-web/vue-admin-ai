import { createRouter, createWebHistory } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ROLES } from '@/constants/role';
import { useAuthStore } from '@/stores/auth';

const scrollTestRoutes = Array.from({ length: 8 }, (_, i) => {
	const n = i + 1;
	const path = `scroll-test/p${n}`;
	return {
		path,
		name: `scroll-test-p${n}`,
		component: () => import('@/views/SamplePageView.vue'),
		meta: {
			requiresAuth: true,
			title: `测试页 ${String(n).padStart(2, '0')}`,
			roles: [ROLES.ADMIN] as const,
		},
	};
});

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: '/login',
			name: 'login',
			component: () => import('@/views/LoginView.vue'),
			meta: { guestOnly: true },
		},
		{
			path: '/',
			component: () => import('@/layouts/AdminLayout.vue'),
			// 勿设 hidden: true，会合并到子路由导致页签不收录
			meta: { requiresAuth: true, title: '首页' },
			redirect: '/dashboard',
			children: [
				{
					path: 'dashboard',
					name: 'dashboard',
					component: () => import('@/views/DashboardView.vue'),
					meta: { requiresAuth: true, title: '仪表盘' },
				},
				{
					path: 'demo',
					name: 'demo',
					component: () => import('@/views/DemoView.vue'),
					meta: { requiresAuth: true, title: '示例页面' },
				},
				...scrollTestRoutes,
			],
		},
	],
});

router.beforeEach((to) => {
	const auth = useAuthStore();
	auth.syncFromStorage();

	if (to.meta.requiresAuth && !auth.isLoggedIn) {
		return { name: 'login', query: { redirect: to.fullPath } };
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

const a = 1;
export default router;
