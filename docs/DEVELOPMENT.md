# Video Publish Skill 开发文档

## 1. 产品定义

Video Publish Skill 是一个开源、本地优先、Codex 原生的视频发布准备工作流。

唯一交互入口是用户当前打开的 Codex 任务。Skill 不创建 Web 页面，不启动本地服务器，
也不通过 app-server 创建第二个 Codex 任务。文本草稿、封面预览、参考图输入、修改反馈和
发布确认都发生在同一任务中。

最终能力：

- 从视频或字幕获得完整转写文本。
- 根据字幕生成摘要、标题、简介和封面文案。
- 使用 Codex 内置 ImageGen 独立生成 `16:9`、`4:3`、`3:4`、`9:16` 完整封面。
- 接受风格、构图和人物参考图。
- 通过自然语言进行多轮、局部封面修改。
- 用户明确确认后，在 Chrome 打开小红书、微博、知乎、Bilibili、抖音、微信视频号发布页。
- 用户进一步明确授权后，通过 Ego Lite 为小红书、抖音、Bilibili、微信视频号上传视频、
  对应封面并填写文案。
- 最终发布始终由用户人工检查和点击。

## 2. 非目标

- 不部署网站、SaaS 或公网后端。
- 不提供 React 审核页面、本地 HTTP API 或 SSE。
- 不启动后台 Agent，不调用 Codex app-server，不创建或恢复其他任务。
- 不调用平台开放 API，不导出或解析 Cookie。
- 不自动点击最终发布按钮。
- 不绕过验证码、扫码登录或平台风控。
- 不读取、截取或分析视频帧来制作封面。
- 不使用 React、Canvas、SVG 或 HTML 叠加封面文字。

## 3. 用户流程

```text
当前 Codex 任务
      |
      | 用户上传视频/字幕并调用 Skill
      v
prepare -> transcript.txt + session.json
      |
      | Codex 阅读完整字幕
      v
content.json -> finalize
      |
      | 当前任务中的 Codex ImageGen
      v
四比例完整封面 -> covers add
      |
      | 当前任务直接展示文案和图片
      v
用户自然语言修改 / 上传参考图
      |
      +---- 更新 content 或 coverSpec
      +---- 只重做指定比例
      +---- 生成不可变 vNNN 版本
      |
      v
用户明确确认平台
      |
      v
platforms open --confirmed -> Chrome
      |
      +---- 用户手动填写和发布
      |
      +---- 用户额外授权 Ego Lite 暂存
                 |
                 v
      platforms stage --confirmed
                 |
                 v
      并行检查/上传、串行填写、并行验收
                 |
                 v
             用户手动发布
```

Skill 第一次展示结果后必须暂停。它不能把“生成完成”推断成“允许打开平台”，也不能复用
历史平台选择作为当前确认。

## 4. 仓库结构

```text
video-publish-skill/
├── README.md
├── LICENSE
├── docs/
│   └── DEVELOPMENT.md
├── packages/
│   ├── core/
│   │   └── src/
│   └── runtime/
│       ├── src/
│       └── scripts/transcribe.py
├── scripts/
│   ├── build-skill.mjs
│   └── install-skill.mjs
└── skills/
    └── prepare-video-publish/
        ├── SKILL.md
        ├── agents/openai.yaml
        ├── references/
        └── scripts/
```

`packages/core` 保存 Zod 数据契约，`packages/runtime` 只提供确定性本地操作。构建脚本将
runtime 和转写脚本打包进最终 Skill。没有前端 workspace。

## 5. 技术选型

- Agent 工作流：Codex Agent Skill。
- 文本理解和多轮交互：当前 Codex 任务。
- 图片生成：Codex 内置 ImageGen。
- 数据校验：Zod。
- 开发与构建：Node.js 22.13+、TypeScript、tsup；最终 runtime bundle 仍以 Node.js 20 为目标。
- 字幕提取：FFmpeg/FFprobe。
- 无字幕视频转写：Python 3、faster-whisper。
- 平台启动：系统 Chrome/Chromium。
- 平台暂存：Ego Lite 持久任务空间 + 状态化发布调度器。

runtime 不依赖 Hono、React、React Router、Vite 或 app-server 协议。

## 6. 会话契约

每个输入创建一个本地会话：

```text
.video-publish/sessions/<uuid>/
├── session.json
├── transcript.txt
├── content.json
├── cover-spec.json
├── references/
└── covers/
    ├── v001/
    │   ├── landscape.png
    │   ├── horizontal.png
    │   ├── portrait.png
    │   └── vertical.png
    └── v002/
```

`session.json` v2 的核心结构：

```json
{
  "version": 2,
  "id": "uuid",
  "createdAt": "ISO time",
  "updatedAt": "ISO time",
  "source": {
    "kind": "video",
    "originalPath": "/absolute/input.mov",
    "videoPath": "/absolute/input.mov",
    "subtitlePath": null,
    "transcriptPath": "/absolute/session/transcript.txt"
  },
  "content": null,
  "coverSpec": null,
  "references": [],
  "coverVersions": [],
  "currentCoverVersion": null,
  "selectedPlatforms": [],
  "lastOpenedAt": null
}
```

旧 Web 审核会话在读取时迁移为 v2：完整的旧封面成为 `v001`，旧参考图和 Prompt 进入新
结构。执行 `session show` 会把迁移结果原子写回。

## 7. 内容契约

Codex 根据完整字幕生成：

```json
{
  "summary": "内容摘要",
  "title": "发布标题",
  "description": "发布简介",
  "cover": {
    "headline": "封面主标题",
    "subheadline": "封面副标题",
    "category": "主题分类",
    "keywords": ["关键词"],
    "tone": "professional",
    "emphasis": ["重点词"]
  }
}
```

所有事实必须来自字幕。封面视觉可以由 Prompt 设计，但不得把视频中未由字幕说明的场景、
人物、产品或动作当成事实。

## 8. 封面规格与版本

`coverSpec` 是当前生成意图：

- `instruction`：触发本版本的最新用户要求。
- `prompt`：完整视觉方向。
- `negativePrompt`：避免内容。
- `ratioPrompts`：四个比例的独立构图要求。
- `preserveIdentity`：人物一致性要求。
- `referenceAssetIds`：风格、构图和普通主体参考。
- `personAssetIds`：人物身份参考。

每个 `coverVersion` 保存：

- 单调递增版本号。
- 创建时间。
- 当时的完整 spec 快照。
- 本次真正变化的比例。
- 四张最终 PNG 路径；旧会话可以暂时缺少 `horizontal`。

新会话第一版应提供四张图。runtime 为兼容旧会话仍接受没有 `4:3 horizontal` 的旧版本；
这类会话必须补充 `horizontal`，或使用 `--skip-cover`，才能暂存 Bilibili 与微信视频号。
后续可以只更新部分比例，runtime 会把其余比例复制到新版本。旧版本永不覆盖，便于用户在
同一任务中比较或恢复。

图片必须由 Codex ImageGen 完成背景、主体、标题文字和最终排版。Agent 接受结果前检查：

- 标题、副标题拼写准确，无乱码。
- 缩略图下仍可读。
- 构图符合目标比例和安全区域。
- 没有额外文字、Logo 或水印。
- 使用人物参考时身份特征一致。

## 9. CLI

### 准备与内容

```bash
video-publish prepare --input /path/video-or-subtitle
video-publish finalize --session /path/session.json --content /path/content.json
video-publish session show --session /path/session.json
```

### 封面规格与参考图

```bash
video-publish spec show --session /path/session.json
video-publish spec set --session /path/session.json --file /path/cover-spec.json

video-publish references add \
  --session /path/session.json \
  --role reference \
  --image /path/reference.png

video-publish references list --session /path/session.json
```

### 封面版本

```bash
video-publish covers add \
  --session /path/session.json \
  --landscape /path/landscape.png \
  --horizontal /path/horizontal-4x3.png \
  --portrait /path/portrait.png \
  --vertical /path/vertical.png

video-publish covers add --session /path/session.json --vertical /path/new-vertical.png
video-publish covers current --session /path/session.json
```

### 视频与平台

```bash
video-publish video set --session /path/session.json --file /path/video.mp4
video-publish platforms list

video-publish platforms open \
  --session /path/session.json \
  --confirmed \
  --platform rednote \
  --platform bilibili

video-publish platforms stage \
  --session /path/session.json \
  --confirmed \
  --platform rednote \
  --platform douyin \
  --platform bilibili \
  --platform wechat_channels
```

`platforms open` 和 `platforms stage` 在以下条件全部满足前拒绝执行：

- 当前 Codex 任务中的用户已经明确确认。
- CLI 收到 `--confirmed`。
- 至少选择一个平台注册 ID。
- 会话已有视频、最终内容和完整封面版本。

Ego Lite 后端支持 `rednote`、`douyin`、`bilibili`、`wechat_channels`：每个平台使用一个持久
任务空间，只读检查和视频上传并行，元数据、话题/标签、声明和封面修改串行，最终页面验收
再次并行。运行状态、草稿身份、页面证据和封面回执保存在 session 的 `ego/` 目录中，最终
任务空间移交用户复核，但从不点击发布按钮。

封面映射为：小红书 `3:4`；抖音 `3:4` 和可用的 `4:3`；Bilibili `4:3`；微信视频号
`3:4 + 4:3`。`--skip-cover` 保留平台生成封面。

Bilibili 是唯一有自动旧草稿隔离流程的平台：先恢复“继续编辑”，同稿复用；若文件名或标题
表明是其他稿件，则先“存草稿”，回到干净上传页并重新验证后再上传当前视频。

`--confirm-original-rights` 只在用户本次明确确认权利后使用，并启用小红书、Bilibili、微信
视频号的已验证声明动作。上游当前抖音适配器没有声明 gate 或 mutation，不能因为 README
列出了该能力就误报已经设置。

## 10. Codex 交互规范

当前任务是唯一控制面。Skill 需要：

1. 自动完成首次字幕处理、文案和四封面生成。
2. 在当前消息中展示完整草稿与绝对路径图片。
3. 等待用户自然语言反馈。
4. 对局部修改只重做必要比例。
5. 每次修改后展示新的完整四比例版本。
6. 仅在明确确认后打开指定平台。
7. 仅在用户进一步明确要求自动填写时，执行四个受支持平台的 Ego Lite 暂存。

Skill 不应模拟 Web 表单。平台多选通过用户自然语言表达；参考图通过 Codex 输入附件提供；
版本和状态由本地 session 保证，不依赖聊天上下文永久保存。

## 11. 安全与隐私

- 所有媒体与 session 默认留在本机。
- runtime 只接受本地路径和固定平台 ID，不接受客户端任意 URL。
- 参考图先复制到当前 session，再用于 ImageGen。
- Prompt 和用户指令写入 JSON，不拼接到 shell 命令。
- 普通 Chrome 打开操作使用参数数组启动。
- Ego Lite 只复用其隔离任务空间中的登录态，不导出登录状态。
- `--confirmed` 是 CLI 的第二层人机确认保护。
- `platforms open` 打开页面后 Agent 立即停止。
- `platforms stage` 只能上传、填写和检查；页面级保护必须拦截最终发布按钮。
- session 写入使用文件锁、临时文件和原子重命名。

## 12. 构建与安装

```bash
pnpm install
pnpm fmt
pnpm check-types
pnpm lint
pnpm fmt:check
pnpm build
pnpm install:skill --force
```

`pnpm build` 只构建 core、runtime 和最终 Skill。安装后无需运行 Vite、后台进程或本地服务。

## 13. 验收标准

- 视频与 SRT、VTT、ASS、SSA、TXT 输入可生成 transcript。
- 文案通过 Zod 后才能写入 session。
- 当前 Codex 任务直接展示文案和四张封面。
- 参考图被复制、校验并按角色记录。
- 新会话初始封面要求四个比例，旧三比例会话可追加 `4:3`，后续支持局部比例版本。
- 旧版本不被覆盖。
- 未明确确认时不能打开平台。
- 未额外授权自动填写时只能打开平台。
- Ego Lite 暂存支持小红书、抖音、Bilibili、微信视频号，并按平台映射 `3:4 / 4:3` 封面。
- 小红书和抖音必须验证真实话题实体；Bilibili 必须验证精确标签集合和旧草稿身份。
- 暂存完成或超时后页面保持打开，最终发布必须人工执行。
- 源码和 Skill 包中不存在 Web reviewer、Hono、SSE 或 app-server 桥接。
- TypeScript、lint、格式、Skill 校验和生产构建全部通过。

## 14. 开源维护

- 架构总览见 [ARCHITECTURE.md](ARCHITECTURE.md)，重要安全与分发选择记录在
  [架构决策](decisions/README.md)。
- 贡献必须遵循根目录的 `CONTRIBUTING.md`、`SECURITY.md` 和 `CODE_OF_CONDUCT.md`。
- `pnpm check:opensource` 检查必需治理文件、个人绝对路径、私钥与常见凭据格式。
- GitHub CI 在每个 Pull Request 和 `main` push 上执行格式、lint、类型、构建、生成物一致性
  和生产依赖审计。
- 发布前按 [RELEASING.md](RELEASING.md) 检查版本、Changelog、上游归属和临时安装包。
- 私人 session、媒体、页面证据、浏览器状态和登录信息不得进入版本库或公开 Issue。
