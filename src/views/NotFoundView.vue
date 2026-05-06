<script setup lang="ts">
import { useRouter } from 'vue-router';
import { getFirstAllowedRouteName } from '@/router/firstAllowedRoute';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const auth = useAuthStore();

function goHome() {
	router.push({ name: getFirstAllowedRouteName(auth.role) });
}
</script>

<template>
	<div
		class="not-found flex min-h-[50vh] flex-col items-center justify-center gap-4 text-slate-600 dark:text-slate-300"
	>
		<p class="text-6xl font-semibold text-slate-400 dark:text-slate-500">404</p>
		<p class="text-base">页面不存在或无权访问</p>
		<el-button type="primary" @click="goHome">返回首页</el-button>
	</div>
</template>
