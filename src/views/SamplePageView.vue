<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

defineOptions({ name: 'SamplePageView' });

const route = useRoute();
const title = computed(() => (route.meta.title as string) || '页面');
</script>

<template>
	<el-card shadow="never" class="sample-card">
		<template #header>
			<span class="card-title">{{ title }}</span>
		</template>
		<p class="path">当前路径：<code>{{ route.path }}</code></p>
		<p class="hint">从左侧「滚动测试」打开多个页面后，顶部会出现多个链接，可横向滚动查看。</p>
	</el-card>
</template>

<style scoped>
.sample-card {
	max-width: 640px;
}

.card-title {
	font-weight: 600;
}

.path {
	margin: 0 0 12px;
	font-size: 14px;
	color: var(--el-text-color-regular);
}

.hint {
	margin: 0;
	font-size: 14px;
	color: var(--el-text-color-secondary);
	line-height: 1.6;
}

code {
	padding: 2px 6px;
	border-radius: 4px;
	background: var(--el-fill-color-light);
	font-size: 13px;
}
</style>
