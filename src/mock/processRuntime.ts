/**
 * Mock 流程运行时：根据 LogicFlow 图驱动实例状态与任务流转，与设计器/前端共用 processEngine。
 */
import { createLeaveProcessSeedData } from '@/constants/leaveProcessDefinitionSeed';
import type {
	CompleteTaskPayload,
	ProcessDefinitionDTO,
	StartProcessPayload,
	TaskListItem,
	TraceItem,
} from '@/types/workflow';
import {
	buildProcessVariables,
	findEndNode,
	findNextFlowTarget,
	getFirstUserTaskFromStart,
	getNodeLabel,
	parseLogicFlowGraph,
	resolveFormSchema,
	resolveTaskAssignee,
	shouldAutoCompleteOnStart,
	type ParsedGraph,
	type ParsedNode,
} from '@/utils/processEngine';

function nowIso() {
	return new Date().toISOString();
}

function readCurrentUsername(): string {
	return localStorage.getItem('auth_username') ?? 'guest';
}

export type RuntimeTask = TaskListItem & {
	assignee: string;
	nodeId: string;
	status: 'open' | 'done';
};

type ProcessInstance = {
	procInstId: string;
	processKey: string;
	starterUsername: string;
	startTime: string;
	variables: Record<string, unknown>;
	status: 'running' | 'completed' | 'rejected';
};

const definitions = new Map<string, ProcessDefinitionDTO>();
const instances = new Map<string, ProcessInstance>();
const traces = new Map<string, TraceItem[]>();
const tasks = new Map<string, RuntimeTask>();

function ensureSeedDefinition() {
	const key = 'leave_process';
	if (definitions.has(key)) return;
	definitions.set(key, {
		key,
		name: '员工请假',
		logicflowData: createLeaveProcessSeedData(),
	});
}

function getDefinition(key: string): ProcessDefinitionDTO | undefined {
	ensureSeedDefinition();
	return definitions.get(key);
}

function requireGraph(def: ProcessDefinitionDTO): ParsedGraph {
	const graph = parseLogicFlowGraph(def.logicflowData);
	if (!graph) throw new Error('流程定义图无效');
	return graph;
}

function pushTrace(procInstId: string, item: TraceItem) {
	const list = traces.get(procInstId) ?? [];
	list.push(item);
	traces.set(procInstId, list);
}

function finishInstance(
	inst: ProcessInstance,
	procInstId: string,
	graph: ParsedGraph,
	rejected: boolean
) {
	inst.status = rejected ? 'rejected' : 'completed';
	const end = findEndNode(graph);
	pushTrace(procInstId, {
		nodeId: end?.id,
		nodeName: end ? getNodeLabel(end) : '结束',
		action: rejected ? '已驳回并结束' : '流程结束',
		operator: 'system',
		time: nowIso(),
	});
}

function createOpenTask(inst: ProcessInstance, node: ParsedNode): RuntimeTask {
	const taskId = `tk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
	const assignee = resolveTaskAssignee(node, { starterUsername: inst.starterUsername });
	const task: RuntimeTask = {
		taskId,
		taskName: getNodeLabel(node),
		nodeId: node.id,
		procInstId: inst.procInstId,
		processKey: inst.processKey,
		starterUsername: inst.starterUsername,
		startTime: inst.startTime,
		variables: { ...inst.variables },
		formSchema: resolveFormSchema(node),
		assignee,
		status: 'open',
	};
	tasks.set(taskId, task);
	return task;
}

/** 从首个用户任务起，跳过发起人自己的节点，直到需要他人处理或结束 */
function advanceAfterStart(inst: ProcessInstance, graph: ParsedGraph): RuntimeTask | null {
	const vars = inst.variables;
	const startNode = getFirstUserTaskFromStart(graph, vars);
	if (!startNode) {
		finishInstance(inst, inst.procInstId, graph, false);
		return null;
	}

	let current: ParsedNode | null = startNode;
	while (current) {
		if (shouldAutoCompleteOnStart(graph, current, inst.starterUsername, vars)) {
			pushTrace(inst.procInstId, {
				nodeId: current.id,
				nodeName: getNodeLabel(current),
				action: '已提交',
				operator: inst.starterUsername,
				time: nowIso(),
			});
			const next = findNextFlowTarget(graph, current.id, vars);
			if (!next) {
				finishInstance(inst, inst.procInstId, graph, false);
				return null;
			}
			if (next.kind === 'end') {
				finishInstance(inst, inst.procInstId, graph, false);
				return null;
			}
			current = next.node;
			continue;
		}
		return createOpenTask(inst, current);
	}
	return null;
}

/** 审批通过后沿图推进；驳回则直接结束 */
function advanceAfterComplete(
	inst: ProcessInstance,
	graph: ParsedGraph,
	completedNodeId: string,
	approved: boolean,
	operator: string,
	comment?: string
): RuntimeTask | null {
	const completed = graph.nodes.get(completedNodeId);
	if (completed) {
		pushTrace(inst.procInstId, {
			nodeId: completed.id,
			nodeName: getNodeLabel(completed),
			action: approved ? '通过' : '驳回',
			operator,
			comment,
			time: nowIso(),
		});
	}

	if (!approved) {
		finishInstance(inst, inst.procInstId, graph, true);
		return null;
	}

	const next = findNextFlowTarget(graph, completedNodeId, inst.variables);
	if (!next) {
		finishInstance(inst, inst.procInstId, graph, false);
		return null;
	}
	if (next.kind === 'end') {
		finishInstance(inst, inst.procInstId, graph, false);
		return null;
	}

	return createOpenTask(inst, next.node);
}

export function mockSaveDefinition(body: ProcessDefinitionDTO) {
	definitions.set(body.key, { ...body });
	return { ok: true };
}

export function mockListDefinitions(): { key: string; name: string }[] {
	ensureSeedDefinition();
	return [...definitions.values()].map((d) => ({ key: d.key, name: d.name }));
}

export function mockGetDefinition(key: string): ProcessDefinitionDTO | undefined {
	return getDefinition(key);
}

export function mockStartProcess(body: StartProcessPayload) {
	const def = getDefinition(body.processKey);
	if (!def) throw new Error('流程定义不存在');

	const procInstId = `pi_${Date.now()}`;
	const starter = readCurrentUsername();
	const graph = requireGraph(def);

	const inst: ProcessInstance = {
		procInstId,
		processKey: body.processKey,
		starterUsername: starter,
		startTime: nowIso(),
		variables: buildProcessVariables(starter, body.variables),
		status: 'running',
	};
	instances.set(procInstId, inst);

	const start = [...graph.nodes.values()].find((n) => n.type === 'bpmn-start');
	pushTrace(procInstId, {
		nodeId: start?.id,
		nodeName: start ? getNodeLabel(start) : '开始',
		action: '流程已发起',
		operator: starter,
		time: nowIso(),
	});

	const firstTask = advanceAfterStart(inst, graph);
	return { procInstId, firstTaskId: firstTask?.taskId };
}

export function mockAssignedTasks(): TaskListItem[] {
	const me = readCurrentUsername();
	return [...tasks.values()]
		.filter((t) => t.status === 'open' && t.assignee === me)
		.map((t) => {
			const { assignee, status, ...rest } = t;
			void assignee;
			void status;
			return rest;
		});
}

export function mockGetTask(
	taskId: string
): (TaskListItem & { assignee: string; nodeId: string }) | null {
	const t = tasks.get(taskId);
	if (!t || t.status !== 'open') return null;
	const { status, ...rest } = t;
	void status;
	return rest;
}

export function mockCompleteTask(body: CompleteTaskPayload) {
	const t = tasks.get(body.taskId);
	if (!t) throw new Error('任务不存在');
	if (t.status === 'done') throw new Error('任务已处理');

	const me = readCurrentUsername();
	if (t.assignee !== me) throw new Error('无权处理该任务');

	const inst = instances.get(t.procInstId);
	if (!inst || inst.status !== 'running') throw new Error('流程实例已结束');

	const def = getDefinition(inst.processKey);
	if (!def) throw new Error('流程定义不存在');

	const graph = requireGraph(def);
	t.status = 'done';

	if (body.variables && Object.keys(body.variables).length) {
		inst.variables = { ...inst.variables, ...body.variables };
	}

	advanceAfterComplete(inst, graph, t.nodeId, body.approved, me, body.comment);
	return { ok: true };
}

export function mockTrace(procInstId: string): TraceItem[] {
	return traces.get(procInstId) ?? [];
}
