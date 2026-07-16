# Video Publish Skill 开发指南

本文面向准备修改源码、平台适配器或安装包的贡献者。产品能力与安装方式见
[README](../README.md)，命令参数见 [CLI 手册](CLI.md)，架构和安全理由见
[ARCHITECTURE.md](ARCHITECTURE.md) 与 [架构决策记录](decisions/README.md)。

## 开发环境

- Node.js 22.13 或更高版本。
- pnpm 11；准确版本由根目录 `packageManager` 字段锁定。
- Git。
- 修改字幕处理时需要 FFmpeg、FFprobe、Python 3 和可选的 `faster-whisper`。
- 修改页面打开逻辑时需要 Chrome 或 Chromium。
- 修改自动暂存适配器时需要 Ego Lite 和 `ego-browser`。

仓库的开发工具使用 Node.js 22.13+，但构建出的 Skill CLI 仍以 Node.js 20 为目标。

## 本地设置

```bash
git clone https://github.com/sunshineLixun/video-publish-skill.git
cd video-publish-skill
corepack enable
pnpm install --frozen-lockfile
```

常用开发命令：

```bash
pnpm dev platforms list
pnpm fmt
pnpm check:opensource
pnpm fmt:check
pnpm lint
pnpm check-types
pnpm audit:dependencies
pnpm build
```

## 仓库结构

```text
video-publish-skill/
├── .github/                         Issue、PR、Dependabot 与 CI 配置
├── docs/                            架构、CLI、发布与决策文档
├── packages/
│   ├── core/src/                    Zod 数据契约与平台定义
│   └── runtime/
│       ├── src/                     CLI 与确定性本地运行逻辑
│       └── scripts/transcribe.py    faster-whisper 转写入口
├── scripts/                         构建、安装与开源边界检查
├── skills/prepare-video-publish/    可安装的 Codex Skill
└── vendor/oil-video-publisher/      固定提交的 MIT 上游适配器
```

`packages` 是可维护源码，不会发布到 npm：

- `packages/core` 定义 session、内容、封面、参考图和平台的数据结构。
- `packages/runtime` 实现字幕处理、原子会话写入、封面版本、Chrome 启动和 Ego Lite 调度。
- `skills/prepare-video-publish` 是 Codex 最终安装使用的成品。
- `vendor/oil-video-publisher` 保存可审计、可复现的上游浏览器编排代码。

## 源码与生成物

`pnpm build` 执行三个步骤：

1. 构建 `packages/core`。
2. 把 `packages/runtime` 及其依赖打包为单文件 CLI。
3. 将 CLI、转写脚本和固定版本的 Ego 引擎复制到可安装 Skill。

以下文件或目录由构建产生，不应直接修改：

- `packages/core/dist/`
- `packages/runtime/dist/`
- `skills/prepare-video-publish/scripts/video-publish.mjs`
- `skills/prepare-video-publish/scripts/ego-publisher/`

修改 TypeScript 源码或 `vendor/` 后必须运行 `pnpm build`，并提交同步更新的 Skill 生成物。
CI 会重新构建并通过 `git diff` 检查生成物是否过期。

## 开发边界

### Core

跨命令共享的数据结构放在 `packages/core`。外部文件和 CLI 输入必须先通过 Zod 契约；不要在
runtime 中复制一套手写校验。

### Runtime

`packages/runtime` 只负责可重复的本地操作。语义理解、文案创作和封面生成属于当前 Codex
任务，不应搬进 CLI。会话写入必须继续使用临时文件、原子重命名和现有锁机制。

### 平台适配器

平台页面随时可能变化。适配器应保持以下阶段可区分、可恢复：

```text
inspect → upload → mutate → verify → hand off
```

- 修改前读取当前页面事实，不把历史 job 状态当作页面事实。
- 只操作当前视频对应的草稿。
- 话题、标签、声明和封面必须在修改后重新读取并验收。
- 登录、验证码、扫码和风控提示交还用户处理。
- 不得点击或间接触发最终发布按钮。

最终发布保持人工操作的原因见
[ADR-001](decisions/001-manual-final-publish.md)。上游固定版本和本地修改规则见
[ADR-002](decisions/002-vendored-ego-engine.md)。

## 本地数据与隐私

运行时默认把媒体、转写和 session 写入当前目录的 `.video-publish/`。Ego 调度器还可能在用户
主目录保存自己的 job 和锁状态。这些都不是测试夹具，不得提交或附到公开 Issue。

提交前确认不存在：

- 视频、封面、字幕和真实 session；
- Cookie、Token、二维码、账号名和页面截图；
- 个人绝对路径、浏览器状态和调试日志；
- 未经归属说明的新第三方代码。

`pnpm check:opensource` 会检查常见泄露模式和必需治理文件，但不能替代人工复核。

## 质量检查

| 命令                      | 作用                                                 |
| ------------------------- | ---------------------------------------------------- |
| `pnpm check:opensource`   | 检查敏感路径、常见凭据、必需文件和本地 Markdown 链接 |
| `pnpm fmt:check`          | 检查 OXC 格式                                        |
| `pnpm lint`               | 运行 OXC lint，并把 warning 视为失败                 |
| `pnpm check-types`        | 检查两个 TypeScript workspace                        |
| `pnpm audit:dependencies` | 通过官方 npm Registry 检查高危生产依赖漏洞           |
| `pnpm build`              | 构建源码并刷新可安装 Skill                           |

GitHub CI 在每个 Pull Request 和 `main` push 上执行以上门禁，并检查生成物没有未提交差异。

## 手动验证

没有真实平台账号时，至少完成：

```bash
pnpm build
node skills/prepare-video-publish/scripts/video-publish.mjs platforms list
pnpm install:skill --destination /tmp/prepare-video-publish-check
```

平台适配器的人工验证必须使用维护者控制的账号和可丢弃草稿：

- 使用不含私人信息的测试媒体。
- 验证中断恢复和重复运行不会重复修改。
- 确认最终状态是“等待用户复核”，不是“已经发布”。
- 不在自动化测试或发布流程中执行真实发布。

## 文档与发布

- 用户安装和能力说明：[README](../README.md)
- CLI 命令：[CLI.md](CLI.md)
- 架构与信任边界：[ARCHITECTURE.md](ARCHITECTURE.md)
- Agent 工作流：[SKILL.md](../skills/prepare-video-publish/SKILL.md)
- 内容与封面契约：`skills/prepare-video-publish/references/`
- 上游来源：[UPSTREAM.md](../vendor/oil-video-publisher/UPSTREAM.md)
- 贡献流程：[CONTRIBUTING.md](../CONTRIBUTING.md)
- 发布清单：[RELEASING.md](RELEASING.md)

用户可见行为发生变化时更新 README 与 Changelog；架构选择发生变化时新增 ADR，不覆盖已有
决策记录。
