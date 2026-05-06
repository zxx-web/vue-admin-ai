<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { ElTree } from 'element-plus';
import { ElMessage } from 'element-plus';
import { ROLE_LABELS, ROLES, type AppRole } from '@/constants/role';
import type { RoleRouteNameConfig } from '@/constants/permissions';
import { asyncChildRoutes } from '@/router/asyncRoutes';
import { buildRoutePermissionTree } from '@/router/routeHelpers';
import {
	normalizeTreeCheckedToStorage,
	storageKeysToTreeCheckedKeys,
} from '@/utils/routePermissionTree';
import { getFirstAllowedRouteName } from '@/router/firstAllowedRoute';
import { remountBusinessRoutes } from '@/router';
import { useAuthStore } from '@/stores/auth';
import { usePermissionConfigStore } from '@/stores/permissionConfig';

defineOptions({ name: 'SystemPermissionView' });

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const permCfg = usePermissionConfigStore();

const treeRef = ref<InstanceType<typeof ElTree>>();
const selectedRole = ref<AppRole>(ROLES.ADMIN);
const treeData = buildRoutePermissionTree(asyncChildRoutes);

const draft = ref<RoleRouteNameConfig>({
	[ROLES.ADMIN]: [],
	[ROLES.OPERATOR]: [],
});

function pullDraft() {
	permCfg.loadFromStorage();
	draft.value = {
		[ROLES.ADMIN]: [...permCfg.config[ROLES.ADMIN]],
		[ROLES.OPERATOR]: [...permCfg.config[ROLES.OPERATOR]],
	};
}

function syncTreeFromDraft() {
	nextTick(() => {
		const keys = storageKeysToTreeCheckedKeys(draft.value[selectedRole.value]);
		treeRef.value?.setCheckedKeys(keys, false);
	});
}

onMounted(() => {
	pullDraft();
	syncTreeFromDraft();
});

watch(selectedRole, (_newRole, oldRole) => {
	if (oldRole && treeRef.value) {
		const checked = (treeRef.value.getCheckedKeys(false) as string[]) ?? [];
		draft.value[oldRole] = normalizeTreeCheckedToStorage(checked);
	}
	syncTreeFromDraft();
});

function onTreeCheck() {
	const checked = (treeRef.value?.getCheckedKeys(false) as string[]) ?? [];
	draft.value[selectedRole.value] = normalizeTreeCheckedToStorage(checked);
}

async function onSave() {
	permCfg.setAllowedNames(ROLES.ADMIN, draft.value[ROLES.ADMIN]);
	permCfg.setAllowedNames(ROLES.OPERATOR, draft.value[ROLES.OPERATOR]);
	permCfg.persist();
	await remountBusinessRoutes();
	if (
		auth.role &&
		!permCfg.isRouteAllowed(auth.role, 'system-permission') &&
		route.path.startsWith('/system')
	) {
		await router.replace({ name: getFirstAllowedRouteName(auth.role) });
	}
	ElMessage.success('已保存');
}

async function onResetDefault() {
	permCfg.resetToDefaults();
	pullDraft();
	syncTreeFromDraft();
	await remountBusinessRoutes();
	ElMessage.info('已恢复默认');
}
</script>

<template>
	<div class="permission-page">
		<el-card shadow="never" class="card">
			<template #header>
				<div class="head">
					<span class="title">权限配置</span>
					<div class="actions">
						<el-button @click="onResetDefault">恢复默认</el-button>
						<el-button type="primary" @click="onSave">保存</el-button>
					</div>
				</div>
			</template>

			<div class="toolbar">
				<span class="toolbar-label">配置角色</span>
				<el-select v-model="selectedRole" class="role-select" :teleported="false">
					<el-option :label="ROLE_LABELS[ROLES.ADMIN]" :value="ROLES.ADMIN" />
					<el-option :label="ROLE_LABELS[ROLES.OPERATOR]" :value="ROLES.OPERATOR" />
				</el-select>
				<span class="toolbar-hint">
					勾选父路由即全选子路由；取消父路由即清空子路由。任一侧仍勾选子路由时父路由为半选；子路由全部取消后父路由也不选中。未勾选的路由不可访问。
				</span>
			</div>

			<el-tree
				ref="treeRef"
				class="perm-tree"
				:data="treeData"
				show-checkbox
				node-key="name"
				default-expand-all
				:props="{ label: 'label', children: 'children' }"
				@check="onTreeCheck"
			/>
		</el-card>
	</div>
</template>

<style scoped>
.permission-page {
	width: 100%;
	min-width: 0;
	box-sizing: border-box;
}

.card {
	width: 100%;
	max-width: none;
	box-sizing: border-box;
}

.head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	flex-wrap: wrap;
}

.title {
	font-weight: 600;
}

.actions {
	display: flex;
	gap: 8px;
}

.toolbar {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 10px 16px;
	margin-bottom: 16px;
}

.toolbar-label {
	font-size: 14px;
	color: var(--el-text-color-regular);
}

.role-select {
	width: 160px;
}

.toolbar-hint {
	font-size: 13px;
	color: var(--el-text-color-secondary);
	flex: 1;
	min-width: 200px;
}

.perm-tree {
	width: 100%;
	padding: 8px 0;
	border: 1px solid var(--el-border-color-lighter);
	border-radius: var(--el-border-radius-base);
}
</style>
