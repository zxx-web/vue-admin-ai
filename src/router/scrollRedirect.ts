import { getActivePinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { usePermissionStore } from '@/stores/permission';

const SCROLL_LEAVES = Array.from({ length: 8 }, (_, i) => `scroll-test-p${i + 1}`);

export function scrollTestRedirect() {
	if (!getActivePinia()) return { name: 'scroll-test-p1' as const };
	const perm = usePermissionStore();
	if (!useAuthStore().role) return { name: 'scroll-test-p1' as const };
	if (perm.allowed.has('scroll-test')) return { name: 'scroll-test-p1' as const };
	for (const n of SCROLL_LEAVES) {
		if (perm.allowed.has(n)) return { name: n };
	}
	return { name: 'dashboard' as const };
}
