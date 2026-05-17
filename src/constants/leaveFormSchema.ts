import type { FormJsonSchema } from '@/types/workflow';

/** 流程图节点未配置 formSchema 时的兜底 schema（业务字段仅作种子数据，运行时应以设计器配置为准） */
export const DEFAULT_LEAVE_FORM_SCHEMA: FormJsonSchema = {
	type: 'object',
	required: ['days', 'reason', 'startTime', 'endTime'],
	properties: {
		days: { type: 'number', title: '请假天数', minimum: 0.5, maximum: 365 },
		reason: { type: 'string', title: '事由', format: 'textarea' },
		startTime: { type: 'string', title: '开始时间', format: 'date-time' },
		endTime: { type: 'string', title: '结束时间', format: 'date-time' },
	},
};
