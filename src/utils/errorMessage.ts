/** 将 unknown 异常转为可展示文案 */
export function errorMessage(e: unknown, fallback: string): string {
	return e instanceof Error ? e.message : fallback;
}
