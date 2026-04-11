import { ref } from 'vue';
import { defineStore } from 'pinia';
import type { RouteLocationNormalizedLoaded, RouteRecordNameGeneric } from 'vue-router';

export type VisitedTab = {
	path: string;
	fullPath: string;
	name: RouteRecordNameGeneric;
	title: string;
};

export const useTabsStore = defineStore('tabs', () => {
	const visited = ref<VisitedTab[]>([]);

	function addFromRoute(route: RouteLocationNormalizedLoaded) {
		if (route.meta.hidden) return;
		const title = route.meta.title ?? String(route.name ?? '未命名');
		const idx = visited.value.findIndex((t) => t.path === route.path);
		if (idx === -1) {
			visited.value.push({
				path: route.path,
				fullPath: route.fullPath,
				name: route.name,
				title,
			});
		} else {
			const cur = visited.value[idx];
			if (cur) cur.fullPath = route.fullPath;
		}
	}

	function remove(path: string) {
		const i = visited.value.findIndex((t) => t.path === path);
		if (i === -1) return;
		visited.value.splice(i, 1);
	}

	function reset() {
		visited.value = [];
	}

	return { visited, addFromRoute, remove, reset };
});
