import 'vue-router';
import type { AppRole } from '@/constants/role';

declare module 'vue-router' {
	interface RouteMeta {
		/** 菜单与面包屑标题 */
		title?: string;
		/** 是否在侧边菜单中隐藏 */
		hidden?: boolean;
		requiresAuth?: boolean;
		guestOnly?: boolean;
		/** 允许访问的角色；不填则登录即可访问 */
		roles?: readonly AppRole[];
	}
}

export {};
