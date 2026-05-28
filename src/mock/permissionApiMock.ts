import { ROLES, type AppRole } from '@/constants/role';
import {
	defaultRoleRouteConfig,
	normalizeRouteConfigFromApi,
	type RoleRouteNameConfig,
} from '@/constants/permissions';

function cloneConfig(c: RoleRouteNameConfig): RoleRouteNameConfig {
	return {
		[ROLES.ADMIN]: [...c[ROLES.ADMIN]],
		[ROLES.MANAGER]: [...c[ROLES.MANAGER]],
		[ROLES.OPERATOR]: [...c[ROLES.OPERATOR]],
	};
}

/** 模拟管理端库表 */
let serverConfig: RoleRouteNameConfig = cloneConfig(defaultRoleRouteConfig());

function delay(ms: number) {
	return new Promise<void>((r) => setTimeout(r, ms));
}

/** GET /permissions/mine（按 token 对应角色取切片） */
export async function mockFetchMyRoutes(role: AppRole): Promise<string[]> {
	await delay(200);
	return [...(serverConfig[role] ?? [])];
}

/** GET /permissions/route-config（管理端） */
export async function mockFetchAdminRouteConfig(): Promise<RoleRouteNameConfig> {
	await delay(200);
	return cloneConfig(serverConfig);
}

/** PUT /permissions/route-config */
export async function mockSaveAdminRouteConfig(config: RoleRouteNameConfig): Promise<void> {
	await delay(200);
	serverConfig = normalizeRouteConfigFromApi(config);
}

/** POST /permissions/route-config/reset */
export async function mockResetAdminRouteConfig(): Promise<RoleRouteNameConfig> {
	await delay(200);
	serverConfig = cloneConfig(defaultRoleRouteConfig());
	return cloneConfig(serverConfig);
}
