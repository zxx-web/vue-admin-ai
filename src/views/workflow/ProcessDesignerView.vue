<script setup lang="ts">
import { ElMessage } from 'element-plus';
import LogicFlow from '@logicflow/core';
import { Control, DndPanel, SelectionSelect } from '@logicflow/extension';
import {
	computed,
	nextTick,
	onBeforeUnmount,
	onMounted,
	reactive,
	ref,
	shallowRef,
	watch,
} from 'vue';
import { bpmnDesignerDndItems, registerBpmnNodes } from '@/components/workflow/registerBpmnNodes';
import { useThemeStore } from '@/stores/theme';
import { useWorkflowStore } from '@/stores/workflow';
import type {
	ApproverType,
	FormJsonSchema,
	ProcessDefinitionListItem,
	SequenceFlowProperties,
	UserTaskNodeProperties,
} from '@/types/workflow';
import { isGatewayNode, parseLogicFlowGraph } from '@/utils/processEngine';
import { storeToRefs } from 'pinia';
import '@logicflow/core/lib/style/index.css';
import '@logicflow/extension/lib/style/index.css';

defineOptions({ name: 'ProcessDesignerView' });

const EMPTY_FORM_SCHEMA_JSON = '{\n  "type": "object",\n  "properties": {}\n}';

const containerRef = ref<HTMLElement | null>(null);
const lfRef = shallowRef<LogicFlow | null>(null);
const themeStore = useThemeStore();
const workflow = useWorkflowStore();
const {
	processList,
	processListLoading: listLoading,
	definitionLoading,
	selectedProcessKey: selectedKey,
	draftProcessKey,
	draftProcessName,
} = storeToRefs(workflow);

const drawerVisible = ref(false);
const edgeDrawerVisible = ref(false);
const editingId = ref<string | null>(null);
const editingEdgeId = ref<string | null>(null);
const taskForm = reactive({
	nodeName: '',
	approverType: 'manager' as ApproverType,
	roleCode: 'admin',
	candidateGroup: '',
	formSchemaJson: EMPTY_FORM_SCHEMA_JSON,
});

const schemaParseError = ref('');

const edgeForm = reactive({
	conditionVariable: 'starterRole',
	conditionEquals: '',
	isDefault: false,
});

const editingEdgeFromGateway = computed(() => {
	const lf = lfRef.value;
	const edgeId = editingEdgeId.value;
	if (!lf || !edgeId) return false;
	const edge = lf.getEdgeModelById(edgeId);
	if (!edge?.sourceNodeId) return false;
	const graph = parseLogicFlowGraph(lf.getGraphData());
	if (!graph) return false;
	return isGatewayNode(graph, edge.sourceNodeId);
});

function logicFlowThemeMode() {
	return themeStore.isDark ? 'dark' : 'default';
}

function nodeType(m: { type?: string } | undefined) {
	return m?.type ?? '';
}

const editingIsUserTask = computed(() => {
	const id = editingId.value;
	const lf = lfRef.value;
	if (!id || !lf) return false;
	const m = lf.getNodeModelById(id);
	return nodeType(m) === 'bpmn-user-task';
});

function renderGraphData(data: unknown) {
	const lf = lfRef.value;
	if (!lf) return;
	lf.render((data ?? { nodes: [], edges: [] }) as Parameters<LogicFlow['render']>[0]);
}

/** 取消选中：清空画布与流程元信息 */
function clearCanvas() {
	workflow.clearCurrentDefinition();
	drawerVisible.value = false;
	edgeDrawerVisible.value = false;
	editingId.value = null;
	editingEdgeId.value = null;
	renderGraphData({ nodes: [], edges: [] });
}

function openEdgeDrawer(edgeId: string) {
	const lf = lfRef.value;
	if (!lf) return;
	const edge = lf.getEdgeModelById(edgeId);
	if (!edge?.sourceNodeId) return;
	const graph = parseLogicFlowGraph(lf.getGraphData());
	if (!graph || !isGatewayNode(graph, edge.sourceNodeId)) return;

	const p = (edge.properties ?? {}) as Partial<SequenceFlowProperties>;
	const textLabel =
		typeof edge.text === 'object' && edge.text && 'value' in edge.text
			? String(edge.text.value)
			: typeof edge.text === 'string'
				? edge.text
				: '';

	editingEdgeId.value = edgeId;
	edgeForm.conditionVariable = p.conditionVariable?.trim() || 'starterRole';
	edgeForm.conditionEquals = p.conditionEquals?.trim() || textLabel.trim();
	edgeForm.isDefault = p.isDefault === true;
	edgeDrawerVisible.value = true;
}

function applyEdgeFormToCanvas() {
	const lf = lfRef.value;
	const edgeId = editingEdgeId.value;
	if (!lf || !edgeId) return;

	const props: SequenceFlowProperties = {
		conditionVariable: edgeForm.conditionVariable.trim() || 'starterRole',
		isDefault: edgeForm.isDefault,
	};
	if (!edgeForm.isDefault) {
		const eq = edgeForm.conditionEquals.trim();
		if (!eq) {
			ElMessage.warning('请填写分支值（如 user、manager），或勾选默认流');
			return;
		}
		props.conditionEquals = eq;
	}

	lf.setProperties(edgeId, props as unknown as Record<string, unknown>);
	const label = edgeForm.isDefault ? '默认' : (props.conditionEquals ?? '');
	lf.updateText(edgeId, label);
	edgeDrawerVisible.value = false;
	ElMessage.success('连线条件已更新');
}

function openUserTaskDrawer(nodeId: string) {
	const lf = lfRef.value;
	if (!lf) return;
	const m = lf.getNodeModelById(nodeId);
	if (!m || nodeType(m) !== 'bpmn-user-task') return;
	const p = (m.properties ?? {}) as Partial<UserTaskNodeProperties>;
	const textLabel =
		typeof m.text === 'object' && m.text && 'value' in m.text ? String(m.text.value) : '';

	editingId.value = nodeId;
	taskForm.nodeName = p.nodeName ?? (textLabel || '用户任务');
	taskForm.approverType = p.approverType ?? 'manager';
	taskForm.roleCode = p.roleCode ?? 'admin';
	taskForm.candidateGroup = p.candidateGroup ?? '';
	try {
		taskForm.formSchemaJson = p.formSchema
			? JSON.stringify(p.formSchema, null, 2)
			: EMPTY_FORM_SCHEMA_JSON;
		schemaParseError.value = '';
	} catch {
		taskForm.formSchemaJson = EMPTY_FORM_SCHEMA_JSON;
		schemaParseError.value = '表单 schema 序列化失败';
	}
	drawerVisible.value = true;
}

function applyTaskFormToCanvas() {
	const lf = lfRef.value;
	const id = editingId.value;
	if (!lf || !id) return;
	let schema: FormJsonSchema | undefined;
	try {
		schema = JSON.parse(taskForm.formSchemaJson) as FormJsonSchema;
		if (schema?.type !== 'object' || !schema.properties) {
			throw new Error('schema 需为 { type:"object", properties:{...} }');
		}
		schemaParseError.value = '';
	} catch (e) {
		schemaParseError.value = e instanceof Error ? e.message : 'JSON 无效';
		ElMessage.error(schemaParseError.value);
		return;
	}
	const props: UserTaskNodeProperties = {
		nodeName: taskForm.nodeName,
		approverType: taskForm.approverType,
		roleCode: taskForm.approverType === 'role' ? taskForm.roleCode : undefined,
		candidateGroup:
			taskForm.approverType === 'candidateGroup' ? taskForm.candidateGroup : undefined,
		formSchema: schema,
	};
	lf.setProperties(id, props as unknown as Record<string, unknown>);
	lf.updateText(id, taskForm.nodeName);
	drawerVisible.value = false;
	ElMessage.success('节点属性已更新');
}

async function refreshProcessList() {
	try {
		await workflow.refreshProcessList();
	} catch (e) {
		ElMessage.error(e instanceof Error ? e.message : '加载流程列表失败');
	}
}

async function loadProcessDefinition(key: string) {
	if (!lfRef.value) return;
	try {
		const def = await workflow.loadProcessDefinition(key);
		if (!def) {
			ElMessage.error('流程定义不存在');
			return;
		}
		renderGraphData(def.logicflowData);
	} catch (e) {
		ElMessage.error(e instanceof Error ? e.message : '加载流程失败');
	}
}

function onSelectProcess(item: ProcessDefinitionListItem) {
	if (selectedKey.value === item.key) {
		clearCanvas();
		return;
	}
	void loadProcessDefinition(item.key);
}

async function onSaveDefinition() {
	const lf = lfRef.value;
	if (!lf) return;
	if (!draftProcessKey.value.trim()) {
		ElMessage.warning('请填写流程 Key');
		return;
	}
	const logicflowData = lf.getGraphData();
	try {
		await workflow.saveCurrentProcessDefinition(logicflowData);
		ElMessage.success('流程定义已保存');
	} catch (e) {
		ElMessage.error(e instanceof Error ? e.message : '保存失败');
	}
}

function exportJson() {
	const lf = lfRef.value;
	if (!lf) return;
	const data = lf.getGraphData();
	const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${draftProcessKey.value || 'flow'}.json`;
	a.click();
	URL.revokeObjectURL(url);
}

function triggerImport(ev: Event) {
	const input = ev.target as HTMLInputElement;
	const file = input.files?.[0];
	if (!file) return;
	const reader = new FileReader();
	reader.onload = () => {
		try {
			const raw = String(reader.result ?? '');
			const data = JSON.parse(raw) as unknown;
			renderGraphData(data);
			ElMessage.success('已导入 JSON（未关联左侧列表项，保存时请确认 Key）');
		} catch {
			ElMessage.error('JSON 解析失败');
		}
		input.value = '';
	};
	reader.readAsText(file);
}

onMounted(async () => {
	await nextTick();
	const el = containerRef.value;
	if (!el) return;

	const lf = new LogicFlow({
		container: el,
		grid: { size: 14, visible: true },
		plugins: [DndPanel, Control, SelectionSelect],
		themeMode: logicFlowThemeMode(),
		keyboard: { enabled: true },
		edgeType: 'polyline',
		/** 允许拖拽连线端点改指向、调整折线 */
		adjustEdge: true,
		adjustEdgeStartAndEnd: true,
		adjustEdgeMiddle: true,
		hideAnchors: false,
	});
	registerBpmnNodes(lf);
	lf.render({ nodes: [], edges: [] });
	lf.setPatternItems(bpmnDesignerDndItems());

	lf.on('node:click', ({ data }) => {
		if (data?.type === 'bpmn-user-task') {
			openUserTaskDrawer(data.id);
		}
	});

	lf.on('edge:click', ({ data }) => {
		if (data?.id) openEdgeDrawer(data.id);
	});

	lfRef.value = lf;
	await refreshProcessList();
});

watch(
	() => themeStore.isDark,
	() => {
		lfRef.value?.setTheme({}, logicFlowThemeMode());
	}
);

onBeforeUnmount(() => {
	lfRef.value?.destroy();
	lfRef.value = null;
});
</script>

<template>
	<div class="process-designer">
		<aside class="process-sidebar">
			<div class="sidebar-head">
				<span class="sidebar-title">流程列表</span>
				<el-button link type="primary" :loading="listLoading" @click="refreshProcessList"
					>刷新</el-button
				>
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
							<el-input v-model="draftProcessKey" clearable style="width: 180px" />
						</el-form-item>
						<el-form-item label="流程名称">
							<el-input v-model="draftProcessName" clearable style="width: 200px" />
						</el-form-item>
					</el-form>
					<div class="actions">
						<el-button type="primary" @click="onSaveDefinition">保存到后端</el-button>
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
					点击左侧流程加载/清空。连线：悬停节点出现锚点，从锚点拖到目标节点；排他网关出线可点击配置条件（变量
					starterRole，值 user / manager）。删除：选中节点或连线后按
					Delete。保存后流转按图结构与条件生效。
				</p>
			</el-card>

			<div v-loading="definitionLoading" class="canvas-wrap">
				<div ref="containerRef" class="lf-canvas" />
			</div>
		</div>

		<el-drawer v-model="edgeDrawerVisible" title="排他网关出线条件" size="380px" destroy-on-close>
			<template v-if="editingEdgeFromGateway">
				<el-form label-position="top">
					<el-form-item label="条件变量">
						<el-input v-model="edgeForm.conditionVariable" placeholder="starterRole" />
					</el-form-item>
					<el-form-item label="变量等于（分支标识）">
						<el-select
							v-model="edgeForm.conditionEquals"
							:disabled="edgeForm.isDefault"
							class="w-full"
							allow-create
							filterable
							default-first-option
							placeholder="如 user、manager"
						>
							<el-option label="user（员工路径）" value="user" />
							<el-option label="manager（经理路径）" value="manager" />
						</el-select>
					</el-form-item>
					<el-form-item>
						<el-checkbox v-model="edgeForm.isDefault"
							>默认流（其它分支都不匹配时走此线）</el-checkbox
						>
					</el-form-item>
					<p class="edge-hint">
						发起流程时会写入 starterRole：登录 user → user，manager → manager。与 BPMN
						排他网关一致，仅走一条分支。
					</p>
					<el-button type="primary" @click="applyEdgeFormToCanvas">应用到连线</el-button>
				</el-form>
			</template>
		</el-drawer>

		<el-drawer v-model="drawerVisible" title="用户任务配置" size="400px" destroy-on-close>
			<template v-if="editingIsUserTask">
				<el-form label-position="top">
					<el-form-item label="节点名称">
						<el-input v-model="taskForm.nodeName" placeholder="如：主管审批" />
					</el-form-item>
					<el-form-item label="审批人类型">
						<el-select v-model="taskForm.approverType" class="w-full">
							<el-option label="指定角色" value="role" />
							<el-option label="上级主管（演示派给领导）" value="manager" />
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
					<el-form-item label="关联表单 JSON Schema">
						<el-input v-model="taskForm.formSchemaJson" type="textarea" :rows="12" class="mono" />
					</el-form-item>
					<el-alert
						v-if="schemaParseError"
						:title="schemaParseError"
						type="error"
						show-icon
						class="mb-2"
					/>
					<el-button type="primary" @click="applyTaskFormToCanvas">应用到节点</el-button>
				</el-form>
			</template>
		</el-drawer>
	</div>
</template>

<style scoped>
.process-designer {
	display: flex;
	flex-direction: row;
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
	height: 100%;
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

.toolbar-card {
	flex-shrink: 0;
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

.actions {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	align-items: center;
}

.import-btn {
	cursor: pointer;
}

.hidden-file {
	display: none;
}

.hint {
	margin: 8px 0 0;
	font-size: 13px;
	color: var(--el-text-color-secondary);
	line-height: 1.5;
}

.sidebar-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 12px 8px;
	border-bottom: 1px solid var(--el-border-color-lighter);
	flex-shrink: 0;
}

.sidebar-title {
	font-size: 14px;
	font-weight: 600;
	color: var(--el-text-color-primary);
}

.process-list-scroll {
	flex: 1;
	min-height: 0;
	height: 0;
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
	color: var(--el-text-color-primary);
	line-height: 1.4;
}

.process-item-key {
	display: block;
	margin-top: 2px;
	font-size: 12px;
	color: var(--el-text-color-secondary);
	font-family: ui-monospace, monospace;
}

.canvas-wrap {
	flex: 1;
	min-width: 0;
	min-height: 0;
	display: flex;
	flex-direction: column;
}

.lf-canvas {
	position: relative;
	flex: 1;
	min-height: 0;
	width: 100%;
	border: 1px solid var(--el-border-color);
	border-radius: 8px;
	background: var(--el-bg-color);
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

.edge-hint {
	margin: 0 0 12px;
	font-size: 13px;
	color: var(--el-text-color-secondary);
	line-height: 1.5;
}

.w-full {
	width: 100%;
}
</style>
