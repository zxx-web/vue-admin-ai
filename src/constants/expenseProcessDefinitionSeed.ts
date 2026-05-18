import { DEFAULT_EXPENSE_FORM_SCHEMA } from '@/constants/expenseFormSchema';
import type { ProcessDefinitionDTO } from '@/types/workflow';

const expenseFormProps = {
	formSchema: DEFAULT_EXPENSE_FORM_SCHEMA,
};

/** 报销流程：开始 → 经理申请 → 主管审批 → 结束（线性，无网关） */
export function createExpenseProcessSeedData(): ProcessDefinitionDTO['logicflowData'] {
	return {
		nodes: [
			{ id: 'exp_start', type: 'bpmn-start', x: 100, y: 200, text: '开始' },
			{
				id: 'exp_task_apply',
				type: 'bpmn-user-task',
				x: 280,
				y: 200,
				text: '经理申请',
				properties: {
					nodeName: '经理申请',
					approverType: 'role',
					roleCode: 'manager',
					...expenseFormProps,
				},
			},
			{
				id: 'exp_task_supervisor',
				type: 'bpmn-user-task',
				x: 480,
				y: 200,
				text: '主管审批',
				properties: {
					nodeName: '主管审批',
					approverType: 'manager',
					...expenseFormProps,
				},
			},
			{ id: 'exp_end', type: 'bpmn-end', x: 680, y: 200, text: '结束' },
		],
		edges: [
			{
				id: 'exp_e_start_apply',
				type: 'polyline',
				sourceNodeId: 'exp_start',
				targetNodeId: 'exp_task_apply',
			},
			{
				id: 'exp_e_apply_super',
				type: 'polyline',
				sourceNodeId: 'exp_task_apply',
				targetNodeId: 'exp_task_supervisor',
			},
			{
				id: 'exp_e_super_end',
				type: 'polyline',
				sourceNodeId: 'exp_task_supervisor',
				targetNodeId: 'exp_end',
			},
		],
	};
}
