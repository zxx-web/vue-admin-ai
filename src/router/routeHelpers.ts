import type { RouteRecordRaw } from 'vue-router';
import type { AppRole } from '@/constants/role';

/** 按角色过滤异步子路由（无 meta.roles 或角色命中则保留） */
export function filterRoutesByRole(routes: RouteRecordRaw[], role: AppRole): RouteRecordRaw[] {
	const res: RouteRecordRaw[] = [];
	for (const route of routes) {
		const roles = route.meta?.roles as readonly AppRole[] | undefined;
		if (roles?.length && !roles.includes(role)) continue;

		if (route.children?.length) {
			const children = filterRoutesByRole(route.children, role);
			if (!children.length) continue;
			res.push({ ...route, children });
			continue;
		}

		res.push({ ...route });
	}
	return res;
}

export type MenuNode = {
	fullPath: string;
	title: string;
	icon?: string;
	children?: MenuNode[];
};

function joinParentPath(parentFull: string, segment: string): string {
	if (!segment) return parentFull || '/';
	if (segment.startsWith('/')) return segment;
	// 只保留路径段，避免出现 //scroll-test/p1 这类非法路径
	const base = parentFull === '/' ? '' : parentFull.replace(/^\/+|\/+$/g, '');
	return `/${[base, segment].filter(Boolean).join('/')}`;
}

/** 将已挂载的、当前用户可见的子路由转为侧边栏树（尊重 meta.hidden） */
export function routesToMenuTree(routes: RouteRecordRaw[], parentFullPath = '/'): MenuNode[] {
	const items: MenuNode[] = [];
	for (const r of routes) {
		if (r.meta?.hidden) continue;
		const fullPath = joinParentPath(parentFullPath, r.path);

		if (r.children?.length) {
			const children = routesToMenuTree(r.children, fullPath);
			if (!children.length) continue;
			items.push({
				fullPath,
				title: (r.meta?.title as string) ?? '',
				icon: r.meta?.icon as string | undefined,
				children,
			});
			continue;
		}

		if (r.component) {
			items.push({
				fullPath,
				title: (r.meta?.title as string) ?? '',
				icon: r.meta?.icon as string | undefined,
			});
		}
	}
	return items;
}
