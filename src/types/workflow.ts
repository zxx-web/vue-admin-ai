/**
 * 请假流程 / LogicFlow 相关类型（与后端约定字段对齐，便于联调）
 */

/** 审批人类型：指定角色 / 上级主管 / 候选人组 */
export type ApproverType = 'role' | 'manager' | 'candidateGroup';

/** JSON Schema 子集：动态表单与任务绑定 */
export type FormJsonSchema = {
	type: 'object';
	properties: Record<string, FormJsonProperty>;
	required?: string[];
};

export type FormJsonProperty = {
	type: 'string' | 'number' | 'integer' | 'boolean';
	title?: string;
	description?: string;
	format?: 'date' | 'date-time' | 'textarea';
	enum?: (string | number)[];
	minimum?: number;
	maximum?: number;
};

/** 排他网关出线（Sequence Flow）在 LogicFlow edge.properties 中的条件配置 */
export type SequenceFlowProperties = {
	/** 比较的流程变量名，默认 starterRole */
	conditionVariable?: string;
	/** 变量等于该值时走此分支（可与连线文案一致，如 user / manager） */
	conditionEquals?: string;
	/** 无其它分支匹配时走默认流 */
	isDefault?: boolean;
};

/** 用户任务节点在 LogicFlow properties 中携带的配置 */
export type UserTaskNodeProperties = {
	/** 节点展示名称，如「主管审批」 */
	nodeName: string;
	approverType: ApproverType;
	/** approverType === 'role' 时的角色编码：admin | manager | operator */
	roleCode?: string;
	/** approverType === 'candidateGroup' 时的组标识 */
	candidateGroup?: string;
	/** 本节点关联表单 schema */
	formSchema?: FormJsonSchema;
};

export type ProcessDefinitionDTO = {
	key: string;
	name: string;
	logicflowData: unknown;
};

export type ProcessDefinitionListItem = {
	key: string;
	name: string;
};

export type StartProcessPayload = {
	processKey: string;
	variables: Record<string, unknown>;
};

export type TaskListItem = {
	taskId: string;
	taskName: string;
	/** 流程图中用户任务节点 id，用于回溯节点配置 */
	nodeId: string;
	procInstId: string;
	processKey: string;
	starterUsername: string;
	startTime: string;
	/** 只读展示用：流程实例累积的表单变量 */
	variables: Record<string, unknown>;
	/** 当前待办节点上的表单 schema（由流程定义在创建任务时快照） */
	formSchema?: FormJsonSchema;
};

export type CompleteTaskPayload = {
	taskId: string;
	approved: boolean;
	comment?: string;
	variables?: Record<string, unknown>;
};

export type TraceItem = {
	nodeId?: string;
	nodeName: string;
	action: string;
	operator?: string;
	comment?: string;
	time: string;
};
