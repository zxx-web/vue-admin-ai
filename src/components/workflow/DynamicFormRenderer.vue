<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import type { FormJsonSchema } from '@/types/workflow';

const props = withDefaults(
	defineProps<{
		schema: FormJsonSchema;
		/** 双向绑定表单值 */
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

function onInput(key: string, val: unknown) {
	local[key] = val;
	emit('update:modelValue', { ...local });
}

const keys = computed(() => Object.keys(props.schema.properties ?? {}));
</script>

<template>
	<el-form label-position="top" class="dynamic-form" @submit.prevent>
		<el-form-item
			v-for="key in keys"
			:key="key"
			:label="schema.properties[key]?.title ?? key"
			:required="requiredSet.has(key)"
		>
			<template
				v-if="
					schema.properties[key]?.type === 'number' || schema.properties[key]?.type === 'integer'
				"
			>
				<el-input-number
					:model-value="(local[key] as number) ?? undefined"
					:disabled="readonly"
					:min="schema.properties[key]?.minimum"
					:max="schema.properties[key]?.maximum"
					controls-position="right"
					class="w-full"
					@update:model-value="(v: number | undefined) => onInput(key, v ?? 0)"
				/>
			</template>
			<template
				v-else-if="
					schema.properties[key]?.format === 'date' ||
					schema.properties[key]?.format === 'date-time'
				"
			>
				<el-date-picker
					:model-value="local[key] as string"
					:disabled="readonly"
					:type="schema.properties[key]?.format === 'date' ? 'date' : 'datetime'"
					value-format="YYYY-MM-DD HH:mm:ss"
					class="w-full"
					@update:model-value="(v: string | undefined) => onInput(key, v ?? '')"
				/>
			</template>
			<template v-else-if="schema.properties[key]?.format === 'textarea'">
				<el-input
					:model-value="(local[key] as string) ?? ''"
					:disabled="readonly"
					type="textarea"
					:rows="4"
					@update:model-value="(v: string) => onInput(key, v)"
				/>
			</template>
			<template v-else-if="schema.properties[key]?.enum?.length">
				<el-select
					:model-value="(local[key] as string | number | boolean | undefined) ?? undefined"
					:disabled="readonly"
					class="w-full"
					@update:model-value="(v: string | number | boolean | undefined) => onInput(key, v)"
				>
					<el-option
						v-for="opt in schema.properties[key]!.enum"
						:key="String(opt)"
						:label="String(opt)"
						:value="opt"
					/>
				</el-select>
			</template>
			<template v-else>
				<el-input
					:model-value="(local[key] as string) ?? ''"
					:disabled="readonly"
					@update:model-value="(v: string) => onInput(key, v)"
				/>
			</template>
		</el-form-item>
	</el-form>
</template>

<style scoped>
.dynamic-form :deep(.el-input-number) {
	width: 100%;
}
</style>
