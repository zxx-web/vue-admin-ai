<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { FormInstance } from 'element-plus';
import { ElMessage } from 'element-plus';
import ThemeToggle from '@/components/ThemeToggle.vue';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const mockHint = computed(() =>
	import.meta.env.VITE_MOCK_AUTH === 'true'
		? 'Mock 账号：① 管理员 admin / admin123（含「滚动测试」）② 运营 user / user123（仅仪表盘与示例页）'
		: ''
);

const loading = ref(false);
const form = reactive({
	username: '',
	password: '',
});

const rules = {
	username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
	password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
};

const formRef = ref<FormInstance>();

async function onSubmit() {
	if (!formRef.value) return;
	try {
		await formRef.value.validate();
	} catch {
		return;
	}
	loading.value = true;
	try {
		await auth.login({ username: form.username.trim(), password: form.password });
		const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard';
		await router.replace(redirect || '/dashboard');
		ElMessage.success('登录成功');
	} catch (e) {
		const msg = e instanceof Error ? e.message : '登录失败';
		ElMessage.error(msg);
	} finally {
		loading.value = false;
	}
}
</script>

<template>
	<div
		class="login-page relative bg-gradient-to-br from-slate-100 via-slate-200 to-slate-100 text-slate-900 transition-colors dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100"
	>
		<div class="absolute right-4 top-4 z-10">
			<ThemeToggle />
		</div>
		<el-card
			class="login-card !bg-white/95 dark:!border-slate-700 dark:!bg-slate-900/95"
			shadow="hover"
		>
			<template #header>
				<span class="title text-slate-900 dark:text-slate-100">登录</span>
			</template>
			<el-form
				ref="formRef"
				:model="form"
				:rules="rules"
				label-position="top"
				size="large"
				@submit.prevent="onSubmit"
			>
				<el-form-item label="用户名" prop="username">
					<el-input v-model="form.username" autocomplete="username" clearable />
				</el-form-item>
				<el-form-item label="密码" prop="password">
					<el-input
						v-model="form.password"
						type="password"
						autocomplete="current-password"
						show-password
						clearable
						@keyup.enter="onSubmit"
					/>
				</el-form-item>
				<el-form-item>
					<el-button type="primary" class="submit" :loading="loading" native-type="submit">
						登录
					</el-button>
				</el-form-item>
			</el-form>
			<p v-if="mockHint" class="hint text-slate-600 dark:text-slate-300">{{ mockHint }}</p>
		</el-card>
	</div>
</template>

<style scoped>
.login-page {
	min-height: 100vh;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 24px;
}

.login-card {
	width: 100%;
	max-width: 400px;
}

.title {
	font-size: 18px;
	font-weight: 600;
}

.submit {
	width: 100%;
}

.hint {
	margin: 0;
	font-size: 13px;
	line-height: 1.5;
}
</style>
