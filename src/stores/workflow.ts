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
	resolveFormSchema,
} from '@/utils/processEngine';

/**
 * 流程相关 UI 状态：待办、流程定义（设计器 / 发起 / 审批页共享）。
 */
export const useWorkflowStore = defineStore('workflow', () => {
	const todoList = ref<TaskListItem[]>([]);
	const todoLoading = ref(false);
	const lastMutationTick = ref(0);

	const processList = ref<ProcessDefinitionListItem[]>([]);
	const processListLoading = ref(false);
	const definitionLoading = ref(false);
	const selectedProcessKey = ref<string | null>(null);
	const currentDefinition = ref<ProcessDefinitionDTO | null>(null);
	const draftProcessKey = ref('');
	const draftProcessName = ref('');

	async function refreshTodos() {
		todoLoading.value = true;
		try {
			todoList.value = await fetchAssignedTasks();
		} finally {
			todoLoading.value = false;
		}
	}

	async function refreshProcessList() {
		processListLoading.value = true;
		try {
			processList.value = await listProcessDefinitions();
		} finally {
			processListLoading.value = false;
		}
	}

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

	function clearCurrentDefinition() {
		selectedProcessKey.value = null;
		currentDefinition.value = null;
		draftProcessKey.value = '';
		draftProcessName.value = '';
	}

	async function saveCurrentProcessDefinition(logicflowData: unknown) {
		const key = draftProcessKey.value.trim();
		const name = draftProcessName.value.trim();
		const body: ProcessDefinitionDTO = { key, name, logicflowData };
		await saveProcessDefinitionApi(body);
		currentDefinition.value = body;
		selectedProcessKey.value = key;
		await refreshProcessList();
	}

	function bumpMutationTick() {
		lastMutationTick.value += 1;
	}

	function schemaFromLoadedDefinition(processKey: string, nodeId: string): FormJsonSchema | null {
		if (currentDefinition.value?.key !== processKey) return null;
		const graph = parseLogicFlowGraph(currentDefinition.value.logicflowData);
		if (!graph) return null;
		return resolveFormSchema(getNodeById(graph, nodeId));
	}

	function applyPreviewVariables(): Record<string, unknown> {
		const starterUsername = localStorage.getItem('auth_username') ?? 'guest';
		return buildProcessVariables(starterUsername, {});
	}

	/** 发起页：按当前登录人 starterRole 解析网关后首个「填写申请」的表单 schema */
	async function loadApplyFormSchema(processKey: string): Promise<FormJsonSchema> {
		if (currentDefinition.value?.key !== processKey) {
			const def = await loadProcessDefinition(processKey);
			if (!def) return resolveApplyFormSchema(undefined, applyPreviewVariables());
		}
		return resolveApplyFormSchema(currentDefinition.value?.logicflowData, applyPreviewVariables());
	}

	/** 审批页：展示申请内容用发起节点 schema；当前节点 schema 用于本节点扩展字段 */
	async function loadTaskFormSchemas(
		processKey: string,
		nodeId: string
	): Promise<{ applySchema: FormJsonSchema; taskSchema: FormJsonSchema }> {
		if (currentDefinition.value?.key !== processKey) {
			await loadProcessDefinition(processKey);
		}
		const applySchema = resolveApplyFormSchema(
			currentDefinition.value?.logicflowData,
			applyPreviewVariables()
		);
		const taskSchema = schemaFromLoadedDefinition(processKey, nodeId) ?? applySchema;
		return { applySchema, taskSchema };
	}

	return {
		todoList,
		todoLoading,
		lastMutationTick,
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
		bumpMutationTick,
		loadApplyFormSchema,
		loadTaskFormSchemas,
	};
});
