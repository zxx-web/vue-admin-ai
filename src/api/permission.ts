import request from '@/utils/request';
import type { AppRole } from '@/constants/role';
import {
	normalizeMyRouteNamesFromApi,
	normalizeRouteConfigFromApi,
	type RoleRouteNameConfig,
} from '@/constants/permissions';
import {
	mockFetchAdminRouteConfig,
	mockFetchMyRoutes,
	mockResetAdminRouteConfig,
	mockSaveAdminRouteConfig,
} from '@/mock/permissionApiMock';

const isMock = import.meta.env.VITE_MOCK_AUTH === 'true';

/** GET /permissions/mine */
export async function fetchMyRoutes(role: AppRole) {
	if (isMock) return mockFetchMyRoutes(role);
	const { data } = await request.get<unknown>('/permissions/mine');
	return normalizeMyRouteNamesFromApi(data, role);
}

/** GET /permissions/route-config（管理端） */
export async function fetchAdminRouteConfig() {
	if (isMock) return mockFetchAdminRouteConfig();
	const { data } = await request.get<RoleRouteNameConfig>('/permissions/route-config');
	return normalizeRouteConfigFromApi(data);
}

export async function saveAdminRouteConfig(config: RoleRouteNameConfig) {
	if (isMock) return mockSaveAdminRouteConfig(config);
	await request.put('/permissions/route-config', config);
}

export async function resetAdminRouteConfig() {
	if (isMock) return mockResetAdminRouteConfig();
	const { data } = await request.post<RoleRouteNameConfig>('/permissions/route-config/reset');
	return normalizeRouteConfigFromApi(data);
}
