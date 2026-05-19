<script setup lang="ts">
import { ref } from 'vue';
import { CONDITION_OPERATORS } from '@/constants/workflowDesigner';
import { useProcessDesigner } from '@/composables/workflow/useProcessDesigner';
import '@logicflow/core/lib/style/index.css';
import '@logicflow/extension/lib/style/index.css';

defineOptions({ name: 'ProcessDesignerView' });

const containerRef = ref<HTMLElement | null>(null);

const {
	processList,
	listLoading,
	definitionLoading,
	selectedKey,
	draftProcessKey,
	draftProcessName,
	drawerVisible,
	edgeDrawerVisible,
	editingEdgeFromGateway,
	editingIsUserTask,
	taskForm,
	edgeForm,
	schemaParseError,
	refreshProcessList,
	onSelectProcess,
	onSaveDefinition,
	onDeleteSelectedClick,
	exportJson,
	triggerImport,
	applyEdgeFormToCanvas,
	applyTaskFormToCanvas,
} = useProcessDesigner(containerRef);
</script>

<template>
	<div class="process-designer">
		<aside class="process-sidebar">
			<div class="sidebar-head">
				<span class="sidebar-title">流程列表</span>
				<el-button link type="primary" :loading="listLoading" @click="refreshProcessList">
					刷新
				</el-button>
			</div>
			<el-scrollbar v-loading="listLoading" class="process-list-scroll">
				<ul v-if="processList.length" class="process-list">
					<li
						v-for="item in processList"
						:key="item.key"
						class="process-item"
						:class="{ 'is-active': selectedKey === item.key }"
						@click="onSelectProcess(item)"
					>
						<span class="process-item-name">{{ item.name }}</span>
						<span class="process-item-key">{{ item.key }}</span>
					</li>
				</ul>
				<el-empty v-else description="暂无流程定义" :image-size="64" />
			</el-scrollbar>
		</aside>

		<div class="designer-main">
			<el-card shadow="never" class="toolbar-card">
				<div class="toolbar">
					<el-form inline class="meta-form">
						<el-form-item label="流程 Key">
							<el-input v-model="draftProcessKey" clearable class="field-key" />
						</el-form-item>
						<el-form-item label="流程名称">
							<el-input v-model="draftProcessName" clearable class="field-name" />
						</el-form-item>
					</el-form>
					<div class="actions">
						<el-button type="primary" @click="onSaveDefinition">保存到后端</el-button>
						<el-button @click="onDeleteSelectedClick">删除选中</el-button>
						<el-button @click="exportJson">导出 JSON</el-button>
						<el-button tag="label" class="import-btn">
							导入 JSON
							<input
								type="file"
								accept="application/json,.json"
								class="hidden-file"
								@change="triggerImport"
							/>
						</el-button>
					</div>
				</div>
				<p class="hint">
					点击左侧流程加载或清空。排他网关出线可配置条件（如 starterRole = user、days &gt;
					3），并设默认流。 删除：选中后按 Delete / Backspace 或点「删除选中」。
				</p>
			</el-card>

			<div v-loading="definitionLoading" class="canvas-wrap">
				<div ref="containerRef" class="lf-canvas" tabindex="-1" />
			</div>
		</div>

		<el-drawer v-model="edgeDrawerVisible" title="排他网关出线条件" size="380px" destroy-on-close>
			<el-form v-if="editingEdgeFromGateway" label-position="top">
				<el-form-item label="条件变量">
					<el-input
						v-model="edgeForm.conditionVariable"
						:disabled="edgeForm.isDefault"
						placeholder="如 starterRole、days"
					/>
				</el-form-item>
				<el-form-item label="比较方式">
					<el-select
						v-model="edgeForm.conditionOperator"
						:disabled="edgeForm.isDefault"
						class="w-full"
					>
						<el-option
							v-for="op in CONDITION_OPERATORS"
							:key="op.value"
							:label="op.label"
							:value="op.value"
						/>
					</el-select>
				</el-form-item>
				<el-form-item label="比较值">
					<el-input
						v-model="edgeForm.conditionValue"
						:disabled="edgeForm.isDefault"
						placeholder="如 user、3"
					/>
				</el-form-item>
				<el-form-item>
					<el-checkbox v-model="edgeForm.isDefault">默认流（其它分支都不匹配时走此线）</el-checkbox>
				</el-form-item>
				<p class="drawer-hint">
					表单字段在发起后写入流程变量；示例：days &gt; 3 走主管，默认流直接结束。
				</p>
				<el-button type="primary" @click="applyEdgeFormToCanvas">应用到连线</el-button>
			</el-form>
		</el-drawer>

		<el-drawer v-model="drawerVisible" title="用户任务配置" size="400px" destroy-on-close>
			<el-form v-if="editingIsUserTask" label-position="top">
				<el-form-item label="节点名称">
					<el-input v-model="taskForm.nodeName" placeholder="如：主管审批" />
				</el-form-item>
				<el-form-item label="审批人类型">
					<el-select v-model="taskForm.approverType" class="w-full">
						<el-option label="指定角色" value="role" />
						<el-option label="上级主管" value="manager" />
						<el-option label="候选人组" value="candidateGroup" />
					</el-select>
				</el-form-item>
				<el-form-item v-if="taskForm.approverType === 'role'" label="角色编码">
					<el-select v-model="taskForm.roleCode" class="w-full">
						<el-option label="admin（领导）" value="admin" />
						<el-option label="manager（经理）" value="manager" />
						<el-option label="operator（员工）" value="operator" />
					</el-select>
				</el-form-item>
				<el-form-item v-if="taskForm.approverType === 'candidateGroup'" label="候选人组 ID">
					<el-input v-model="taskForm.candidateGroup" />
				</el-form-item>
				<el-form-item label="本节点表单 JSON Schema">
					<el-input v-model="taskForm.formSchemaJson" type="textarea" :rows="12" class="mono" />
				</el-form-item>
				<p class="drawer-hint">
					申请节点配置请假字段；审批节点配置办理意见等。办理页会只读展示<strong>发起人路径上首个用户任务</strong>的表单，并渲染<strong>当前节点</strong>表单供填写。
				</p>
				<el-alert
					v-if="schemaParseError"
					:title="schemaParseError"
					type="error"
					show-icon
					class="mb-2"
				/>
				<el-button type="primary" @click="applyTaskFormToCanvas">应用到节点</el-button>
			</el-form>
		</el-drawer>
	</div>
</template>

<style scoped>
.process-designer {
	display: flex;
	gap: 12px;
	height: calc(100vh - 56px - 49px - 32px);
	min-height: 360px;
	min-width: 0;
}

.process-sidebar {
	flex: 0 0 220px;
	display: flex;
	flex-direction: column;
	min-height: 0;
	border: 1px solid var(--el-border-color);
	border-radius: 8px;
	background: var(--el-bg-color);
}

.designer-main {
	flex: 1;
	min-width: 0;
	min-height: 0;
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.toolbar-card :deep(.el-card__body) {
	padding: 12px 16px;
}

.toolbar {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-start;
	justify-content: space-between;
	gap: 12px;
}

.meta-form {
	margin-bottom: 0;
}

.field-key {
	width: 180px;
}

.field-name {
	width: 200px;
}

.actions {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.import-btn {
	cursor: pointer;
}

.hidden-file {
	display: none;
}

.hint,
.drawer-hint {
	margin: 8px 0 0;
	font-size: 13px;
	line-height: 1.5;
	color: var(--el-text-color-secondary);
}

.drawer-hint {
	margin: 0 0 12px;
}

.sidebar-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 12px 8px;
	border-bottom: 1px solid var(--el-border-color-lighter);
}

.sidebar-title {
	font-size: 14px;
	font-weight: 600;
}

.process-list-scroll {
	flex: 1;
	min-height: 0;
}

.process-list-scroll :deep(.el-scrollbar) {
	height: 100%;
}

.process-list {
	margin: 0;
	padding: 8px;
	list-style: none;
}

.process-item {
	padding: 10px 12px;
	margin-bottom: 4px;
	border-radius: 6px;
	cursor: pointer;
	transition: background-color 0.15s;
}

.process-item:hover {
	background: var(--el-fill-color-light);
}

.process-item.is-active {
	background: var(--el-color-primary-light-9);
}

.process-item-name {
	display: block;
	font-size: 14px;
	line-height: 1.4;
}

.process-item-key {
	display: block;
	margin-top: 2px;
	font-size: 12px;
	font-family: ui-monospace, monospace;
	color: var(--el-text-color-secondary);
}

.canvas-wrap {
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
}

.lf-canvas {
	flex: 1;
	min-height: 0;
	border: 1px solid var(--el-border-color);
	border-radius: 8px;
	background: var(--el-bg-color);
	outline: none;
}

.lf-canvas :deep(.lf-dndpanel) {
	background: var(--el-bg-color-overlay);
	border: 1px solid var(--el-border-color-lighter);
	box-shadow: var(--el-box-shadow-light);
}

.lf-canvas :deep(.lf-dnd-text) {
	color: var(--el-text-color-primary);
}

.lf-canvas :deep(.lf-dnd-item .lf-dnd-shape) {
	background-image: none;
}

.lf-canvas :deep(.lf-dnd-item.bpmn-dnd-start .lf-dnd-shape) {
	border-radius: 50%;
	background-color: #73d13d;
	border: 2px solid #237804;
}

.lf-canvas :deep(.lf-dnd-item.bpmn-dnd-end .lf-dnd-shape) {
	border-radius: 50%;
	background-color: #ffccc7;
	border: 2px solid #a8071a;
}

.lf-canvas :deep(.lf-dnd-item.bpmn-dnd-user-task .lf-dnd-shape) {
	width: 40px;
	height: 26px;
	border-radius: 4px;
	background-color: #e6f7ff;
	border: 2px solid #1890ff;
}

.lf-canvas :deep(.lf-dnd-item.bpmn-dnd-gateway .lf-dnd-shape) {
	width: 26px;
	height: 26px;
	border-radius: 2px;
	background-color: #fff7e6;
	border: 2px solid #d48806;
	transform: rotate(45deg);
}

.mono :deep(textarea) {
	font-family: ui-monospace, monospace;
	font-size: 12px;
}

.w-full {
	width: 100%;
}

.mb-2 {
	margin-bottom: 8px;
}
</style>
