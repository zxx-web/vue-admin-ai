---
name: vue-admin-ai-commit
description: >-
  On the current branch: splits vue-admin-ai work into small, readable Git commits;
  relies on Husky (lint-staged + commitlint) at commit time for code and message rules;
  requires git push after commits. Use for 提交规范 / review-friendly history. PR optional.
---

# vue-admin-ai：可审查的提交

## 目标

- **范围**：在**当前分支**上完成 `git add` / `git commit`，完成后**必须** `git push`（不要求开 PR）。
- **历史可读**：一次提交只做一件事，diff 尽量小、语义清晰。
- **规范自动化**：**不必**为通过规范而单独跑 `npm run lint` / `npm run build`。`git commit` 时会由 Husky 自动执行 **代码校验**（`pre-commit` + `lint-staged`：ESLint、Prettier）与 **提交信息校验**（`commit-msg` + commitlint）。

## 自动校验说明（commit 时触发）

- **代码规范**：暂存区文件经 `lint-staged`（见 `package.json`），与手动全量检查规则一致；失败则本次 commit 中止，按终端报错改代码或消息即可。
- **提交规范**：提交说明须符合 Conventional Commits，由 commitlint 校验（见 `commitlint.config.mjs`）。
- 编写代码时仍应遵循项目风格；**不要**手改 `src/auto-imports.d.ts`、`src/components.d.ts`（由工具生成）。

## 提交信息（Conventional Commits）

**格式：**

```text
<type>(<optional-scope>): <简短描述，祈使句，中文或英文均可>

<可选正文：说明动机、边界情况>

<可选脚注：BREAKING CHANGE: ...>
```

**常用 `type`：** `feat`、`fix`、`docs`、`style`、`refactor`、`perf`、`test`、`chore`、`ci`、`build`、`revert`。

**`scope`（可选）：** 与改动区域一致即可，例如 `router`、`auth`、`layout`、`api`、`views`、`deps`。

**示例：**

```text
feat(router): 动态路由按角色过滤并挂载

fix(layout): 修正嵌套菜单 fullPath 双斜杠问题

chore: 调整 husky 与 commitlint 说明
```

**禁止：** 空泛主题如 `update`、`fix bug`；与改动无关的一句带过；在一条提交里混用多个无关 type。

## 拆分成多次提交（避免一次性大提交）

1. **先看全貌**：`git status`、`git diff`（或按文件 `git diff -- path`）。
2. **按「审查单元」拆分**，例如：
   - 路由/权限一提交，UI/布局另一提交；
   - 重构与行为变更分开；
   - 格式化/仅 Prettier 的变更单独一提交（`style` 或 `chore`），避免与逻辑混在同一 diff。
3. **暂存策略**：
   - 按文件：`git add path/to/file`；
   - 同一文件内多块改动：`git add -p` 只暂存与当前提交相关的 hunk。
4. **体量经验**：单 commit 尽量让人 **几分钟内**能读完；若 diff 超过约 **200～300 行**（或跨多个无关模块），继续拆。
5. 每个 commit 完成后可 `git show --stat` 自检是否「一条信息对应一块变更」。

## 工作流小结

1. 确认在目标分支上（`git branch`）；拆好变更 → 只 `git add` 本批文件/hunk。
2. `git commit`（Husky 自动跑代码与提交信息校验；不通过则修改后重试）。
3. 重复 1–2 直至工作区干净。
4. **`git push`（必须）**，将当前分支同步到远端。
5. 开 PR 非必需；若需要，再补充动机、范围、风险等说明。

## 与本项目工具的对应关系

| 环节                 | 配置 / 触发时机                                                                       |
| -------------------- | ------------------------------------------------------------------------------------- |
| 提交信息             | `commitlint.config.mjs`；`git commit` 时 `.husky/commit-msg`                          |
| 暂存区代码           | `lint-staged`（`package.json`）；`git commit` 时 `.husky/pre-commit`                  |
| 本地全量排查（可选） | 仅当需对照整仓问题时使用：`npm run lint`、`npm run build`；**不是提交流程的必做步骤** |

若 hook 失败：根据终端报错修正后再次 `git commit`，不要跳过 hook（除非用户明确要求并自行承担风险）。
