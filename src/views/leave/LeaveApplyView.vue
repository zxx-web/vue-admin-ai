<script setup lang="ts">
import DynamicFormRenderer from '@/components/workflow/DynamicFormRenderer.vue';
import { useProcessApply } from '@/composables/workflow/useProcessApply';

defineOptions({ name: 'LeaveApplyView' });

const { defs, processKey, form, loading, schemaLoading, applySchema, submit } =
	useProcessApply('leave_process');
</script>

<template>
	<el-card v-loading="schemaLoading" class="workflow-page" shadow="never" header="发起流程">
		<el-form label-position="top" class="max-w-xl">
			<el-form-item label="流程定义">
				<el-select v-model="processKey" class="w-full" filterable>
					<el-option
						v-for="d in defs"
						:key="d.key"
						:label="`${d.name} (${d.key})`"
						:value="d.key"
					/>
				</el-select>
			</el-form-item>
		</el-form>
		<p class="hint">
			表单由流程图中「开始」后首个用户任务的 JSON Schema 决定；在设计器保存定义后刷新本页即可。
		</p>
		<DynamicFormRenderer
			v-if="applySchema"
			:key="processKey"
			v-model="form"
			:schema="applySchema"
		/>
		<el-button
			type="primary"
			class="mt-4"
			:loading="loading"
			:disabled="!applySchema"
			@click="submit"
		>
			提交申请
		</el-button>
	</el-card>
</template>

<style src="@/styles/workflow-pages.css" scoped></style>
