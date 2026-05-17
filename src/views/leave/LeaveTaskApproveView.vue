<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { completeTask, fetchProcessTrace, fetchTaskDetail } from '@/api/process';
import DynamicFormRenderer from '@/components/workflow/DynamicFormRenderer.vue';
import { useWorkflowStore } from '@/stores/workflow';
import type { FormJsonSchema, TaskListItem, TraceItem } from '@/types/workflow';

defineOptions({ name: 'LeaveTaskApproveView' });

const route = useRoute();
const router = useRouter();
const workflow = useWorkflowStore();

const loading = ref(false);
const task = ref<TaskListItem | null>(null);
const trace = ref<TraceItem[]>([]);
const comment = ref('');
const applySchema = ref<FormJsonSchema | null>(null);
const taskSchema = ref<FormJsonSchema | null>(null);

const taskId = computed(() => String(route.params.taskId ?? ''));

/** 申请内容：流程变量 + 发起节点 schema */
const readonlyVars = computed<Record<string, unknown>>(() => ({
	...(task.value?.variables ?? {}),
}));

const displaySchema = computed<FormJsonSchema | null>(
	() => applySchema.value ?? task.value?.formSchema ?? taskSchema.value
);

async function load() {
	const id = taskId.value;
	if (!id) return;
	loading.value = true;
	applySchema.value = null;
	taskSchema.value = null;
	try {
		task.value = await fetchTaskDetail(id);
		if (!task.value) {
			ElMessage.warning('任务不存在或已处理');
			await router.replace({ name: 'leave-todos' });
			return;
		}
		const schemas = await workflow.loadTaskFormSchemas(task.value.processKey, task.value.nodeId);
		applySchema.value = schemas.applySchema;
		taskSchema.value = task.value.formSchema ?? schemas.taskSchema;
		trace.value = await fetchProcessTrace(task.value.procInstId);
	} finally {
		loading.value = false;
	}
}

onMounted(load);
watch(taskId, () => void load());

async function onDecision(approved: boolean) {
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
		workflow.bumpMutationTick();
		await workflow.refreshTodos();
		await router.replace({ name: 'leave-todos' });
	} catch (e) {
		ElMessage.error(e instanceof Error ? e.message : '操作失败');
	} finally {
		loading.value = false;
	}
}
</script>

<template>
	<el-card v-loading="loading" shadow="never" header="任务办理">
		<template v-if="task">
			<el-descriptions :column="2" border class="mb-4">
				<el-descriptions-item label="当前节点">{{ task.taskName }}</el-descriptions-item>
				<el-descriptions-item label="发起人">{{ task.starterUsername }}</el-descriptions-item>
				<el-descriptions-item label="发起时间">{{ task.startTime }}</el-descriptions-item>
				<el-descriptions-item label="流程 Key">{{ task.processKey }}</el-descriptions-item>
				<el-descriptions-item label="实例 ID" :span="2">{{ task.procInstId }}</el-descriptions-item>
			</el-descriptions>

			<h3 class="section-title">流程数据</h3>
			<DynamicFormRenderer
				v-if="displaySchema"
				:key="`${task.taskId}-readonly`"
				:model-value="readonlyVars"
				:schema="displaySchema"
				readonly
			/>

			<h3 class="section-title mt-6">办理意见</h3>
			<el-input v-model="comment" type="textarea" :rows="3" placeholder="选填" />

			<div class="mt-4 flex flex-wrap gap-2">
				<el-button type="success" :loading="loading" @click="onDecision(true)">通过</el-button>
				<el-button type="danger" :loading="loading" @click="onDecision(false)">驳回</el-button>
				<el-button @click="router.push({ name: 'leave-todos' })">返回待办</el-button>
			</div>

			<el-divider />
			<h3 class="section-title">历史轨迹</h3>
			<el-timeline>
				<el-timeline-item v-for="(t, i) in trace" :key="i" :timestamp="t.time" placement="top">
					<p class="font-medium">{{ t.nodeName }} · {{ t.action }}</p>
					<p v-if="t.operator" class="text-sm text-[var(--el-text-color-secondary)]">
						操作人：{{ t.operator }}
					</p>
					<p v-if="t.comment" class="text-sm">意见：{{ t.comment }}</p>
				</el-timeline-item>
			</el-timeline>
		</template>
	</el-card>
</template>

<style scoped>
.section-title {
	margin: 0 0 12px;
	font-size: 15px;
	font-weight: 600;
}
</style>
