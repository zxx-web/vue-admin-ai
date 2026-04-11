<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowDown, Close, Document, Grid, Odometer, User } from '@element-plus/icons-vue';
import { ROLE_LABELS } from '@/constants/role';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';
import { useTabsStore } from '@/stores/tabs';

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const auth = useAuthStore();
const tabsStore = useTabsStore();

const topNavScrollRef = ref<HTMLElement | null>(null);

const activeMenu = computed(() => route.path);

const roleText = computed(() => (auth.role ? ROLE_LABELS[auth.role] : ''));

const breadcrumbs = computed(() => {
	const matched = route.matched.filter((r) => r.meta?.title);
	return matched.map((r, i) => ({
		title: r.meta.title as string,
		to: i < matched.length - 1 ? r.path || '/' : undefined,
	}));
});

watch(
	() => route.fullPath,
	async () => {
		tabsStore.addFromRoute(route);
		await nextTick();
		const root = topNavScrollRef.value;
		if (!root) return;
		const active = root.querySelector('.nav-chip.is-active');
		active?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
	},
	{ immediate: true }
);

function onUserCommand(cmd: string) {
	if (cmd === 'logout') {
		auth.logout();
		tabsStore.reset();
		router.replace({ name: 'login' });
	}
}

function isTabActive(path: string) {
	return route.path === path;
}

function closeTab(path: string) {
	if (tabsStore.visited.length <= 1) return;
	const closingCurrent = route.path === path;
	const list = [...tabsStore.visited];
	const idx = list.findIndex((t) => t.path === path);
	tabsStore.remove(path);
	if (!closingCurrent) return;
	const next = list[idx - 1] ?? list[idx + 1];
	if (next) router.push(next.fullPath);
	else router.push({ name: 'dashboard' });
}

/** 在横向导航上：鼠标滚轮上下 / 触控板左右滑动 → 左右滚动标签区域 */
function onTopNavWheel(e: WheelEvent) {
	const el = topNavScrollRef.value;
	if (!el || el.scrollWidth <= el.clientWidth) return;

	// 触控板横向滑动以 deltaX 为主；普通鼠标滚轮多为 deltaY，映射为左右滚动
	const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
	if (!delta) return;

	e.preventDefault();
	el.scrollLeft += delta;
}

let removeTopNavWheel: (() => void) | undefined;

onMounted(() => {
	nextTick(() => {
		const el = topNavScrollRef.value;
		if (!el) return;
		const handler = (e: Event) => onTopNavWheel(e as WheelEvent);
		el.addEventListener('wheel', handler, { passive: false });
		removeTopNavWheel = () => el.removeEventListener('wheel', handler);
	});
});

onBeforeUnmount(() => {
	removeTopNavWheel?.();
});
</script>

<template>
	<el-container class="admin-layout">
		<el-aside width="220px" class="aside">
			<div class="logo">{{ appStore.title }}</div>
			<el-menu
				:default-active="activeMenu"
				router
				background-color="#304156"
				text-color="#bfcbd9"
				active-text-color="#409eff"
			>
				<el-menu-item index="/dashboard">
					<el-icon><Odometer /></el-icon>
					<span>仪表盘</span>
				</el-menu-item>
				<el-menu-item index="/demo">
					<el-icon><Document /></el-icon>
					<span>示例页面</span>
				</el-menu-item>
				<el-sub-menu v-if="auth.isAdmin" index="scroll-test">
					<template #title>
						<el-icon><Grid /></el-icon>
						<span>滚动测试</span>
					</template>
					<el-menu-item v-for="i in 8" :key="i" :index="`/scroll-test/p${i}`">
						测试页 {{ String(i).padStart(2, '0') }}
					</el-menu-item>
				</el-sub-menu>
			</el-menu>
		</el-aside>

		<el-container direction="vertical" class="main-area">
			<el-header class="header" height="56px">
				<el-breadcrumb separator="/">
					<el-breadcrumb-item v-for="(b, i) in breadcrumbs" :key="i" :to="b.to">
						{{ b.title }}
					</el-breadcrumb-item>
				</el-breadcrumb>
				<div class="header-right">
					<el-dropdown trigger="click" @command="onUserCommand">
						<span class="user-trigger">
							<el-icon class="user-icon"><User /></el-icon>
							<span class="user-meta">
								<span class="user-name">{{ auth.username }}</span>
								<el-tag v-if="roleText" size="small" type="info" class="role-tag">{{
									roleText
								}}</el-tag>
							</span>
							<el-icon><ArrowDown /></el-icon>
						</span>
						<template #dropdown>
							<el-dropdown-menu>
								<el-dropdown-item command="logout">退出登录</el-dropdown-item>
							</el-dropdown-menu>
						</template>
					</el-dropdown>
				</div>
			</el-header>

			<div ref="topNavScrollRef" class="top-nav-scroll">
				<div class="top-nav-track">
					<div
						v-for="t in tabsStore.visited"
						:key="t.path"
						class="nav-chip"
						:class="{ 'is-active': isTabActive(t.path) }"
					>
						<router-link :to="t.fullPath" class="nav-chip-link">
							{{ t.title }}
						</router-link>
						<button
							v-if="tabsStore.visited.length > 1"
							type="button"
							class="nav-chip-close"
							aria-label="关闭标签"
							@click="closeTab(t.path)"
						>
							<el-icon><Close /></el-icon>
						</button>
					</div>
				</div>
			</div>

			<el-main class="content">
				<router-view v-slot="{ Component }">
					<keep-alive :include="['DashboardView', 'DemoView', 'SamplePageView']">
						<component :is="Component" />
					</keep-alive>
				</router-view>
			</el-main>
		</el-container>
	</el-container>
</template>

<style scoped>
.admin-layout {
	height: 100vh;
	overflow: hidden;
	background: var(--el-bg-color);
}

.aside {
	height: 100%;
	background: #304156;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.logo {
	height: 56px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 16px;
	font-weight: 600;
	color: #fff;
	letter-spacing: 0.02em;
	border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	flex-shrink: 0;
}

.aside :deep(.el-menu) {
	border-right: none;
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	overflow-x: hidden;
}

.main-area {
	flex: 1;
	min-width: 0;
	min-height: 0;
	background: #f0f2f5;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.header {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 20px;
	background: #fff;
	border-bottom: 1px solid var(--el-border-color-lighter);
	box-sizing: border-box;
}

.header-right {
	flex-shrink: 0;
}

.user-trigger {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	cursor: pointer;
	font-size: 14px;
	color: var(--el-text-color-primary);
}

.user-icon {
	font-size: 18px;
}

.user-meta {
	display: inline-flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 2px;
	max-width: 140px;
}

.user-name {
	max-width: 140px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: 14px;
}

.role-tag {
	margin: 0;
	height: 20px;
	padding: 0 6px;
	line-height: 18px;
	font-size: 11px;
}

.top-nav-scroll {
	flex-shrink: 0;
	overflow-x: auto;
	overflow-y: hidden;
	scroll-behavior: smooth;
	background: #fff;
	border-bottom: 1px solid var(--el-border-color-lighter);
	box-sizing: border-box;
}

.top-nav-scroll::-webkit-scrollbar {
	height: 6px;
}

.top-nav-scroll::-webkit-scrollbar-thumb {
	background: var(--el-border-color-darker);
	border-radius: 3px;
}

.top-nav-track {
	display: flex;
	flex-direction: row;
	flex-wrap: nowrap;
	align-items: center;
	gap: 8px;
	padding: 8px 16px;
	width: max-content;
	min-width: 100%;
	box-sizing: border-box;
}

.nav-chip {
	display: inline-flex;
	flex-shrink: 0;
	align-items: stretch;
	max-width: 200px;
	font-size: 13px;
	border-radius: 4px;
	border: 1px solid var(--el-border-color-lighter);
	background: #f4f4f5;
	color: var(--el-text-color-regular);
	transition:
		color 0.15s,
		border-color 0.15s,
		background 0.15s;
	user-select: none;
}

.nav-chip:hover {
	border-color: var(--el-color-primary-light-5);
	color: var(--el-color-primary);
}

.nav-chip.is-active {
	background: var(--el-color-primary);
	border-color: var(--el-color-primary);
	color: #fff;
}

.nav-chip.is-active:hover {
	color: #fff;
	border-color: var(--el-color-primary);
}

.nav-chip-link {
	flex: 1;
	min-width: 0;
	display: flex;
	align-items: center;
	padding: 4px 4px 4px 12px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	text-decoration: none;
	color: inherit;
}

.nav-chip-close {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: 28px;
	padding: 0;
	margin: 0;
	border: none;
	border-left: 1px solid rgba(0, 0, 0, 0.06);
	background: transparent;
	color: inherit;
	cursor: pointer;
	border-radius: 0 4px 4px 0;
}

.nav-chip.is-active .nav-chip-close {
	border-left-color: rgba(255, 255, 255, 0.35);
}

.nav-chip-close:hover {
	background: rgba(0, 0, 0, 0.06);
}

.nav-chip.is-active .nav-chip-close:hover {
	background: rgba(255, 255, 255, 0.15);
}

.content {
	flex: 1;
	min-height: 0;
	padding: 16px;
	box-sizing: border-box;
	overflow-x: hidden;
	overflow-y: auto;
}
</style>
