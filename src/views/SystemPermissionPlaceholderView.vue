<script setup lang="ts">
defineOptions({ name: 'SystemPermissionPlaceholderView' });
</script>

<template>
	<el-card shadow="never" class="card">
		<template #header>
			<span class="title">权限配置</span>
		</template>
		<p class="desc">此处预留为可配置权限（角色、菜单、接口等）的实现位置，当前仅为占位页面。</p>
		<el-empty description="功能开发中" />
	</el-card>
</template>

<style scoped>
.card {
	max-width: 720px;
}

.title {
	font-weight: 600;
}

.desc {
	margin: 0 0 16px;
	font-size: 14px;
	line-height: 1.6;
	color: var(--el-text-color-regular);
}
</style>
