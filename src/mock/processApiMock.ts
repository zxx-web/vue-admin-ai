/**
 * 流程 Mock API 入口（实现见 processRuntime，按流程图驱动流转）。
 */
export {
	mockAssignedTasks,
	mockCompleteTask,
	mockGetDefinition,
	mockGetTask,
	mockListDefinitions,
	mockSaveDefinition,
	mockStartProcess,
	mockTrace,
} from '@/mock/processRuntime';
