<script setup lang="ts">
import { computed } from 'vue';
import { Moon, Sunny } from '@element-plus/icons-vue';
import { useThemeStore } from '@/stores/theme';

const theme = useThemeStore();

const icon = computed(() => (theme.isDark ? Moon : Sunny));
const tip = computed(() => (theme.isDark ? '切换亮色模式' : '切换暗色模式'));

function toggle() {
	theme.toggleTheme();
}
</script>

<template>
	<el-tooltip :content="tip" placement="bottom">
		<el-button circle :icon="icon" @click="toggle" />
	</el-tooltip>
</template>
