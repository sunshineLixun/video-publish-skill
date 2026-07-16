---
name: prepare-video-publish
description: Prepare multi-platform publishing materials inside the current Codex task from a local video or subtitle file. Use when the user wants Codex to transcribe or read subtitles, summarize the content, draft a title and description, generate or revise complete covers with built-in ImageGen in 16:9, 4:3, 3:4, and 9:16, use style or person reference images, open confirmed publishing pages, or explicitly stage uploads and copy with Ego Lite for 小红书、抖音、Bilibili、微信视频号.
---

# Prepare Video Publish

Complete the entire workflow in the current Codex task. Never start a review website, local HTTP
server, background Agent, app-server, or separate Codex task.

## Initial Workflow

1. Resolve the attached video and/or subtitle to absolute local paths.
2. Run `scripts/video-publish.mjs prepare` and retain the returned `sessionPath` in this task.
3. Read the complete transcript.
4. Read [content-contract.md](references/content-contract.md), write `content.json` beside the
   session, and run `finalize` until validation passes.
5. Add any user-supplied style or person images with `references add`.
6. Read [cover-workflow.md](references/cover-workflow.md), update the cover spec when references or
   user instructions require it, and generate four complete covers with Codex built-in ImageGen.
7. Register the generated files with `covers add`.
8. Present the publishing draft and all four local cover images directly in this task, then stop
   and wait for user feedback or explicit publishing confirmation.

Do not open publishing pages during the initial workflow.

## Prepare Input

Replace `$SKILL_DIR` with the absolute directory containing this `SKILL.md`.

Video or subtitle:

```bash
node "$SKILL_DIR/scripts/video-publish.mjs" prepare --input "/path/input"
```

Video with a preferred subtitle:

```bash
node "$SKILL_DIR/scripts/video-publish.mjs" prepare \
  --input "/path/video.mp4" \
  --subtitle "/path/subtitle.srt"
```

Subtitle with a separately supplied video:

```bash
node "$SKILL_DIR/scripts/video-publish.mjs" prepare \
  --input "/path/subtitle.srt" \
  --video "/path/video.mp4"
```

The command returns `sessionPath` and `transcriptPath` as JSON.

## Finalize Content

Ground every factual claim in the complete transcript. Never infer visual details from video frames.

```bash
node "$SKILL_DIR/scripts/video-publish.mjs" finalize \
  --session "/path/session.json" \
  --content "/path/content.json"
```

## Conversation Checkpoint

After registering covers, respond in the current task with:

- Summary, publishing title, description, and exact cover copy.
- The current cover version and changed ratios.
- Four labeled local images using absolute Markdown image paths.
- The available platform names, clearly distinguishing the four Ego staging platforms.
- A concise request for either focused revisions or explicit confirmation with platform names.

Do not replace this checkpoint with a URL or ask the user to find another task.

## Continue In This Task

For every later user message, continue from the same `sessionPath`:

- Title, description, or summary change: update `content.json` and rerun `finalize`.
- Cover copy change: update `content.json`, rerun `finalize`, update the cover spec, and regenerate
  the affected covers.
- Prompt or visual change: update the cover spec and run `spec set`.
- New reference image: run `references add`, then include its returned ID in the cover spec.
- Focused ratio change: regenerate only the named ratios and pass only those files to `covers add`;
  unchanged ratios inherit from the previous immutable version.
- General cover change: regenerate all four ratios.

Show the new version in this task after every cover revision.

## Open Confirmed Platforms

Only proceed when the user explicitly confirms in the current task and names at least one platform.
Do not treat an earlier platform preference or ambiguous approval as confirmation.

If the session has only subtitles, ask the user for the video and attach it first:

```bash
node "$SKILL_DIR/scripts/video-publish.mjs" video set \
  --session "/path/session.json" \
  --file "/path/video.mp4"
```

Then open only the confirmed platforms:

```bash
node "$SKILL_DIR/scripts/video-publish.mjs" platforms open \
  --session "/path/session.json" \
  --confirmed \
  --platform rednote \
  --platform bilibili
```

Platform IDs are `rednote`, `bilibili`, `douyin`, and `wechat_channels`. The
runtime rejects opening without `--confirmed`, finalized content, a complete cover version, and a
video.

After Chrome opens, stop. Do not fill forms, upload files, read cookies, inject scripts, click
publish, or operate any publishing page.

## Stage Confirmed Platforms With Ego Lite

Use this mode only when the user explicitly asks in the current task to automatically upload or
fill publishing pages and names at least one supported platform. An earlier request to merely open
pages is not authorization. Ego staging supports 小红书 (`rednote`)、抖音 (`douyin`)、Bilibili
(`bilibili`) and 微信视频号 (`wechat_channels`). Ego Lite is the only staging runtime.

```bash
node "$SKILL_DIR/scripts/video-publish.mjs" platforms stage \
  --session "/path/session.json" \
  --confirmed \
  --platform rednote \
  --platform douyin \
  --platform bilibili \
  --platform wechat_channels
```

The command uses one persistent Ego task space per platform. It inspects in parallel, uploads
selected platforms in parallel, serializes metadata and cover changes, verifies the live page in
parallel, and hands the task spaces to the user for review. If a result reports `AUTH_REQUIRED`,
tell the user to complete login in the handed-off Ego space. Resume the same command only after the
user explicitly says to continue. Never ask for passwords, cookies, QR codes, or exported browser
state.

Staging performs only these authorized actions:

- Upload the session video.
- Upload the current `3:4` cover to 小红书; upload `3:4` and, when available, `4:3` to 抖音; upload
  `4:3` to Bilibili; upload both `3:4` and `4:3` to 微信视频号. Use `--skip-cover` to keep all
  platform-generated covers. Bilibili and 微信视频号 require the session's native `4:3` asset when
  custom-cover upload is enabled.
- Fill platform-native fields: 小红书 title, prose, and real topic entities; 抖音 title, body, and
  real topic entities; Bilibili title, description, and exact tag chips; 微信视频号 title-led
  description with plain hashtags and an empty short-title field.
- Reuse only matching drafts. Bilibili alone may quarantine a foreign local draft by saving it and
  returning to a verified clean upload page.
- Wait for platform processing to finish, verify the final control without clicking it, persist
  evidence, and leave the task spaces open for review.

Do not add `--confirm-original-rights` unless the user truthfully confirms the current video may be
declared original. It enables the verified 小红书、Bilibili and 微信视频号 declaration flows.
Omitting it still stages the draft and leaves declarations unchanged. The vendored upstream
Douyin adapter currently has no verified original-declaration gate or action; do not claim that it
set one and do not guess selectors from the upstream README wording.

After the result reports `review-required`, summarize each platform result and any title adjustment
or timeout. Stop without clicking publish. Do not solve CAPTCHAs, bypass risk controls, inspect
cookies, export authentication state, or use another browser tool to complete the final action.

## Runtime Capabilities

Do not require every optional tool before starting. Check capabilities only when the selected path
needs them:

- Node.js 20 or newer for the bundled CLI.
- `ffmpeg` and `ffprobe` only for video input.
- Python 3 and `faster-whisper` only when a video has no usable subtitle track.
- Ego Lite and the `ego-browser` command only for staging.
- Google Chrome or Chromium only for opening confirmed publishing pages without staging.

The Skill installer does not silently install system software. On failure, read
[runtime.md](references/runtime.md), report the exact missing capability, and get user approval before
making system-level changes.
