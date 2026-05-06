import type { RouteRecordRaw } from 'vue-router';
import { ROLES } from '@/constants/role';

const scrollTestChildren: RouteRecordRaw[] = Array.from({ length: 8 }, (_, i) => {
	const n = i + 1;
	return {
		path: `p${n}`,
		name: `scroll-test-p${n}`,
		component: () => import('@/views/SamplePageView.vue'),
		meta: { requiresAuth: true, title: `测试页 ${String(n).padStart(2, '0')}` },
	};
});

/** 挂载在布局下的异步子路由（登录后按角色过滤再 addRoute） */
export const asyncChildRoutes: RouteRecordRaw[] = [
	{
		path: 'dashboard',
		name: 'dashboard',
		component: () => import('@/views/DashboardView.vue'),
		meta: { requiresAuth: true, title: '仪表盘', icon: 'Odometer' },
	},
	{
		path: 'demo',
		name: 'demo',
		component: () => import('@/views/DemoView.vue'),
		meta: { requiresAuth: true, title: '示例页面', icon: 'Document' },
	},
	{
		path: 'scroll-test',
		name: 'scroll-test',
		redirect: { name: 'scroll-test-p1' },
		component: () => import('@/layouts/ParentView.vue'),
		meta: {
			requiresAuth: true,
			title: '滚动测试',
			icon: 'Grid',
			roles: [ROLES.ADMIN] as const,
		},
		children: scrollTestChildren,
	},
	{
		path: 'system',
		name: 'system',
		redirect: { name: 'system-permission' },
		component: () => import('@/layouts/ParentView.vue'),
		meta: {
			requiresAuth: true,
			title: '系统设置',
			icon: 'Setting',
			roles: [ROLES.ADMIN] as const,
		},
		children: [
			{
				path: 'permission',
				name: 'system-permission',
				component: () => import('@/views/SystemPermissionPlaceholderView.vue'),
				meta: { requiresAuth: true, title: '权限配置' },
			},
		],
	},
];
