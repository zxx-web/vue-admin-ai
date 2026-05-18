import type { ConditionOperator } from '@/types/workflow';

export const EMPTY_FORM_SCHEMA_JSON = '{\n  "type": "object",\n  "properties": {}\n}';

export const CONDITION_OPERATORS: { value: ConditionOperator; label: string }[] = [
	{ value: 'eq', label: '等于 (=)' },
	{ value: 'ne', label: '不等于 (≠)' },
	{ value: 'gt', label: '大于 (>)' },
	{ value: 'gte', label: '大于等于 (≥)' },
	{ value: 'lt', label: '小于 (<)' },
	{ value: 'lte', label: '小于等于 (≤)' },
];
