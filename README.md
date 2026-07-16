# Video Publish Skill

[English](README.en.md) · [开发指南](docs/DEVELOPMENT.md) · [CLI](docs/CLI.md) · [贡献指南](CONTRIBUTING.md) · [安全策略](SECURITY.md)

[![skills.sh](https://skills.sh/b/sunshineLixun/video-publish-skill)](https://www.skills.sh/sunshinelixun/video-publish-skill)

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

上游文档曾列出“抖音原创声明”，但当前适配器没有可验证的声明动作，因此本项目不宣称该
能力。平台页面随时可能变化，自动暂存以运行时验收结果为准。

## 安装

### skills.sh（推荐）

```bash
npx skills add sunshineLixun/video-publish-skill \
  --skill prepare-video-publish \
  --global \
  --agent codex \
  --yes
```

skills.sh 会识别仓库中的 `skills/prepare-video-publish/SKILL.md`，并安装到 Codex 的全局 Skill
目录。后续更新：

```bash
npx skills update prepare-video-publish --global --yes
```

项目页面：[skills.sh/sunshinelixun/video-publish-skill](https://www.skills.sh/sunshinelixun/video-publish-skill)。

### 独立安装器

macOS / Linux：

```bash
curl -fsSL https://raw.githubusercontent.com/sunshineLixun/video-publish-skill/main/install.sh | sh
```

Windows PowerShell：

```powershell
irm https://raw.githubusercontent.com/sunshineLixun/video-publish-skill/main/install.ps1 | iex
```

安装器只下载已构建好的 Skill，并安装到 `$CODEX_HOME/skills/prepare-video-publish`；未设置
`CODEX_HOME` 时使用 `~/.codex/skills/prepare-video-publish`。已有版本会在新包完整下载并校验
后安全替换。同一条命令也用于升级。

如需安装特定 Git ref，可以先设置 `VIDEO_PUBLISH_REF`。安装器不需要 Git、clone、pnpm 或
本地构建。

## 依赖如何处理

安装命令只负责安装 Skill，不会静默修改系统或自动安装第三方软件。用户不需要在安装前把
所有工具配齐；Skill 只在使用对应能力时检查，并在缺失时给出明确提示：

| 使用场景           | 按需检查的能力                              |
| ------------------ | ------------------------------------------- |
| 运行 Skill CLI     | Node.js 20+                                 |
| 直接处理字幕文件   | 无需 FFmpeg 或 Whisper                      |
| 读取视频内嵌字幕   | FFmpeg、FFprobe                             |
| 转写没有字幕的视频 | FFmpeg、FFprobe、Python 3、`faster-whisper` |
| 仅打开创作页       | Chrome 或 Chromium                          |
| 自动暂存平台表单   | Ego Lite 与 `ego-browser`                   |

ImageGen 由支持该能力的 Codex 环境提供。FFmpeg、Chrome 和 Ego Lite 属于系统级或独立应用，
不应由一个 Skill 安装器在未经用户确认时自动修改。具体恢复方式见
[运行时说明](skills/prepare-video-publish/references/runtime.md)。

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

开发人员需要 clone、Node.js 22.13+ 和 pnpm 11；完整搭建方式见
[开发指南](docs/DEVELOPMENT.md)。命令参数见 [CLI 手册](docs/CLI.md)；重要设计
理由见 [架构决策记录](docs/decisions/README.md)。

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
