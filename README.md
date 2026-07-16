# Video Publish Skill

[English](README.en.md) · [开发文档](docs/DEVELOPMENT.md) · [贡献指南](CONTRIBUTING.md) · [安全策略](SECURITY.md)

一个本地优先、面向 Codex 的视频发布准备 Skill。它从视频或字幕生成发布文案和四种比例的
AI 封面，并在用户明确授权后，把视频、封面和元数据暂存到内容平台的创作页。最终发布按钮
始终由用户人工检查和点击。

> [!IMPORTANT]
> 本项目不是无人值守发布器。它不会绕过登录、验证码或平台风控，也不会自动点击最终发布。

## 能力

- 从 `MP4`、`MOV`、`MKV`、`WebM` 或字幕文件提取完整转写。
- 基于字幕生成摘要、标题、简介与封面文案。
- 通过 Codex ImageGen 分别生成 `16:9`、`4:3`、`3:4`、`9:16` 封面。
- 支持参考图、人物一致性和局部比例重做，并保留不可变封面版本。
- 经两层明确确认后，在 Chrome/Chromium 打开创作页。
- 可选使用 Ego Lite 暂存小红书、抖音、Bilibili 和微信视频号表单。
- 在本机持久化会话，支持中断恢复与页面事实复验。

## 平台支持

| 平台       | 打开创作页 | Ego Lite 暂存 | 暂存内容                                               |
| ---------- | ---------- | ------------- | ------------------------------------------------------ |
| 小红书     | 是         | 是            | 标题、正文、真实话题实体、可选原创声明、`3:4` 封面     |
| 抖音       | 是         | 是            | 标题、正文、真实话题实体、可选 `3:4 / 4:3` 封面        |
| Bilibili   | 是         | 是            | 标题、简介、标签、可选自制声明、`4:3` 封面、旧草稿隔离 |
| 微信视频号 | 是         | 是            | 描述、话题、可选原创声明、`3:4 / 4:3` 封面             |
| 微博       | 是         | 否            | 仅打开页面，后续由用户手动完成                         |
| 知乎       | 是         | 否            | 仅打开页面，后续由用户手动完成                         |

上游文档曾列出“抖音原创声明”，但当前适配器没有可验证的声明动作，因此本项目不宣称该
能力。平台页面随时可能变化，自动暂存以运行时验收结果为准。

## 前置条件

- Node.js 22.13 或更高版本，用于开发、构建和安装；构建出的 Skill CLI 仍以 Node.js 20 为目标。
- pnpm 11（仓库锁定版本见 `packageManager`）。
- 已安装 Codex，且支持 Agent Skills 与 ImageGen。
- FFmpeg 和 FFprobe；无内嵌字幕时还需要 Python 3 与 `faster-whisper`。
- Google Chrome 或 Chromium，用于打开创作页。
- 可选：Ego Lite 与可用的 `ego-browser` 命令，用于自动暂存。

## 安装

```bash
git clone https://github.com/sunshineLixun/video-publish-skill.git
cd video-publish-skill
corepack enable
pnpm install --frozen-lockfile
pnpm build
pnpm install:skill
```

默认安装到 `$CODEX_HOME/skills/prepare-video-publish`；没有设置 `CODEX_HOME` 时使用
`~/.codex/skills/prepare-video-publish`。目标已存在时，使用：

```bash
pnpm install:skill --force
```

## 使用

在 Codex 中附上视频或字幕，然后调用：

```text
$prepare-video-publish
```

常见后续指令：

- “标题改短一些，只重做 9:16。”
- “使用这张人物参考图，保持人物一致。”
- “确认，打开小红书、Bilibili 和抖音。”
- “自动填入四个平台，停在发布按钮前。”

Skill 第一次展示文案和封面后必须暂停。打开平台需要当前对话中的明确确认，CLI 还会再次
要求 `--confirmed`。自动暂存需要用户额外授权；确认打开页面不等于确认自动填写。

## 本地数据与隐私

- 会话默认写入当前目录的 `.video-publish/`，该目录已被 Git 忽略。
- 视频、字幕、转写文本、参考图和成品封面默认不上传到本项目的任何服务。
- 只有用户明确选择的参考图会交给 Codex ImageGen。
- Ego Lite 复用自身隔离任务空间中的登录态；本项目不导出 Cookie。
- 不要把 session、页面证据、日志或包含个人信息的媒体附到公开 Issue。

详见 [安全策略](SECURITY.md) 与 [运行时恢复说明](skills/prepare-video-publish/references/runtime.md)。

## 开发命令

| 命令                         | 说明                                       |
| ---------------------------- | ------------------------------------------ |
| `pnpm audit:dependencies`    | 使用官方 npm Registry 检查高危生产依赖漏洞 |
| `pnpm dev`                   | 直接运行 TypeScript CLI                    |
| `pnpm fmt`                   | 格式化仓库源码与文档                       |
| `pnpm fmt:check`             | 检查格式                                   |
| `pnpm lint`                  | 运行 OXC lint                              |
| `pnpm check-types`           | 检查所有 TypeScript workspace              |
| `pnpm check:opensource`      | 扫描必需文件、敏感路径和常见凭据格式       |
| `pnpm build`                 | 构建 core、runtime 和可安装 Skill          |
| `pnpm install:skill --force` | 覆盖安装到本机 Codex Skills 目录           |

架构、数据契约、CLI 和安全边界见 [开发文档](docs/DEVELOPMENT.md)；重要设计理由见
[架构决策记录](docs/decisions/README.md)。

## 贡献

欢迎提交 Bug、平台兼容性修复和文档改进。请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。
报告页面适配问题时必须删除账号、Cookie、手机号、二维码和未公开视频等敏感信息。

## 第三方代码

仓库包含从 [`oil-oil/video-publisher-skill`](https://github.com/oil-oil/video-publisher-skill)
固定提交迁移的 MIT 许可代码。来源、提交和本地修改见
[UPSTREAM.md](vendor/oil-video-publisher/UPSTREAM.md) 与
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## License

本项目使用 [Apache License 2.0](LICENSE)。Vendored 第三方代码继续受其各自许可证约束。
