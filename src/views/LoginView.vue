<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import {
	isNavigationFailure,
	NavigationFailureType,
	useRoute,
	useRouter,
	type RouteLocationRaw,
} from 'vue-router';
import type { FormInstance } from 'element-plus';
import { ElMessage } from 'element-plus';
import ThemeToggle from '@/components/ThemeToggle.vue';
import type { AppRole } from '@/constants/role';
import { ensureBusinessRoutesMounted } from '@/router';
import { getFirstAllowedRouteName } from '@/router/firstAllowedRoute';
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

/** 仅允许站内路径，避免 `redirect=https://…` 或 `//…` 导致 router.replace 抛错、表现为「登不进去」 */
function sanitizeInternalRedirect(raw: string | null): string | null {
	if (raw == null || typeof raw !== 'string') return null;
	const t = raw.trim();
	if (!t.startsWith('/') || t.startsWith('//')) return null;
	if (/^https?:/i.test(t)) return null;
	return t;
}

/** 与 vue-router ErrorTypes.NAVIGATION_GUARD_REDIRECT 相同；const enum 在 verbatimModuleSyntax 下不可 import */
const NAVIGATION_GUARD_REDIRECT = 2;

function isBenignNavigationFailure(err: unknown): boolean {
	if (!isNavigationFailure(err)) return false;
	const t = (err as { type: number }).type;
	return (
		t === NAVIGATION_GUARD_REDIRECT ||
		t === NavigationFailureType.duplicated ||
		t === NavigationFailureType.cancelled ||
		t === NavigationFailureType.aborted
	);
}

/**
 * 动态路由刚 addRoute 时，首次 replace 可能短暂无匹配或 Promise 以 NavigationFailure 结束；
 * 与 F5 一样，再 replace 或整页跳转由守卫重新挂载后即可稳定进入首页。
 */
async function navigateAfterLogin(role: AppRole, target: RouteLocationRaw) {
	const home = { name: getFirstAllowedRouteName(role) } as const;
	try {
		await router.replace(target);
		return;
	} catch (err: unknown) {
		if (isBenignNavigationFailure(err)) return;
	}
	try {
		await router.replace(home);
	} catch (err: unknown) {
		if (isBenignNavigationFailure(err)) return;
		window.location.assign(router.resolve(home).href);
	}
}

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
		const role = auth.role;
		if (!role) {
			throw new Error('登录状态异常：未返回角色');
		}
		ensureBusinessRoutesMounted(role);
		const rawRedirect = typeof route.query.redirect === 'string' ? route.query.redirect : null;
		const redirect = sanitizeInternalRedirect(rawRedirect);
		const home = { name: getFirstAllowedRouteName(role) } as const;
		if (redirect) {
			await navigateAfterLogin(role, redirect);
		} else {
			await navigateAfterLogin(role, home);
		}
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
