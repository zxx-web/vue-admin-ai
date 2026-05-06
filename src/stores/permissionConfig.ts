import { ref } from 'vue';
import { defineStore } from 'pinia';
import type { RouteRecordNameGeneric } from 'vue-router';
import type { AppRole } from '@/constants/role';
import {
	PERMISSION_STORAGE_KEY,
	type RoleRouteNameConfig,
	defaultRoleRouteConfig,
	parseStoredPermissionConfig,
} from '@/constants/permissions';

export const usePermissionConfigStore = defineStore('permissionConfig', () => {
	const config = ref<RoleRouteNameConfig>(
		parseStoredPermissionConfig(localStorage.getItem(PERMISSION_STORAGE_KEY))
	);

	function loadFromStorage() {
		config.value = parseStoredPermissionConfig(localStorage.getItem(PERMISSION_STORAGE_KEY));
	}

	function allowedSetForRole(role: AppRole): Set<string> {
		return new Set(config.value[role] ?? []);
	}

	/** 当前路由是否允许访问 */
	function isRouteAllowed(role: AppRole | null, name: RouteRecordNameGeneric): boolean {
		if (name == null || typeof name !== 'string') return true;
		if (!role) return false;
		return allowedSetForRole(role).has(name);
	}

	function setAllowedNames(role: AppRole, names: string[]) {
		config.value = { ...config.value, [role]: [...names] };
	}

	function persist() {
		localStorage.setItem(PERMISSION_STORAGE_KEY, JSON.stringify(config.value));
	}

	function resetToDefaults() {
		config.value = defaultRoleRouteConfig();
		persist();
	}

	return {
		config,
		loadFromStorage,
		allowedSetForRole,
		isRouteAllowed,
		setAllowedNames,
		persist,
		resetToDefaults,
	};
});
