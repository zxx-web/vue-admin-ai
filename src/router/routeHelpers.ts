import type { RouteRecordRaw } from 'vue-router';

/**
 * 按路由 name 过滤。
 * - 勾选父级 name（如 scroll-test）表示允许整组子路由
 * - 仅勾选部分子级（如 scroll-test-p2）则只注册这些子路由，父级作为容器保留
 */
export function filterRoutesByAllowedNames(
	routes: RouteRecordRaw[],
	allowed: Set<string>
): RouteRecordRaw[] {
	const res: RouteRecordRaw[] = [];
	for (const route of routes) {
		const name = route.name != null ? String(route.name) : '';
		if (route.children?.length) {
			const parentCoversAll = name && allowed.has(name);
			const nextChildren = parentCoversAll
				? route.children.map((c) => ({ ...c }))
				: filterRoutesByAllowedNames(route.children, allowed);
			if (nextChildren.length > 0) {
				res.push({ ...route, children: nextChildren });
			}
			continue;
		}
		if (name && allowed.has(name)) {
			res.push({ ...route });
		}
	}
	return res;
}

export type PermissionTreeNode = {
	name: string;
	label: string;
	children?: PermissionTreeNode[];
};

/** 权限配置页用（与侧边栏结构一致，含仪表盘） */
export function buildRoutePermissionTree(routes: RouteRecordRaw[]): PermissionTreeNode[] {
	return routes.map((r) => {
		const name = String(r.name ?? '');
		const label = (r.meta?.title as string) || name;
		if (!r.children?.length) {
			return { name, label };
		}
		return {
			name,
			label,
			children: r.children.map((c) => ({
				name: String(c.name ?? ''),
				label: (c.meta?.title as string) || String(c.name),
			})),
		};
	});
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
