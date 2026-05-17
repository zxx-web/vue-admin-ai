<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { storeToRefs } from 'pinia';
import { onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { startProcess } from '@/api/process';
import DynamicFormRenderer from '@/components/workflow/DynamicFormRenderer.vue';
import { useWorkflowStore } from '@/stores/workflow';
import type { FormJsonSchema } from '@/types/workflow';
import { validateFormAgainstSchema } from '@/utils/processEngine';

defineOptions({ name: 'LeaveApplyView' });

const router = useRouter();
const workflow = useWorkflowStore();
const { processList: defs } = storeToRefs(workflow);
const loading = ref(false);
const schemaLoading = ref(false);
const processKey = ref('leave_process');
const applySchema = ref<FormJsonSchema | null>(null);
const form = reactive<Record<string, unknown>>({});

function resetForm() {
	for (const key of Object.keys(form)) {
		delete form[key];
	}
}

async function syncSchemaForProcess(key: string) {
	schemaLoading.value = true;
	try {
		applySchema.value = await workflow.loadApplyFormSchema(key);
	} catch {
		applySchema.value = null;
		ElMessage.error('加载流程表单配置失败');
	} finally {
		schemaLoading.value = false;
	}
}

onMounted(async () => {
	try {
		await workflow.refreshProcessList();
		if (!defs.value.find((d) => d.key === processKey.value) && defs.value[0]) {
			processKey.value = defs.value[0].key;
		}
	} catch {
		if (!defs.value.length) {
			defs.value = [{ key: 'leave_process', name: '员工请假' }];
		}
	}
	await syncSchemaForProcess(processKey.value);
});

watch(processKey, async (key) => {
	resetForm();
	await syncSchemaForProcess(key);
});

async function onSubmit() {
	const schema = applySchema.value;
	if (!schema) {
		ElMessage.warning('表单配置未就绪，请稍后重试');
		return;
	}
	const err = validateFormAgainstSchema(form, schema);
	if (err) {
		ElMessage.warning(err);
		return;
	}
	loading.value = true;
	try {
		await startProcess({
			processKey: processKey.value,
			variables: { ...form },
		});
		ElMessage.success('已发起流程');
		await router.push({ name: 'leave-todos' });
	} catch (e) {
		ElMessage.error(e instanceof Error ? e.message : '提交失败');
	} finally {
		loading.value = false;
	}
}
</script>

<template>
	<el-card v-loading="schemaLoading" shadow="never" header="发起流程">
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
		<p class="mb-4 text-sm text-[var(--el-text-color-secondary)]">
			表单字段由流程设计器中「开始」后首个用户任务的 JSON Schema
			决定；保存流程定义后刷新本页即可生效。
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
			@click="onSubmit"
		>
			提交申请
		</el-button>
	</el-card>
</template>
