import { ref } from 'vue';
import { defineStore } from 'pinia';
import {
	fetchAssignedTasks,
	getProcessDefinition,
	listProcessDefinitions,
	saveProcessDefinition as saveProcessDefinitionApi,
} from '@/api/process';
import type {
	FormJsonSchema,
	ProcessDefinitionDTO,
	ProcessDefinitionListItem,
	TaskListItem,
} from '@/types/workflow';
import {
	buildProcessVariables,
	getNodeById,
	parseLogicFlowGraph,
	resolveApplyFormSchema,
	resolveNodeFormSchema,
} from '@/utils/processEngine';

/** 流程相关 UI 状态：待办、流程定义（设计器 / 发起 / 审批页共享） */
export const useWorkflowStore = defineStore('workflow', () => {
	const todoList = ref<TaskListItem[]>([]);
	const todoLoading = ref(false);

	const processList = ref<ProcessDefinitionListItem[]>([]);
	const processListLoading = ref(false);
	const definitionLoading = ref(false);
	const selectedProcessKey = ref<string | null>(null);
	const currentDefinition = ref<ProcessDefinitionDTO | null>(null);
	const draftProcessKey = ref('');
	const draftProcessName = ref('');

	/** 拉取当前用户的待办任务列表 */
	async function refreshTodos() {
		todoLoading.value = true;
		try {
			todoList.value = await fetchAssignedTasks();
		} finally {
			todoLoading.value = false;
		}
	}

	/** 拉取已发布的流程定义列表（设计器侧栏 / 发起页下拉） */
	async function refreshProcessList() {
		processListLoading.value = true;
		try {
			processList.value = await listProcessDefinitions();
		} finally {
			processListLoading.value = false;
		}
	}

	/** 按 key 加载流程定义并同步到设计器草稿字段 */
	async function loadProcessDefinition(key: string): Promise<ProcessDefinitionDTO | null> {
		definitionLoading.value = true;
		try {
			const def = await getProcessDefinition(key);
			if (!def) return null;
			selectedProcessKey.value = key;
			currentDefinition.value = def;
			draftProcessKey.value = def.key;
			draftProcessName.value = def.name;
			return def;
		} finally {
			definitionLoading.value = false;
		}
	}

	/** 清空设计器当前选中与草稿 */
	function clearCurrentDefinition() {
		selectedProcessKey.value = null;
		currentDefinition.value = null;
		draftProcessKey.value = '';
		draftProcessName.value = '';
	}

	/** 将设计器草稿（key/name + 画布 JSON）保存到后端 */
	async function saveCurrentProcessDefinition(logicflowData: unknown) {
		const body: ProcessDefinitionDTO = {
			key: draftProcessKey.value.trim(),
			name: draftProcessName.value.trim(),
			logicflowData,
		};
		await saveProcessDefinitionApi(body);
		currentDefinition.value = body;
		selectedProcessKey.value = body.key;
		await refreshProcessList();
	}

	/** 按发起人解析流程变量（含 starterRole），用于走网关找申请节点 */
	function variablesForStarter(starterUsername: string): Record<string, unknown> {
		return buildProcessVariables(starterUsername, {});
	}

	/**
	 * 加载「填写申请」节点的表单 schema（路径上首个用户任务）。
	 * @param starterUsername 不传则用当前登录人（发起页预览）；审批页应传实例发起人
	 */
	async function loadApplyFormSchema(
		processKey: string,
		starterUsername?: string
	): Promise<FormJsonSchema> {
		const starter = starterUsername ?? localStorage.getItem('auth_username') ?? 'guest';
		const vars = variablesForStarter(starter);
		if (currentDefinition.value?.key !== processKey) {
			const def = await loadProcessDefinition(processKey);
			if (!def) return resolveApplyFormSchema(undefined, vars);
		}
		return resolveApplyFormSchema(currentDefinition.value?.logicflowData, vars);
	}

	/** 审批页：申请内容 schema（按发起人路径）+ 当前节点办理表单 schema */
	async function loadTaskFormSchemas(
		processKey: string,
		nodeId: string,
		starterUsername: string
	): Promise<{ applySchema: FormJsonSchema; taskSchema: FormJsonSchema }> {
		if (currentDefinition.value?.key !== processKey) {
			await loadProcessDefinition(processKey);
		}
		const vars = variablesForStarter(starterUsername);
		const logicflow = currentDefinition.value?.logicflowData;
		const applySchema = resolveApplyFormSchema(logicflow, vars);
		const graph = parseLogicFlowGraph(logicflow);
		const node = graph ? getNodeById(graph, nodeId) : undefined;
		const taskSchema = resolveNodeFormSchema(node);
		return { applySchema, taskSchema };
	}

	return {
		todoList,
		todoLoading,
		processList,
		processListLoading,
		definitionLoading,
		selectedProcessKey,
		currentDefinition,
		draftProcessKey,
		draftProcessName,
		refreshTodos,
		refreshProcessList,
		loadProcessDefinition,
		clearCurrentDefinition,
		saveCurrentProcessDefinition,
		loadApplyFormSchema,
		loadTaskFormSchemas,
	};
});
