<script setup lang="ts">
import DynamicFormRenderer from '@/components/workflow/DynamicFormRenderer.vue';
import { useProcessApprove } from '@/composables/workflow/useProcessApprove';

defineOptions({ name: 'LeaveTaskApproveView' });

const { loading, task, trace, comment, displaySchema, decide, goTodos } = useProcessApprove();
</script>

<template>
	<el-card v-loading="loading" class="workflow-page" shadow="never" header="任务办理">
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
				:model-value="task.variables"
				:schema="displaySchema"
				readonly
			/>

			<h3 class="section-title mt-6">办理意见</h3>
			<el-input v-model="comment" type="textarea" :rows="3" placeholder="选填" />

			<div class="actions">
				<el-button type="success" :loading="loading" @click="decide(true)">通过</el-button>
				<el-button type="danger" :loading="loading" @click="decide(false)">驳回</el-button>
				<el-button @click="goTodos">返回待办</el-button>
			</div>

			<el-divider />
			<h3 class="section-title">历史轨迹</h3>
			<el-timeline>
				<el-timeline-item v-for="(t, i) in trace" :key="i" :timestamp="t.time" placement="top">
					<p class="font-medium">{{ t.nodeName }} · {{ t.action }}</p>
					<p v-if="t.operator" class="trace-meta">操作人：{{ t.operator }}</p>
					<p v-if="t.comment" class="text-sm">意见：{{ t.comment }}</p>
				</el-timeline-item>
			</el-timeline>
		</template>
	</el-card>
</template>

<style src="@/styles/workflow-pages.css"></style>
<style scoped>
.trace-meta {
	margin: 4px 0 0;
	font-size: 13px;
	color: var(--el-text-color-secondary);
}
</style>
