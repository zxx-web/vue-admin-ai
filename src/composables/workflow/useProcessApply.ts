import { ElMessage } from 'element-plus';
import { storeToRefs } from 'pinia';
import { onMounted, ref, watch } from 'vue';
import { startProcess } from '@/api/process';
import { useWorkflowStore } from '@/stores/workflow';
import type { FormJsonSchema } from '@/types/workflow';
import { errorMessage } from '@/utils/errorMessage';
import { validateFormAgainstSchema } from '@/utils/processEngine';

/** 通用流程发起页：选 processKey、按定义加载 schema、提交 variables */
export function useProcessApply(defaultProcessKey = 'leave_process') {
	const workflow = useWorkflowStore();
	const { processList: defs } = storeToRefs(workflow);

	const loading = ref(false);
	const schemaLoading = ref(false);
	const processKey = ref(defaultProcessKey);
	const applySchema = ref<FormJsonSchema | null>(null);
	const form = ref<Record<string, unknown>>({});

	/** 切换流程时清空已填表单 */
	function resetForm() {
		form.value = {};
	}

	/** 按流程定义解析「首个用户任务」上的表单 schema */
	async function loadSchema(key: string) {
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

	/** 拉取流程列表并校正当前选中的 key */
	async function init() {
		try {
			await workflow.refreshProcessList();
			if (!defs.value.some((d) => d.key === processKey.value) && defs.value[0]) {
				processKey.value = defs.value[0].key;
			}
		} catch {
			/* 列表失败时保留默认 key，由 loadSchema 再提示 */
		}
		await loadSchema(processKey.value);
	}

	/** 校验后调用 startProcess */
	async function submit() {
		const schema = applySchema.value;
		if (!schema) {
			ElMessage.warning('表单配置未就绪，请稍后重试');
			return;
		}
		const err = validateFormAgainstSchema(form.value, schema);
		if (err) {
			ElMessage.warning(err);
			return;
		}
		loading.value = true;
		try {
			await startProcess({ processKey: processKey.value, variables: { ...form.value } });
			ElMessage.success('已发起流程');
		} catch (e) {
			ElMessage.error(errorMessage(e, '提交失败'));
		} finally {
			loading.value = false;
		}
	}

	onMounted(() => void init());
	watch(processKey, async (key) => {
		resetForm();
		await loadSchema(key);
	});

	return {
		defs,
		processKey,
		form,
		loading,
		schemaLoading,
		applySchema,
		submit,
	};
}
