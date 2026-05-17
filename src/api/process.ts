import request from '@/utils/request';
import type {
	CompleteTaskPayload,
	ProcessDefinitionDTO,
	ProcessDefinitionListItem,
	StartProcessPayload,
	TaskListItem,
	TraceItem,
} from '@/types/workflow';
import * as processMock from '@/mock/processApiMock';

const USE_MOCK = import.meta.env.VITE_MOCK_PROCESS === 'true';

/** 保存流程定义（LogicFlow 原生 graph JSON + 业务 key/name） */
export async function saveProcessDefinition(body: ProcessDefinitionDTO) {
	if (USE_MOCK) {
		await delay(300);
		return processMock.mockSaveDefinition(body);
	}
	const { data } = await request.post<unknown>('/process/definition', body);
	return data;
}

export async function listProcessDefinitions(): Promise<ProcessDefinitionListItem[]> {
	if (USE_MOCK) {
		await delay(200);
		return processMock.mockListDefinitions();
	}
	const { data } = await request.get<ProcessDefinitionListItem[]>('/process/definition/list');
	return data;
}

export async function getProcessDefinition(key: string): Promise<ProcessDefinitionDTO | null> {
	if (USE_MOCK) {
		await delay(200);
		return processMock.mockGetDefinition(key) ?? null;
	}
	const { data } = await request.get<ProcessDefinitionDTO | null>(
		`/process/definition/${encodeURIComponent(key)}`
	);
	return data;
}

export async function startProcess(body: StartProcessPayload) {
	if (USE_MOCK) {
		await delay(350);
		return processMock.mockStartProcess(body);
	}
	const { data } = await request.post<{ procInstId: string }>('/process/start', body);
	return data;
}

export async function fetchAssignedTasks(): Promise<TaskListItem[]> {
	if (USE_MOCK) {
		await delay(250);
		return processMock.mockAssignedTasks();
	}
	const { data } = await request.get<TaskListItem[]>('/tasks/assigned');
	return data;
}

/** 待办详情（mock 内存；真实后端可改为 GET /tasks/:id） */
export async function fetchTaskDetail(taskId: string): Promise<TaskListItem | null> {
	if (USE_MOCK) {
		await delay(150);
		const t = processMock.mockGetTask(taskId);
		if (!t) return null;
		const { assignee: _assignee, ...rest } = t;
		void _assignee;
		return rest;
	}
	const { data } = await request.get<TaskListItem | null>(`/tasks/${taskId}`);
	return data;
}

export async function completeTask(body: CompleteTaskPayload) {
	if (USE_MOCK) {
		await delay(300);
		return processMock.mockCompleteTask(body);
	}
	const { data } = await request.post<unknown>('/tasks/complete', body);
	return data;
}

export async function fetchProcessTrace(procInstId: string): Promise<TraceItem[]> {
	if (USE_MOCK) {
		await delay(200);
		return processMock.mockTrace(procInstId);
	}
	const { data } = await request.get<TraceItem[]>(`/process/trace/${procInstId}`);
	return data;
}

function delay(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}
