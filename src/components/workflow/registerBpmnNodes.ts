/**
 * 注册 BPMN 常用图元（开始 / 结束 / 用户任务 / 排他网关），供流程设计器使用。
 * 与具体业务模块（如请假）解耦：拖拽创建时不注入业务 properties，仅展示图元与文案。
 */
import {
	CircleNode,
	CircleNodeModel,
	PolygonNode,
	PolygonNodeModel,
	RectNode,
	RectNodeModel,
} from '@logicflow/core';
import type LogicFlow from '@logicflow/core';

class BpmnStartModel extends CircleNodeModel {
	initNodeData(data: LogicFlow.NodeConfig) {
		super.initNodeData(data);
		this.r = 26;
		if (!this.text.value) this.text.value = typeof data.text === 'string' ? data.text : '开始';
	}
	getNodeStyle() {
		return { ...super.getNodeStyle(), fill: '#73d13d', stroke: '#237804', strokeWidth: 2 };
	}
	/** 开始节点仅允许作为连线的起点 */
	getConnectedTargetRules() {
		const rules = super.getConnectedTargetRules();
		return rules.concat({
			message: '开始节点不能作为连线的终点',
			validate: () => false,
		});
	}
}

class BpmnEndModel extends CircleNodeModel {
	initNodeData(data: LogicFlow.NodeConfig) {
		super.initNodeData(data);
		this.r = 26;
		if (!this.text.value) this.text.value = typeof data.text === 'string' ? data.text : '结束';
	}
	getNodeStyle() {
		return { ...super.getNodeStyle(), fill: '#ffccc7', stroke: '#a8071a', strokeWidth: 3 };
	}
	/** 结束节点仅允许作为连线的终点 */
	getConnectedSourceRules() {
		const rules = super.getConnectedSourceRules();
		return rules.concat({
			message: '结束节点不能作为连线的起点',
			validate: () => false,
		});
	}
}

class BpmnUserTaskModel extends RectNodeModel {
	initNodeData(data: LogicFlow.NodeConfig) {
		super.initNodeData(data);
		this.width = 140;
		this.height = 64;
		this.properties = { ...(data.properties ?? {}) };
		const label =
			(typeof this.properties.nodeName === 'string' && this.properties.nodeName) ||
			(typeof data.text === 'string' ? data.text : '') ||
			'用户任务';
		if (!this.text.value) this.text.value = label;
	}
	getNodeStyle() {
		return {
			...super.getNodeStyle(),
			fill: '#e6f7ff',
			stroke: '#1890ff',
			strokeWidth: 2,
		};
	}
}

class BpmnExclusiveGatewayModel extends PolygonNodeModel {
	initNodeData(data: LogicFlow.NodeConfig) {
		super.initNodeData(data);
		this.points = [
			[50, 0],
			[100, 50],
			[50, 100],
			[0, 50],
		];
		if (!this.text.value) this.text.value = typeof data.text === 'string' ? data.text : 'X';
	}
	getNodeStyle() {
		return { ...super.getNodeStyle(), fill: '#fff7e6', stroke: '#d48806', strokeWidth: 2 };
	}
}

export function registerBpmnNodes(lf: LogicFlow) {
	lf.batchRegister([
		{ type: 'bpmn-start', view: CircleNode, model: BpmnStartModel },
		{ type: 'bpmn-end', view: CircleNode, model: BpmnEndModel },
		{ type: 'bpmn-user-task', view: RectNode, model: BpmnUserTaskModel },
		{ type: 'bpmn-exclusive-gateway', view: PolygonNode, model: BpmnExclusiveGatewayModel },
	]);
}

export type DndShapeItem = {
	type: string;
	label: string;
	text?: string;
	className?: string;
};

/** DndPanel 预览用 className（对应 ProcessDesignerView 内 :deep 样式） */
export const BPMN_DND_CLASS = {
	start: 'bpmn-dnd-start',
	end: 'bpmn-dnd-end',
	userTask: 'bpmn-dnd-user-task',
	gateway: 'bpmn-dnd-gateway',
} as const;

/** 纯 BPMN 图元面板项：不传 properties，避免拖拽时附带业务配置 */
export function bpmnDesignerDndItems(): DndShapeItem[] {
	return [
		{ type: 'bpmn-start', label: '开始', text: '开始', className: BPMN_DND_CLASS.start },
		{ type: 'bpmn-end', label: '结束', text: '结束', className: BPMN_DND_CLASS.end },
		{
			type: 'bpmn-user-task',
			label: '用户任务',
			text: '用户任务',
			className: BPMN_DND_CLASS.userTask,
		},
		{
			type: 'bpmn-exclusive-gateway',
			label: '排他网关',
			text: 'X',
			className: BPMN_DND_CLASS.gateway,
		},
	];
}
