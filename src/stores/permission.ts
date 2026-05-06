import { ref } from 'vue';
import { defineStore } from 'pinia';
import type { RouteRecordRaw } from 'vue-router';

/** 当前用户可见的布局子路由（与动态 addRoute 的 children 一致，供菜单渲染） */
export const usePermissionStore = defineStore('permission', () => {
	const menuRoutes = ref<RouteRecordRaw[]>([]);

	function setMenuRoutes(routes: RouteRecordRaw[]) {
		menuRoutes.value = routes;
	}

	function reset() {
		menuRoutes.value = [];
	}

	return { menuRoutes, setMenuRoutes, reset };
});
