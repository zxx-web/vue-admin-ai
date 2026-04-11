/** 应用内角色（与后端约定保持一致即可） */
export const ROLES = {
	/** 全部菜单与「滚动测试」路由 */
	ADMIN: 'admin',
	/** 仅基础功能，无滚动测试 */
	OPERATOR: 'operator',
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<AppRole, string> = {
	[ROLES.ADMIN]: '管理员',
	[ROLES.OPERATOR]: '运营',
};

export function isAppRole(v: string | null | undefined): v is AppRole {
	return v === ROLES.ADMIN || v === ROLES.OPERATOR;
}
