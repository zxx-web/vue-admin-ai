import { DEFAULT_LEAVE_FORM_SCHEMA } from '@/constants/leaveFormSchema';
import type {
	ApproverType,
	FormJsonSchema,
	SequenceFlowProperties,
	UserTaskNodeProperties,
} from '@/types/workflow';

export type ParsedNode = {
	id: string;
	type?: string;
	text?: unknown;
	properties?: Partial<UserTaskNodeProperties>;
};

export type ParsedEdgeCondition = {
	variable: string;
	equals?: string;
	isDefault?: boolean;
};

export type ParsedEdge = {
	id?: string;
	targetNodeId: string;
	condition?: ParsedEdgeCondition;
};

export type ParsedGraph = {
	nodes: Map<string, ParsedNode>;
	outEdges: Map<string, ParsedEdge[]>;
};

export type FlowTarget = { kind: 'userTask'; node: ParsedNode } | { kind: 'end'; node: ParsedNode };

export type AssigneeContext = {
	starterUsername: string;
};

/** 流程节点 roleCode → 登录用户名（与 mock 账号一致） */
const ROLE_CODE_TO_USERNAME: Record<string, string> = {
	admin: 'admin',
	manager: 'manager',
	operator: 'user',
};

const DEFAULT_CONDITION_VARIABLE = 'starterRole';

function isValidFormSchema(schema: unknown): schema is FormJsonSchema {
	return (
		typeof schema === 'object' &&
		schema !== null &&
		(schema as FormJsonSchema).type === 'object' &&
		typeof (schema as FormJsonSchema).properties === 'object'
	);
}

function edgeTextValue(text: unknown): string {
	if (typeof text === 'string') return text.trim();
	if (text && typeof text === 'object' && 'value' in text) {
		return String((text as { value: unknown }).value).trim();
	}
	return '';
}

function parseEdgeCondition(
	properties?: Partial<SequenceFlowProperties>,
	text?: unknown
): ParsedEdgeCondition | undefined {
	const p = properties ?? {};
	const variable =
		typeof p.conditionVariable === 'string' && p.conditionVariable.trim()
			? p.conditionVariable.trim()
			: DEFAULT_CONDITION_VARIABLE;
	if (p.isDefault === true) {
		return { variable, isDefault: true };
	}
	const fromProp =
		typeof p.conditionEquals === 'string' && p.conditionEquals.trim()
			? p.conditionEquals.trim()
			: undefined;
	const fromText = edgeTextValue(text);
	const equals = fromProp ?? (fromText || undefined);
	if (!equals) return undefined;
	return { variable, equals };
}

export function parseLogicFlowGraph(logicflowData: unknown): ParsedGraph | null {
	if (!logicflowData || typeof logicflowData !== 'object') return null;
	const raw = logicflowData as {
		nodes?: ParsedNode[];
		edges?: {
			id?: string;
			sourceNodeId: string;
			targetNodeId: string;
			text?: unknown;
			properties?: Partial<SequenceFlowProperties>;
		}[];
	};
	const nodes = raw.nodes ?? [];
	if (!nodes.length) return null;

	const nodeMap = new Map<string, ParsedNode>();
	for (const n of nodes) {
		if (n?.id) nodeMap.set(n.id, n);
	}

	const outEdges = new Map<string, ParsedEdge[]>();
	for (const e of raw.edges ?? []) {
		if (!e?.sourceNodeId || !e?.targetNodeId) continue;
		const edge: ParsedEdge = {
			id: e.id,
			targetNodeId: e.targetNodeId,
			condition: parseEdgeCondition(e.properties, e.text),
		};
		const list = outEdges.get(e.sourceNodeId) ?? [];
		list.push(edge);
		outEdges.set(e.sourceNodeId, list);
	}

	return { nodes: nodeMap, outEdges };
}

/** 登录用户名 → 排他网关分支标识（与连线条件 user / manager 对应） */
export function resolveStarterRole(username: string): 'user' | 'manager' {
	return username === 'manager' ? 'manager' : 'user';
}

export function buildProcessVariables(
	starterUsername: string,
	formVariables: Record<string, unknown>
): Record<string, unknown> {
	return {
		...formVariables,
		starterUsername,
		starterRole: resolveStarterRole(starterUsername),
	};
}

function readVariable(variables: Record<string, unknown>, name: string): unknown {
	return variables[name];
}

function edgeConditionMatches(
	edge: ParsedEdge,
	variables: Record<string, unknown>,
	sourceIsGateway: boolean
): boolean {
	const cond = edge.condition;
	if (!cond) return !sourceIsGateway;
	if (cond.isDefault) return false;
	if (cond.equals === undefined) return !sourceIsGateway;
	const actual = readVariable(variables, cond.variable);
	return String(actual ?? '') === String(cond.equals);
}

function pickGatewayEdge(
	graph: ParsedGraph,
	gatewayId: string,
	variables: Record<string, unknown>
): ParsedEdge | undefined {
	const edges = graph.outEdges.get(gatewayId) ?? [];
	let defaultEdge: ParsedEdge | undefined;
	for (const e of edges) {
		if (e.condition?.isDefault) defaultEdge = e;
		else if (edgeConditionMatches(e, variables, true)) return e;
	}
	return defaultEdge ?? edges[0];
}

function resolveFlowFromNode(
	graph: ParsedGraph,
	nodeId: string,
	variables: Record<string, unknown>
): FlowTarget | null {
	const node = graph.nodes.get(nodeId);
	if (!node) return null;
	if (node.type === 'bpmn-user-task') return { kind: 'userTask', node };
	if (node.type === 'bpmn-end') return { kind: 'end', node };

	if (node.type === 'bpmn-exclusive-gateway') {
		const edge = pickGatewayEdge(graph, nodeId, variables);
		if (!edge) return null;
		return resolveFlowFromNode(graph, edge.targetNodeId, variables);
	}

	const outs = graph.outEdges.get(nodeId) ?? [];
	for (const e of outs) {
		const sourceIsGateway = false;
		if (!edgeConditionMatches(e, variables, sourceIsGateway)) continue;
		const next = resolveFlowFromNode(graph, e.targetNodeId, variables);
		if (next) return next;
	}
	return null;
}

export function getNodeLabel(node: ParsedNode | undefined): string {
	if (!node) return '';
	const name = node.properties?.nodeName;
	if (name) return name;
	const text = node.text;
	if (typeof text === 'string') return text;
	if (text && typeof text === 'object' && 'value' in text) {
		return String((text as { value: unknown }).value);
	}
	return node.id;
}

export function getNodeFormSchema(node: ParsedNode | undefined): FormJsonSchema | undefined {
	const schema = node?.properties?.formSchema;
	return isValidFormSchema(schema) ? schema : undefined;
}

export function resolveFormSchema(node: ParsedNode | undefined): FormJsonSchema {
	return getNodeFormSchema(node) ?? DEFAULT_LEAVE_FORM_SCHEMA;
}

export function getStartNode(graph: ParsedGraph): ParsedNode | undefined {
	return [...graph.nodes.values()].find((n) => n.type === 'bpmn-start');
}

/** 自开始节点起，按流程变量走排他网关，返回路径上第一个用户任务 */
export function getFirstUserTaskFromStart(
	graph: ParsedGraph,
	variables: Record<string, unknown> = {}
): ParsedNode | undefined {
	const start = getStartNode(graph);
	if (!start) {
		return [...graph.nodes.values()].find((n) => n.type === 'bpmn-user-task');
	}
	for (const edge of graph.outEdges.get(start.id) ?? []) {
		const target = resolveFlowFromNode(graph, edge.targetNodeId, variables);
		if (target?.kind === 'userTask') return target.node;
	}
	return undefined;
}

export function getApplyFormSchemaFromLogicflow(
	logicflowData: unknown,
	variables: Record<string, unknown> = {}
): FormJsonSchema | undefined {
	const graph = parseLogicFlowGraph(logicflowData);
	if (!graph) return undefined;
	return getNodeFormSchema(getFirstUserTaskFromStart(graph, variables));
}

export function resolveApplyFormSchema(
	logicflowData: unknown,
	variables: Record<string, unknown> = {}
): FormJsonSchema {
	return getApplyFormSchemaFromLogicflow(logicflowData, variables) ?? DEFAULT_LEAVE_FORM_SCHEMA;
}

export function getNodeById(graph: ParsedGraph, nodeId: string): ParsedNode | undefined {
	return graph.nodes.get(nodeId);
}

/**
 * 从某节点沿出边推进：在排他网关处按 variables 选唯一分支，直至下一用户任务或结束。
 */
export function findNextFlowTarget(
	graph: ParsedGraph,
	fromNodeId: string,
	variables: Record<string, unknown> = {}
): FlowTarget | null {
	const outs = graph.outEdges.get(fromNodeId) ?? [];
	const source = graph.nodes.get(fromNodeId);
	const sourceIsGateway = source?.type === 'bpmn-exclusive-gateway';

	for (const edge of outs) {
		if (!edgeConditionMatches(edge, variables, sourceIsGateway)) continue;
		const next = resolveFlowFromNode(graph, edge.targetNodeId, variables);
		if (next) return next;
	}
	return null;
}

/** 根据节点审批人配置解析待办处理人用户名 */
export function resolveTaskAssignee(node: ParsedNode, ctx: AssigneeContext): string {
	const p = node.properties ?? {};
	const type: ApproverType = p.approverType ?? 'manager';
	switch (type) {
		case 'role': {
			const code = p.roleCode ?? 'admin';
			return ROLE_CODE_TO_USERNAME[code] ?? code;
		}
		case 'manager':
			return ctx.starterUsername === 'user' ? 'admin' : 'admin';
		case 'candidateGroup':
			return p.candidateGroup?.trim() || 'admin';
		default:
			return 'admin';
	}
}

/**
 * 发起流程时：若首个用户任务的处理人就是发起人，视为「填写申请」已在发起页完成，自动跳过。
 */
export function shouldAutoCompleteOnStart(
	graph: ParsedGraph,
	node: ParsedNode,
	starterUsername: string,
	variables: Record<string, unknown> = {}
): boolean {
	const first = getFirstUserTaskFromStart(graph, variables);
	if (!first || first.id !== node.id) return false;
	return resolveTaskAssignee(node, { starterUsername }) === starterUsername;
}

export function findEndNode(graph: ParsedGraph): ParsedNode | undefined {
	return [...graph.nodes.values()].find((n) => n.type === 'bpmn-end');
}

export function validateFormAgainstSchema(
	form: Record<string, unknown>,
	schema: FormJsonSchema
): string | null {
	for (const key of schema.required ?? []) {
		const v = form[key];
		if (v === undefined || v === null || v === '') {
			return `请填写完整：${schema.properties[key]?.title ?? key}`;
		}
	}
	return null;
}

export function isGatewayNode(graph: ParsedGraph, nodeId: string): boolean {
	return graph.nodes.get(nodeId)?.type === 'bpmn-exclusive-gateway';
}
