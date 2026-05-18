import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { completeTask, fetchProcessTrace, fetchTaskDetail } from '@/api/process';
import { useWorkflowStore } from '@/stores/workflow';
import type { FormJsonSchema, TaskListItem, TraceItem } from '@/types/workflow';
import { errorMessage } from '@/utils/errorMessage';

/** 通用任务审批页：加载待办、只读展示流程变量、通过/驳回 */
export function useProcessApprove() {
	const route = useRoute();
	const router = useRouter();
	const workflow = useWorkflowStore();

	const loading = ref(false);
	const task = ref<TaskListItem | null>(null);
	const trace = ref<TraceItem[]>([]);
	const comment = ref('');
	const applySchema = ref<FormJsonSchema | null>(null);

	const taskId = computed(() => String(route.params.taskId ?? ''));

	const displaySchema = computed(() => applySchema.value ?? task.value?.formSchema ?? null);

	/** 加载任务详情、表单 schema 与审批轨迹 */
	async function load() {
		const id = taskId.value;
		if (!id) return;

		loading.value = true;
		applySchema.value = null;
		try {
			task.value = await fetchTaskDetail(id);
			if (!task.value) {
				ElMessage.warning('任务不存在或已处理');
				await router.replace({ name: 'leave-todos' });
				return;
			}
			const schemas = await workflow.loadTaskFormSchemas(task.value.processKey, task.value.nodeId);
			applySchema.value = schemas.applySchema;
			trace.value = await fetchProcessTrace(task.value.procInstId);
		} finally {
			loading.value = false;
		}
	}

	/** 确认后办结任务并返回待办列表 */
	async function decide(approved: boolean) {
		if (!task.value) return;
		try {
			await ElMessageBox.confirm(approved ? '确认通过该申请？' : '确认驳回该申请？', '审批', {
				type: approved ? 'success' : 'warning',
			});
		} catch {
			return;
		}

		loading.value = true;
		try {
			await completeTask({
				taskId: task.value.taskId,
				approved,
				comment: comment.value || undefined,
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
		comment,
		displaySchema,
		decide,
		goTodos,
	};
}
