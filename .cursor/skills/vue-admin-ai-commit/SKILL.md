---
name: vue-admin-ai-commit
description: >-
  Commits vue-admin-ai on the current branch in small steps; uses Husky on commit;
  requires git push immediately after each successful commit (not only once at the end).
  Use when the user wants to 提交代码.
---

# vue-admin-ai 提交

- **当前分支**：按逻辑拆成多次提交；用 `git add` / `git add -p`，**一条 commit 一件事**。
- **`git commit`**：由 Husky 自动校验代码（lint-staged）与说明（commitlint / Conventional Commits：`type(scope): subject`）。不必事先跑 `npm run lint` / `npm run build`。
- **每完成一次 `git commit` 后立刻 `git push`**（有多条提交时：提交 1 → push → 提交 2 → push → …），不要攒到最后只 push 一次。
- 勿 `git commit --no-verify`（除非用户明确要求）。
