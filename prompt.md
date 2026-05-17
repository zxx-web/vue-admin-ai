## 任务目标

在我现有的 Vue 项目中集成一个**可视化流程设计器**，并基于它实现一个**员工请假审批模块**。请提供前端实现方案，包括核心代码示例、组件设计、与后端交互的接口约定。

## 技术栈

- 框架：Vue 3
- UI库：Element Plus
- 状态管理：Pinia
- HTTP请求：axios
- 流程设计器库：**LogicFlow**（及其官方扩展 @logicflow/extension）

## 功能要求

### 1. 流程设计器模块

- 提供一个可拖拽绘图的画布，基于 LogicFlow 实现，支持 BPMN 基本元素：开始节点、结束节点、用户任务节点（审批节点）、排他网关（条件分支）。
- 每个用户任务节点可配置（可通过点击节点弹出侧边栏或模态框）：
  - 节点名称（如“主管审批”）
  - 审批人类型（指定角色/上级主管/候选人组）
  - 关联表单（用一个 JSON schema 描述）
- 设计器能导出流程定义为 JSON 格式（LogicFlow 原生数据），并能导入已有定义进行编辑。
- 提供保存按钮，调用后端接口 `/api/process/definition` 上传流程定义。

### 2. 请假模块（运行时）

- **涉及人员**：
  - 直接使用当前已存在的角色，admin相当于领导，user相当于员工
- **发起申请页**：
  - 展示一个动态表单（请假天数、事由、开始/结束时间）。
  - 提交时调用后端 `/api/process/start`，传入流程定义 key（例如 `leave_process`）和表单数据。
- **待办任务页**：
  - 列表展示当前登录用户的待审批任务（任务名称、发起人、发起时间）。
  - 点击任务进入审批详情页。
- **审批详情页**：
  - 展示只读的请假申请信息（根据任务绑定的表单 schema 渲染）。
  - 提供“通过”、“驳回”按钮，调用 `/api/tasks/complete` 并传入审批意见。
- **历史轨迹**：
  - 展示该流程实例已走过的节点和审批意见（调用 `/api/process/trace/{procInstId}`）。

## 后端接口约定（假设）

请按以下 API 定义编写前端代码，并告诉我如何 mock 这些接口以便调试：

| 方法 | 路径                              | 说明                                                       |
| ---- | --------------------------------- | ---------------------------------------------------------- |
| POST | `/api/process/definition`         | 保存流程定义（body: { key, name, logicflowData }）         |
| GET  | `/api/process/definition/list`    | 获取可发起流程列表                                         |
| POST | `/api/process/start`              | 发起流程（body: { processKey, variables }）                |
| GET  | `/api/tasks/assigned`             | 获取当前用户待办任务列表                                   |
| POST | `/api/tasks/complete`             | 完成任务（body: { taskId, approved, comment, variables }） |
| GET  | `/api/process/trace/{procInstId}` | 获取流程历史轨迹                                           |

## 输出期望

请提供：

1. 项目目录结构建议（组件拆分）
2. 流程设计器核心代码（使用 LogicFlow，包括注册自定义节点、快捷键、导出/导入等）
3. 动态表单渲染器（根据 JSON schema 渲染表单，支持文本、数字、日期等字段）
4. 待办任务列表与审批页面的代码片段（Vue 组件）
5. 与后端交互的 service 层封装示例（axios 请求）
6. 如何 mock 上述接口实现离线开发（可使用 MSW 或简单的本地 mock 函数）

## 额外要求

- 代码要有注释，解释关键部分（特别是 LogicFlow 的初始化和自定义配置）。
- 提供简单的状态管理方案（使用 Pinia 或 provide/inject 管理当前用户、待办列表刷新等）。
- 说明在 Vue 项目中引入 LogicFlow 及其样式时需要注意的问题（如引入 css、动态渲染画布容器等）。
