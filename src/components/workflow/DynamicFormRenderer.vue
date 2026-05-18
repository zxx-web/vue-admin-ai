<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import type { FormJsonProperty, FormJsonSchema } from '@/types/workflow';

const props = withDefaults(
	defineProps<{
		schema: FormJsonSchema;
		modelValue: Record<string, unknown>;
		readonly?: boolean;
	}>(),
	{ readonly: false }
);

const emit = defineEmits<{
	'update:modelValue': [v: Record<string, unknown>];
}>();

const local = reactive<Record<string, unknown>>({ ...props.modelValue });

watch(
	() => props.modelValue,
	(v) => {
		for (const key of Object.keys(local)) delete local[key];
		Object.assign(local, v);
	},
	{ deep: true }
);

const requiredSet = computed(() => new Set(props.schema.required ?? []));

const fields = computed(() =>
	Object.entries(props.schema.properties ?? {}).map(([key, prop]) => ({
		key,
		prop,
		kind: fieldKind(prop),
	}))
);

/** 根据 JSON Schema 属性推断渲染控件类型 */
function fieldKind(prop: FormJsonProperty): 'number' | 'date' | 'textarea' | 'enum' | 'text' {
	if (prop.type === 'number' || prop.type === 'integer') return 'number';
	if (prop.format === 'date' || prop.format === 'date-time') return 'date';
	if (prop.format === 'textarea') return 'textarea';
	if (prop.enum?.length) return 'enum';
	return 'text';
}

/** 数字控件展示值（空值保持 undefined，避免误写成 0） */
function numberModelValue(raw: unknown): number | undefined {
	return typeof raw === 'number' && !Number.isNaN(raw) ? raw : undefined;
}

/** 金额类字段默认保留两位小数 */
function numberPrecision(prop: FormJsonProperty): number | undefined {
	return prop.type === 'number' && prop.minimum !== undefined && prop.minimum < 1 ? 2 : undefined;
}

/** 数字字段变更：忽略空值，不强制为 0 */
function onNumberInput(key: string, val: number | undefined | null) {
	if (val === undefined || val === null) {
		delete local[key];
	} else {
		local[key] = val;
	}
	emit('update:modelValue', { ...local });
}

/** 字段变更时同步到 v-model */
function onInput(key: string, val: unknown) {
	local[key] = val;
	emit('update:modelValue', { ...local });
}
</script>

<template>
	<el-form label-position="top" class="dynamic-form" @submit.prevent>
		<el-form-item
			v-for="{ key, prop, kind } in fields"
			:key="key"
			:label="prop.title ?? key"
			:required="requiredSet.has(key)"
		>
			<el-input-number
				v-if="kind === 'number'"
				:model-value="numberModelValue(local[key])"
				:disabled="readonly"
				:min="prop.minimum"
				:max="prop.maximum"
				:precision="numberPrecision(prop)"
				controls-position="right"
				class="w-full"
				@update:model-value="(v: number | undefined | null) => onNumberInput(key, v)"
			/>
			<el-date-picker
				v-else-if="kind === 'date'"
				:model-value="local[key] as string"
				:disabled="readonly"
				:type="prop.format === 'date' ? 'date' : 'datetime'"
				value-format="YYYY-MM-DD HH:mm:ss"
				class="w-full"
				@update:model-value="(v: string | undefined) => onInput(key, v ?? '')"
			/>
			<el-input
				v-else-if="kind === 'textarea'"
				:model-value="(local[key] as string) ?? ''"
				:disabled="readonly"
				type="textarea"
				:rows="4"
				@update:model-value="(v: string) => onInput(key, v)"
			/>
			<el-select
				v-else-if="kind === 'enum'"
				:model-value="(local[key] as string | number | boolean | undefined) ?? undefined"
				:disabled="readonly"
				class="w-full"
				@update:model-value="(v: string | number | boolean | undefined) => onInput(key, v)"
			>
				<el-option v-for="opt in prop.enum" :key="String(opt)" :label="String(opt)" :value="opt" />
			</el-select>
			<el-input
				v-else
				:model-value="(local[key] as string) ?? ''"
				:disabled="readonly"
				@update:model-value="(v: string) => onInput(key, v)"
			/>
		</el-form-item>
	</el-form>
</template>

<style scoped>
.dynamic-form :deep(.el-input-number),
.w-full {
	width: 100%;
}
</style>
