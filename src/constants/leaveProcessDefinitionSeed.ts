import { DEFAULT_LEAVE_FORM_SCHEMA } from '@/constants/leaveFormSchema';
import type { ProcessDefinitionDTO } from '@/types/workflow';

const applyFormProps = {
	formSchema: DEFAULT_LEAVE_FORM_SCHEMA,
};

/** 请假流程：开始后经排他网关按 starterRole 分支，两路汇合主管审批 */
export function createLeaveProcessSeedData(): ProcessDefinitionDTO['logicflowData'] {
	return {
		nodes: [
			{ id: 'start_1', type: 'bpmn-start', x: 100, y: 200, text: '开始' },
			{ id: 'gw_role', type: 'bpmn-exclusive-gateway', x: 220, y: 200, text: 'X' },
			{
				id: 'task_apply_user',
				type: 'bpmn-user-task',
				x: 400,
				y: 80,
				text: '填写申请',
				properties: {
					nodeName: '填写申请',
					approverType: 'role',
					roleCode: 'operator',
					...applyFormProps,
				},
			},
			{
				id: 'task_mgr_approve',
				type: 'bpmn-user-task',
				x: 560,
				y: 80,
				text: '经理审批',
				properties: {
					nodeName: '经理审批',
					approverType: 'role',
					roleCode: 'manager',
					...applyFormProps,
				},
			},
			{ id: 'gw_days', type: 'bpmn-exclusive-gateway', x: 680, y: 80, text: '?' },
			{
				id: 'task_apply_mgr',
				type: 'bpmn-user-task',
				x: 400,
				y: 320,
				text: '填写申请',
				properties: {
					nodeName: '填写申请',
					approverType: 'role',
					roleCode: 'manager',
					...applyFormProps,
				},
			},
			{
				id: 'task_supervisor',
				type: 'bpmn-user-task',
				x: 720,
				y: 200,
				text: '主管审批',
				properties: {
					nodeName: '主管审批',
					approverType: 'manager',
					...applyFormProps,
				},
			},
			{ id: 'end_1', type: 'bpmn-end', x: 900, y: 200, text: '结束' },
		],
		edges: [
			{ id: 'e_start_gw', type: 'polyline', sourceNodeId: 'start_1', targetNodeId: 'gw_role' },
			{
				id: 'e_gw_user',
				type: 'polyline',
				sourceNodeId: 'gw_role',
				targetNodeId: 'task_apply_user',
				text: 'user',
				properties: { conditionEquals: 'user' },
			},
			{
				id: 'e_gw_mgr',
				type: 'polyline',
				sourceNodeId: 'gw_role',
				targetNodeId: 'task_apply_mgr',
				text: 'manager',
				properties: { conditionEquals: 'manager' },
			},
			{
				id: 'e_apply_user_mgr',
				type: 'polyline',
				sourceNodeId: 'task_apply_user',
				targetNodeId: 'task_mgr_approve',
			},
			{
				id: 'e_mgr_gw_days',
				type: 'polyline',
				sourceNodeId: 'task_mgr_approve',
				targetNodeId: 'gw_days',
			},
			{
				id: 'e_gw_days_super',
				type: 'polyline',
				sourceNodeId: 'gw_days',
				targetNodeId: 'task_supervisor',
				text: 'days > 3',
				properties: {
					conditionVariable: 'days',
					conditionOperator: 'gt',
					conditionValue: 3,
				},
			},
			{
				id: 'e_gw_days_end',
				type: 'polyline',
				sourceNodeId: 'gw_days',
				targetNodeId: 'end_1',
				text: '默认',
				properties: { isDefault: true },
			},
			{
				id: 'e_apply_mgr_super',
				type: 'polyline',
				sourceNodeId: 'task_apply_mgr',
				targetNodeId: 'task_supervisor',
			},
			{
				id: 'e_super_end',
				type: 'polyline',
				sourceNodeId: 'task_supervisor',
				targetNodeId: 'end_1',
			},
		],
	};
}
