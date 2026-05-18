import { ElMessage } from 'element-plus';
import LogicFlow from '@logicflow/core';
import { Control, DndPanel, SelectionSelect } from '@logicflow/extension';
import { storeToRefs } from 'pinia';
import type { Ref } from 'vue';
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
import { CONDITION_OPERATORS, EMPTY_FORM_SCHEMA_JSON } from '@/constants/workflowDesigner';
import { useThemeStore } from '@/stores/theme';
import { useWorkflowStore } from '@/stores/workflow';
import type {
	ApproverType,
	FormJsonSchema,
	ProcessDefinitionListItem,
	SequenceFlowProperties,
	UserTaskNodeProperties,
} from '@/types/workflow';
import { errorMessage } from '@/utils/errorMessage';
import { logicFlowTextLabel } from '@/utils/logicFlowModel';
import {
	formatEdgeConditionLabel,
	isGatewayNode,
	parseLogicFlowGraph,
} from '@/utils/processEngine';

/** 流程设计器：LogicFlow 画布、定义列表、节点/连线属性抽屉 */
export function useProcessDesigner(containerRef: Ref<HTMLElement | null>) {
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
	const schemaParseError = ref('');

	const taskForm = reactive({
		nodeName: '',
		approverType: 'manager' as ApproverType,
		roleCode: 'admin',
		candidateGroup: '',
		formSchemaJson: EMPTY_FORM_SCHEMA_JSON,
	});

	const edgeForm = reactive({
		conditionVariable: 'starterRole',
		conditionOperator: 'eq' as (typeof CONDITION_OPERATORS)[number]['value'],
		conditionValue: '',
		isDefault: false,
	});

	const editingEdgeFromGateway = computed(() => {
		const lf = lfRef.value;
		const edgeId = editingEdgeId.value;
		if (!lf || !edgeId) return false;
		const edge = lf.getEdgeModelById(edgeId);
		if (!edge?.sourceNodeId) return false;
		const graph = parseLogicFlowGraph(lf.getGraphData());
		return Boolean(graph && isGatewayNode(graph, edge.sourceNodeId));
	});

	const editingIsUserTask = computed(() => {
		const lf = lfRef.value;
		const id = editingId.value;
		if (!lf || !id) return false;
		return String(lf.getNodeModelById(id)?.type ?? '') === 'bpmn-user-task';
	});

	function logicFlowThemeMode() {
		return themeStore.isDark ? 'dark' : 'default';
	}

	/** 将 graph JSON 渲染到画布 */
	function renderGraphData(data: unknown) {
		const lf = lfRef.value;
		if (!lf) return;
		lf.render((data ?? { nodes: [], edges: [] }) as Parameters<LogicFlow['render']>[0]);
	}

	/** 清空画布与 store 中的当前定义 */
	function clearCanvas() {
		workflow.clearCurrentDefinition();
		drawerVisible.value = false;
		edgeDrawerVisible.value = false;
		editingId.value = null;
		editingEdgeId.value = null;
		renderGraphData({ nodes: [], edges: [] });
	}

	/** 打开排他网关出线条件抽屉 */
	function openEdgeDrawer(edgeId: string) {
		const lf = lfRef.value;
		if (!lf) return;
		const edge = lf.getEdgeModelById(edgeId);
		if (!edge?.sourceNodeId) return;
		const graph = parseLogicFlowGraph(lf.getGraphData());
		if (!graph || !isGatewayNode(graph, edge.sourceNodeId)) return;

		const p = (edge.properties ?? {}) as Partial<SequenceFlowProperties>;
		editingEdgeId.value = edgeId;
		edgeForm.conditionVariable = p.conditionVariable?.trim() || 'starterRole';
		edgeForm.conditionOperator = p.conditionOperator ?? 'eq';
		edgeForm.conditionValue =
			p.conditionValue !== undefined && p.conditionValue !== null
				? String(p.conditionValue)
				: p.conditionEquals?.trim() || logicFlowTextLabel(edge.text);
		edgeForm.isDefault = p.isDefault === true;
		edgeDrawerVisible.value = true;
	}

	/** 将连线条件表单写回 LogicFlow edge.properties */
	function applyEdgeFormToCanvas() {
		const lf = lfRef.value;
		const edgeId = editingEdgeId.value;
		if (!lf || !edgeId) return;

		const props: SequenceFlowProperties = {
			conditionVariable: edgeForm.conditionVariable.trim() || 'starterRole',
			isDefault: edgeForm.isDefault,
		};
		if (!edgeForm.isDefault) {
			const raw = edgeForm.conditionValue.trim();
			if (!raw) {
				ElMessage.warning('请填写比较值，或勾选默认流');
				return;
			}
			props.conditionOperator = edgeForm.conditionOperator;
			const num = Number(raw);
			props.conditionValue = !Number.isNaN(num) && /^-?\d+(\.\d+)?$/.test(raw) ? num : raw;
			if (edgeForm.conditionOperator === 'eq') props.conditionEquals = raw;
		}

		lf.setProperties(edgeId, props as unknown as Record<string, unknown>);
		const label = edgeForm.isDefault
			? '默认'
			: formatEdgeConditionLabel({
					variable: props.conditionVariable ?? 'starterRole',
					operator: props.conditionOperator ?? 'eq',
					value: props.conditionValue ?? props.conditionEquals,
				});
		lf.updateText(edgeId, label);
		edgeDrawerVisible.value = false;
		ElMessage.success('连线条件已更新');
	}

	/** 打开用户任务节点配置抽屉 */
	function openUserTaskDrawer(nodeId: string) {
		const lf = lfRef.value;
		if (!lf) return;
		const m = lf.getNodeModelById(nodeId);
		if (!m || String(m.type) !== 'bpmn-user-task') return;

		const p = (m.properties ?? {}) as Partial<UserTaskNodeProperties>;
		editingId.value = nodeId;
		taskForm.nodeName = p.nodeName ?? (logicFlowTextLabel(m.text) || '用户任务');
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

	/** 将用户任务配置写回节点 properties */
	function applyTaskFormToCanvas() {
		const lf = lfRef.value;
		const id = editingId.value;
		if (!lf || !id) return;

		let schema: FormJsonSchema;
		try {
			schema = JSON.parse(taskForm.formSchemaJson) as FormJsonSchema;
			if (schema?.type !== 'object' || !schema.properties) {
				throw new Error('schema 需为 { type:"object", properties:{...} }');
			}
			schemaParseError.value = '';
		} catch (e) {
			schemaParseError.value = errorMessage(e, 'JSON 无效');
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
			ElMessage.error(errorMessage(e, '加载流程列表失败'));
		}
	}

	/** 从后端加载定义并渲染 */
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
			ElMessage.error(errorMessage(e, '加载流程失败'));
		}
	}

	/** 左侧列表点击：再次点击同一项则清空画布 */
	function onSelectProcess(item: ProcessDefinitionListItem) {
		if (selectedKey.value === item.key) {
			clearCanvas();
			return;
		}
		void loadProcessDefinition(item.key);
	}

	/** 保存当前画布为流程定义 */
	async function onSaveDefinition() {
		const lf = lfRef.value;
		if (!lf) return;
		if (!draftProcessKey.value.trim()) {
			ElMessage.warning('请填写流程 Key');
			return;
		}
		try {
			await workflow.saveCurrentProcessDefinition(lf.getGraphData());
			ElMessage.success('流程定义已保存');
		} catch (e) {
			ElMessage.error(errorMessage(e, '保存失败'));
		}
	}

	function isTypingTarget(target: EventTarget | null): boolean {
		if (!target || !(target instanceof HTMLElement)) return false;
		const tag = target.tagName;
		return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
	}

	function focusCanvas() {
		containerRef.value?.focus({ preventScroll: true });
	}

	/** 删除画布上当前选中的节点/连线 */
	function deleteSelectedElements(): boolean {
		const lf = lfRef.value;
		if (!lf || lf.graphModel.textEditElement) return false;

		const elements = lf.getSelectElements(true);
		if (elements.nodes.length === 0 && elements.edges.length === 0) return false;

		const deletedNodeIds = new Set(
			elements.nodes.map((n) => n.id).filter((id): id is string => Boolean(id))
		);
		const deletedEdgeIds = new Set(
			elements.edges.map((e) => e.id).filter((id): id is string => Boolean(id))
		);

		if (editingId.value && deletedNodeIds.has(editingId.value)) {
			drawerVisible.value = false;
			editingId.value = null;
		}
		if (editingEdgeId.value && deletedEdgeIds.has(editingEdgeId.value)) {
			edgeDrawerVisible.value = false;
			editingEdgeId.value = null;
		}

		lf.clearSelectElements();
		elements.edges.forEach((edge) => edge.id && lf.deleteEdge(edge.id));
		elements.nodes.forEach((node) => node.id && lf.deleteNode(node.id));
		return true;
	}

	function onDesignerKeydown(e: KeyboardEvent) {
		if (e.key !== 'Delete' && e.key !== 'Backspace') return;
		if (isTypingTarget(e.target)) return;
		if (!deleteSelectedElements()) return;
		e.preventDefault();
		e.stopPropagation();
	}

	function onDeleteSelectedClick() {
		if (!deleteSelectedElements()) {
			ElMessage.warning('请先单击选中要删除的节点或连线');
		}
	}

	/** 导出画布 JSON 文件 */
	function exportJson() {
		const lf = lfRef.value;
		if (!lf) return;
		const blob = new Blob([JSON.stringify(lf.getGraphData(), null, 2)], {
			type: 'application/json',
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${draftProcessKey.value || 'flow'}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	/** 从本地 JSON 文件导入画布 */
	function triggerImport(ev: Event) {
		const input = ev.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			try {
				renderGraphData(JSON.parse(String(reader.result ?? '')) as unknown);
				ElMessage.success('已导入 JSON（保存时请确认流程 Key）');
			} catch {
				ElMessage.error('JSON 解析失败');
			}
			input.value = '';
		};
		reader.readAsText(file);
	}

	/** 初始化 LogicFlow 实例与事件绑定 */
	async function initCanvas() {
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
			adjustEdge: true,
			adjustEdgeStartAndEnd: true,
			adjustEdgeMiddle: true,
			hideAnchors: false,
		});
		registerBpmnNodes(lf);
		lf.render({ nodes: [], edges: [] });
		lf.setPatternItems(bpmnDesignerDndItems());

		lf.on('blank:click', focusCanvas);
		lf.on('node:click', ({ data }) => {
			focusCanvas();
			if (data?.type === 'bpmn-user-task') openUserTaskDrawer(data.id);
		});
		lf.on('edge:click', ({ data }) => {
			focusCanvas();
			if (data?.id) openEdgeDrawer(data.id);
		});
		lf.keyboard.on(['delete', 'del', 'backspace'], (e) => {
			if (isTypingTarget(e.target)) return;
			if (deleteSelectedElements()) e.preventDefault();
		});

		window.addEventListener('keydown', onDesignerKeydown, true);
		lfRef.value = lf;
		focusCanvas();
		await refreshProcessList();
	}

	onMounted(() => void initCanvas());

	watch(
		() => themeStore.isDark,
		() => lfRef.value?.setTheme({}, logicFlowThemeMode())
	);

	onBeforeUnmount(() => {
		window.removeEventListener('keydown', onDesignerKeydown, true);
		lfRef.value?.destroy();
		lfRef.value = null;
	});

	return {
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
	};
}
