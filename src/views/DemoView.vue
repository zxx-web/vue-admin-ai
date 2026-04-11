<script setup lang="ts">
defineOptions({ name: 'DemoView' });
</script>

<template>
	<el-card shadow="never" class="demo-card">
		<template #header>
			<span class="card-title">示例页面</span>
		</template>
		<p class="lead">这是一个用于演示<strong>路由切换</strong>的占位页面。</p>
		<p class="text">从左侧菜单或顶部标签可切换到「仪表盘」；本页无额外业务逻辑，方便你后续替换为真实模块（如用户管理、系统设置等）。</p>
		<el-divider />
		<el-descriptions title="当前路由信息" :column="1" border>
			<el-descriptions-item label="路径">/demo</el-descriptions-item>
			<el-descriptions-item label="说明">内容区使用布局内的 router-view 渲染</el-descriptions-item>
		</el-descriptions>
	</el-card>
</template>

<style scoped>
.demo-card {
	max-width: 720px;
}

.card-title {
	font-weight: 600;
}

.lead {
	font-size: 15px;
	margin: 0 0 12px;
	color: var(--el-text-color-primary);
}

.text {
	margin: 0;
	font-size: 14px;
	color: var(--el-text-color-regular);
	line-height: 1.6;
}
</style>
