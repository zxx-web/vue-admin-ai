import type { FormJsonSchema } from '@/types/workflow';

export const DEFAULT_EXPENSE_FORM_SCHEMA: FormJsonSchema = {
	type: 'object',
	required: ['amount', 'reason'],
	properties: {
		amount: { type: 'number', title: '报销金额', minimum: 0.01 },
		reason: { type: 'string', title: '事由', format: 'textarea' },
	},
};
