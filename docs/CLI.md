# Video Publish CLI

CLI 是 Skill 的确定性本地运行层，负责字幕处理、数据校验、session、封面版本和经过确认的
平台操作。它不负责创作文案或生成图片，也不会点击最终发布按钮。

## 运行方式

开发时直接运行 TypeScript：

```bash
pnpm dev platforms list
```

构建后运行 bundle：

```bash
node packages/runtime/dist/video-publish.js platforms list
```

安装 Skill 后运行：

```bash
node "$CODEX_HOME/skills/prepare-video-publish/scripts/video-publish.mjs" platforms list
```

未设置 `CODEX_HOME` 时，默认安装路径是
`~/.codex/skills/prepare-video-publish/scripts/video-publish.mjs`。下文用 `video-publish` 代指以上
任一调用方式。

命令成功时向 stdout 输出 JSON；Ego Lite 暂存期间会输出逐行 JSON 进度事件。失败时向
stderr 输出 `{ "error": "..." }` 并返回非零退出码。

## 准备转写

```bash
video-publish prepare \
  --input /path/video-or-subtitle \
  [--subtitle /path/subtitle.srt] \
  [--video /path/video.mp4] \
  [--language auto] \
  [--model small] \
  [--output /path/session-root]
```

- 视频输入支持 `MP4`、`MOV`、`MKV`、`WebM`。
- 字幕输入支持 SRT、VTT、ASS、SSA 和 TXT。
- 优先提取已有字幕；没有可用字幕时调用 `faster-whisper`。
- 默认在当前目录的 `.video-publish/sessions/` 创建新 session。

输出包含 `sessionPath` 和 `transcriptPath`。

## 写入发布文案

Codex 根据完整字幕生成符合内容契约的 JSON 后，使用：

```bash
video-publish finalize \
  --session /path/session.json \
  --content /path/content.json
```

内容必须通过 Zod 校验后才会写入 session。契约见
[content-contract.md](../skills/prepare-video-publish/references/content-contract.md)。

## 查看 session

```bash
video-publish session show --session /path/session.json
```

该命令读取、校验并重新原子写入当前 session，然后输出完整状态。

## 封面规格

```bash
video-publish spec show --session /path/session.json

video-publish spec set \
  --session /path/session.json \
  --file /path/cover-spec.json
```

规格中的参考图 ID 必须与当前 session 中对应角色的资产一致。

## 参考图

```bash
video-publish references add \
  --session /path/session.json \
  --role reference \
  --image /path/reference.png

video-publish references add \
  --session /path/session.json \
  --role person \
  --image /path/person.png

video-publish references list --session /path/session.json
```

图片会被复制进 session。`reference` 用于风格、构图或普通主体，`person` 用于人物身份一致性。

## 封面版本

第一版封面通常一次写入四个比例：

```bash
video-publish covers add \
  --session /path/session.json \
  --landscape /path/landscape-16x9.png \
  --horizontal /path/horizontal-4x3.png \
  --portrait /path/portrait-3x4.png \
  --vertical /path/vertical-9x16.png
```

后续可以只替换部分比例：

```bash
video-publish covers add \
  --session /path/session.json \
  --vertical /path/new-vertical-9x16.png
```

未变化的比例会复制到新版本，旧版本不会覆盖。查看当前版本：

```bash
video-publish covers current --session /path/session.json
```

## 给字幕 session 绑定视频

```bash
video-publish video set \
  --session /path/session.json \
  --file /path/video.mp4
```

## 平台列表

```bash
video-publish platforms list
```

平台注册 ID：

- `rednote`
- `bilibili`
- `douyin`
- `wechat_channels`

## 打开创作页

```bash
video-publish platforms open \
  --session /path/session.json \
  --confirmed \
  --platform rednote \
  --platform bilibili
```

该命令只在 Chrome/Chromium 打开所选页面，不自动填写。必须同时满足：

- 用户在当前对话明确确认平台；
- CLI 收到 `--confirmed`；
- session 已有视频、最终文案和当前封面版本。

## 自动暂存

```bash
video-publish platforms stage \
  --session /path/session.json \
  --confirmed \
  --platform rednote \
  --platform douyin \
  --platform bilibili \
  --platform wechat_channels \
  [--skip-cover] \
  [--confirm-original-rights]
```

只有 `rednote`、`douyin`、`bilibili` 和 `wechat_channels` 支持 Ego Lite 暂存。

- `--skip-cover`：保留平台自动生成的封面。
- `--confirm-original-rights`：仅在用户本次明确确认权利后使用；当前只启用小红书、
  Bilibili 和微信视频号的已验证声明动作。
- 抖音适配器当前没有可验证的原创声明动作，因此不会虚报已设置。

暂存流程为并行检查、并行上传、串行页面修改和并行最终验收。成功状态是
`review-required`：Ego Lite 任务空间保持可供用户复核，最终发布仍由用户手动完成。

## 恢复与排错

FFmpeg、转写、Chrome、Ego Lite 和 session 错误见
[runtime.md](../skills/prepare-video-publish/references/runtime.md)。平台页面发生变化时，不要通过
增加盲目点击规避失败；应先更新 inspect 状态识别，再调整 mutation 和 verify。
