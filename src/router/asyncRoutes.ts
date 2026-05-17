import type { RouteRecordRaw } from 'vue-router';
import { scrollTestRedirect } from '@/router/scrollRedirect';

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
		redirect: scrollTestRedirect,
		component: () => import('@/layouts/ParentView.vue'),
		meta: {
			requiresAuth: true,
			title: '滚动测试',
			icon: 'Grid',
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
		},
		children: [
			{
				path: 'permission',
				name: 'system-permission',
				component: () => import('@/views/SystemPermissionView.vue'),
				meta: { requiresAuth: true, title: '权限配置' },
			},
		],
	},
	{
		path: 'workflow',
		name: 'workflow',
		redirect: { name: 'workflow-designer' },
		component: () => import('@/layouts/ParentView.vue'),
		meta: {
			requiresAuth: true,
			title: '流程管理',
			icon: 'Connection',
		},
		children: [
			{
				path: 'designer',
				name: 'workflow-designer',
				component: () => import('@/views/workflow/ProcessDesignerView.vue'),
				meta: { requiresAuth: true, title: '流程设计器' },
			},
		],
	},
	{
		path: 'leave',
		name: 'leave',
		component: () => import('@/layouts/ParentView.vue'),
		meta: {
			requiresAuth: true,
			title: '请假审批',
			icon: 'Calendar',
		},
		children: [
			{
				path: 'apply',
				name: 'leave-apply',
				component: () => import('@/views/leave/LeaveApplyView.vue'),
				meta: { requiresAuth: true, title: '发起请假' },
			},
			{
				path: 'todos',
				name: 'leave-todos',
				component: () => import('@/views/leave/LeaveTodoListView.vue'),
				meta: { requiresAuth: true, title: '待办审批' },
			},
			{
				path: 'approve/:taskId',
				name: 'leave-task-approve',
				component: () => import('@/views/leave/LeaveTaskApproveView.vue'),
				meta: { requiresAuth: true, title: '审批详情', hidden: true },
			},
		],
	},
];
