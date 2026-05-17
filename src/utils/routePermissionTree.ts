/** 滚动测试子路由 name，与 asyncRoutes 一致 */
export const SCROLL_TEST_LEAVES: string[] = Array.from(
	{ length: 8 },
	(_, i) => `scroll-test-p${i + 1}`
);

const SYSTEM_CHILD = 'system-permission';

/**
 * 父子联动模式下 getCheckedKeys(false) 的结果 → 存入配置的精简列表
 * - 某分组「全选」→ 只存父路由 name（如 scroll-test / system）
 * - 部分子路由 → 只存被选中的子 name
 */
export function normalizeTreeCheckedToStorage(checkedKeys: string[]): string[] {
	const set = new Set(checkedKeys);
	const out: string[] = [];

	if (set.has('dashboard')) out.push('dashboard');
	if (set.has('demo')) out.push('demo');

	const allScrollLeaves = SCROLL_TEST_LEAVES.every((k) => set.has(k));
	const scrollParent = set.has('scroll-test');
	if (scrollParent || allScrollLeaves) {
		out.push('scroll-test');
	} else {
		for (const k of SCROLL_TEST_LEAVES) {
			if (set.has(k)) out.push(k);
		}
	}

	const sysParent = set.has('system');
	const sysChild = set.has(SYSTEM_CHILD);
	if (sysParent && sysChild) {
		out.push('system');
	} else if (sysParent) {
		out.push('system');
	} else if (sysChild) {
		out.push(SYSTEM_CHILD);
	}

	const wfParent = set.has('workflow');
	const wfChild = set.has('workflow-designer');
	if (wfParent && wfChild) {
		out.push('workflow');
	} else if (wfParent) {
		out.push('workflow');
	} else if (wfChild) {
		out.push('workflow-designer');
	}

	const LEAVE_CHILDREN = ['leave-apply', 'leave-todos'] as const;
	const leaveParent = set.has('leave');
	const allLeaveChildren = LEAVE_CHILDREN.every((k) => set.has(k));
	if (leaveParent || allLeaveChildren) {
		out.push('leave');
	} else {
		for (const k of LEAVE_CHILDREN) {
			if (set.has(k)) out.push(k);
		}
	}
	if (set.has('leave-task-approve')) {
		out.push('leave-task-approve');
	}

	return out;
}

/** 配置中的 name → setCheckedKeys 用的 keys（父子联动下只传父即可全选子） */
export function storageKeysToTreeCheckedKeys(stored: string[]): string[] {
	const set = new Set(stored);
	const out: string[] = [];

	if (set.has('dashboard')) out.push('dashboard');
	if (set.has('demo')) out.push('demo');

	if (set.has('scroll-test')) {
		out.push('scroll-test');
	} else {
		for (const k of SCROLL_TEST_LEAVES) {
			if (set.has(k)) out.push(k);
		}
	}

	if (set.has('system')) {
		out.push('system');
	} else if (set.has(SYSTEM_CHILD)) {
		out.push(SYSTEM_CHILD);
	}

	if (set.has('workflow')) {
		out.push('workflow');
		out.push('workflow-designer');
	} else if (set.has('workflow-designer')) {
		out.push('workflow-designer');
	}

	if (set.has('leave')) {
		out.push('leave');
		out.push('leave-apply');
		out.push('leave-todos');
		out.push('leave-task-approve');
	} else {
		if (set.has('leave-apply')) out.push('leave-apply');
		if (set.has('leave-todos')) out.push('leave-todos');
		if (set.has('leave-task-approve')) out.push('leave-task-approve');
	}

	return out;
}
