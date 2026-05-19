import type { FormJsonSchema } from '@/types/workflow';

/** 审批类用户任务未配置 formSchema 时的默认（办理意见等） */
export const DEFAULT_APPROVE_FORM_SCHEMA: FormJsonSchema = {
	type: 'object',
	properties: {
		comment: { type: 'string', title: '办理意见', format: 'textarea' },
	},
};
