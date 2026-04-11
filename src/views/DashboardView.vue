<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import * as echarts from 'echarts';
import request from '@/utils/request';

defineOptions({ name: 'DashboardView' });

const lineRef = ref<HTMLDivElement | null>(null);
const barRef = ref<HTMLDivElement | null>(null);
const pieRef = ref<HTMLDivElement | null>(null);
const charts: echarts.ECharts[] = [];

function resizeAll() {
	charts.forEach((c) => c.resize());
}

onMounted(() => {
	const line = lineRef.value && echarts.init(lineRef.value);
	const bar = barRef.value && echarts.init(barRef.value);
	const pie = pieRef.value && echarts.init(pieRef.value);
	if (line) {
		line.setOption({
			title: { text: '访问趋势', left: 'center', textStyle: { fontSize: 14 } },
			tooltip: { trigger: 'axis' },
			grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
			xAxis: { type: 'category', data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] },
			yAxis: { type: 'value' },
			series: [{ type: 'line', smooth: true, data: [820, 932, 901, 934, 1290, 1330, 1320] }],
		});
		charts.push(line);
	}
	if (bar) {
		bar.setOption({
			title: { text: '业务对比', left: 'center', textStyle: { fontSize: 14 } },
			tooltip: { trigger: 'axis' },
			grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
			xAxis: { type: 'category', data: ['A', 'B', 'C', 'D', 'E'] },
			yAxis: { type: 'value' },
			series: [{ type: 'bar', data: [23, 45, 32, 56, 41], itemStyle: { color: '#5470c6' } }],
		});
		charts.push(bar);
	}
	if (pie) {
		pie.setOption({
			title: { text: '来源占比', left: 'center', textStyle: { fontSize: 14 } },
			tooltip: { trigger: 'item' },
			series: [
				{
					type: 'pie',
					radius: ['42%', '68%'],
					center: ['50%', '55%'],
					data: [
						{ value: 335, name: '直接访问' },
						{ value: 234, name: '搜索引擎' },
						{ value: 154, name: '外链' },
						{ value: 120, name: '社交' },
					],
				},
			],
		});
		charts.push(pie);
	}
	window.addEventListener('resize', resizeAll);
});

onBeforeUnmount(() => {
	window.removeEventListener('resize', resizeAll);
	charts.forEach((c) => c.dispose());
	charts.length = 0;
});

async function pingApi() {
	try {
		await request.get('/health', { validateStatus: () => true });
		ElMessage.info('已发起请求（后端未就绪时会失败属正常）');
	} catch {
		ElMessage.warning('请求失败：请检查 VITE_API_BASE 或后端服务');
	}
}
</script>

<template>
	<div class="dashboard">
		<el-row :gutter="16" class="stats">
			<el-col :xs="24" :sm="12" :md="6">
				<el-card shadow="hover" class="stat-card">
					<div class="stat-value">1,286</div>
					<div class="stat-label">今日 PV</div>
				</el-card>
			</el-col>
			<el-col :xs="24" :sm="12" :md="6">
				<el-card shadow="hover" class="stat-card">
					<div class="stat-value">368</div>
					<div class="stat-label">今日 UV</div>
				</el-card>
			</el-col>
			<el-col :xs="24" :sm="12" :md="6">
				<el-card shadow="hover" class="stat-card">
					<div class="stat-value">92%</div>
					<div class="stat-label">接口可用</div>
				</el-card>
			</el-col>
			<el-col :xs="24" :sm="12" :md="6">
				<el-card shadow="hover" class="stat-card stat-action">
					<el-button type="primary" plain @click="pingApi">Axios 健康检查</el-button>
				</el-card>
			</el-col>
		</el-row>

		<el-row :gutter="16" class="charts">
			<el-col :xs="24" :lg="12">
				<el-card shadow="never">
					<div ref="lineRef" class="chart" />
				</el-card>
			</el-col>
			<el-col :xs="24" :lg="12">
				<el-card shadow="never">
					<div ref="barRef" class="chart" />
				</el-card>
			</el-col>
			<el-col :span="24">
				<el-card shadow="never">
					<div ref="pieRef" class="chart chart-wide" />
				</el-card>
			</el-col>
		</el-row>
	</div>
</template>

<style scoped>
.dashboard {
	max-width: 1400px;
	margin: 0 auto;
}

.stats {
	margin-bottom: 16px;
}

.stat-card {
	text-align: center;
}

.stat-value {
	font-size: 24px;
	font-weight: 600;
	color: var(--el-text-color-primary);
}

.stat-label {
	margin-top: 8px;
	font-size: 13px;
	color: var(--el-text-color-secondary);
}

.stat-action {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 92px;
}

.charts .el-card {
	margin-bottom: 16px;
}

.chart {
	width: 100%;
	height: 300px;
}

.chart-wide {
	height: 320px;
}
</style>
