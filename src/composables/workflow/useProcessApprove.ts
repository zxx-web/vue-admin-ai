import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { completeTask, fetchProcessTrace, fetchTaskDetail } from '@/api/process';
import { useWorkflowStore } from '@/stores/workflow';
import type { FormJsonSchema, TaskListItem, TraceItem } from '@/types/workflow';
import { errorMessage } from '@/utils/errorMessage';
import { pickVariablesForSchema, validateFormAgainstSchema } from '@/utils/processEngine';

/** 通用任务审批页：只读申请内容 + 当前节点可编辑表单 */
export function useProcessApprove() {
	const route = useRoute();
	const router = useRouter();
	const workflow = useWorkflowStore();

	const loading = ref(false);
	const task = ref<TaskListItem | null>(null);
	const trace = ref<TraceItem[]>([]);
	const applySchema = ref<FormJsonSchema | null>(null);
	const taskSchema = ref<FormJsonSchema | null>(null);
	const taskForm = ref<Record<string, unknown>>({});

	const taskId = computed(() => String(route.params.taskId ?? ''));

	const applyVariables = computed(() => {
		if (!task.value || !applySchema.value) return {};
		return pickVariablesForSchema(applySchema.value, task.value.variables);
	});

	const taskSectionTitle = computed(() => task.value?.taskName ?? '本节点办理');

	/** 加载任务详情、双 schema 与审批轨迹 */
	async function load() {
		const id = taskId.value;
		if (!id) return;

		loading.value = true;
		applySchema.value = null;
		taskSchema.value = null;
		taskForm.value = {};
		try {
			task.value = await fetchTaskDetail(id);
			if (!task.value) {
				ElMessage.warning('任务不存在或已处理');
				await router.replace({ name: 'leave-todos' });
				return;
			}
			const schemas = await workflow.loadTaskFormSchemas(
				task.value.processKey,
				task.value.nodeId,
				task.value.starterUsername
			);
			applySchema.value = schemas.applySchema;
			taskSchema.value = schemas.taskSchema;
			taskForm.value = pickVariablesForSchema(schemas.taskSchema, task.value.variables);
			trace.value = await fetchProcessTrace(task.value.procInstId);
		} finally {
			loading.value = false;
		}
	}

	/** 确认后办结任务并返回待办列表 */
	async function decide(approved: boolean) {
		if (!task.value || !taskSchema.value) return;

		const err = validateFormAgainstSchema(taskForm.value, taskSchema.value);
		if (err) {
			ElMessage.warning(err);
			return;
		}

		try {
			await ElMessageBox.confirm(approved ? '确认通过该申请？' : '确认驳回该申请？', '审批', {
				type: approved ? 'success' : 'warning',
			});
		} catch {
			return;
		}

		const comment = typeof taskForm.value.comment === 'string' ? taskForm.value.comment.trim() : '';

		loading.value = true;
		try {
			await completeTask({
				taskId: task.value.taskId,
				approved,
				comment: comment || undefined,
				variables: { ...taskForm.value },
			});
			ElMessage.success(approved ? '已通过' : '已驳回');
			await workflow.refreshTodos();
			await router.replace({ name: 'leave-todos' });
		} catch (e) {
			ElMessage.error(errorMessage(e, '操作失败'));
		} finally {
			loading.value = false;
		}
	}

	function goTodos() {
		void router.push({ name: 'leave-todos' });
	}

	onMounted(() => void load());
	watch(taskId, () => void load());

	return {
		loading,
		task,
		trace,
		applySchema,
		taskSchema,
		taskForm,
		applyVariables,
		taskSectionTitle,
		decide,
		goTodos,
	};
}
