<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useWorkflowStore } from '@/stores/workflow';

defineOptions({ name: 'LeaveTodoListView' });

const router = useRouter();
const workflow = useWorkflowStore();

onMounted(() => void workflow.refreshTodos());

/** 进入审批办理页 */
function openTask(taskId: string) {
	void router.push({ name: 'leave-task-approve', params: { taskId } });
}
</script>

<template>
	<el-card class="workflow-page" shadow="never" header="待办审批">
		<el-button class="mb-3" @click="workflow.refreshTodos()">刷新</el-button>
		<el-table
			v-loading="workflow.todoLoading"
			:data="workflow.todoList"
			stripe
			class="w-full"
			@row-click="(row) => openTask(row.taskId)"
		>
			<el-table-column prop="taskName" label="任务名称" min-width="140" />
			<el-table-column prop="starterUsername" label="发起人" width="120" />
			<el-table-column prop="startTime" label="发起时间" min-width="180" />
			<el-table-column prop="processKey" label="流程 Key" width="140" />
			<el-table-column label="操作" width="100">
				<template #default="{ row }">
					<el-button type="primary" link @click.stop="openTask(row.taskId)">办理</el-button>
				</template>
			</el-table-column>
		</el-table>
	</el-card>
</template>

<style src="@/styles/workflow-pages.css" scoped></style>
