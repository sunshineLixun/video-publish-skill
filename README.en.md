# Video Publish Skill

[中文](README.md) · [Development](docs/DEVELOPMENT.md) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md)

A local-first Codex skill that prepares video publishing assets. It creates platform copy and four
AI cover ratios from a video or transcript, then—with explicit user authorization—can stage the
video, cover, and metadata in creator portals. The user always reviews and clicks the final publish
button.

> [!IMPORTANT]
> This is not an unattended publisher. It does not bypass authentication, CAPTCHA, or platform risk
> controls, and it never clicks the final publish control.

## Features

- Extract or transcribe `MP4`, `MOV`, `MKV`, `WebM`, and subtitle inputs.
- Generate a summary, title, description, and cover copy from the complete transcript.
- Create independent `16:9`, `4:3`, `3:4`, and `9:16` covers with Codex ImageGen.
- Preserve immutable cover versions and support reference images and partial ratio revisions.
- Open confirmed creator pages in Chrome or Chromium.
- Optionally stage forms for Xiaohongshu, Douyin, Bilibili, and WeChat Channels through Ego Lite.
- Persist local session state for interruption recovery and page-fact verification.

## Requirements

- Node.js 20+, pnpm 11, and a Codex installation with Agent Skills and ImageGen.
- FFmpeg and FFprobe.
- Python 3 plus `faster-whisper` when the input has no usable subtitles.
- Google Chrome or Chromium for opening creator pages.
- Optional: Ego Lite and the `ego-browser` command for automated staging.

## Install

```bash
git clone https://github.com/sunshineLixun/video-publish-skill.git
cd video-publish-skill
corepack enable
pnpm install --frozen-lockfile
pnpm build
pnpm install:skill
```

The default destination is `$CODEX_HOME/skills/prepare-video-publish`, or
`~/.codex/skills/prepare-video-publish` when `CODEX_HOME` is unset. Pass `--force` through the pnpm
script when replacing an existing installation:

```bash
pnpm install:skill --force
```

## Use

Attach a video or subtitle file in Codex and invoke:

```text
$prepare-video-publish
```

Opening creator pages requires explicit confirmation in the current conversation and the CLI
`--confirmed` flag. Automated staging requires a separate user authorization. A request to open a
page is not authorization to fill it.

## Privacy and safety

- Sessions are stored under `.video-publish/` in the working directory and ignored by Git.
- Media, transcripts, references, and generated covers stay local unless the user explicitly sends
  an image to Codex ImageGen or stages content in a selected platform.
- Ego Lite retains authentication in its isolated task spaces; this project does not export cookies.
- Never attach unredacted sessions, screenshots, QR codes, account details, or unpublished media to
  public issues.
- Final publishing always remains manual.

## Development

```bash
pnpm install --frozen-lockfile
pnpm audit:dependencies
pnpm fmt:check
pnpm lint
pnpm check-types
pnpm check:opensource
pnpm build
```

See [CONTRIBUTING.md](CONTRIBUTING.md), [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md), and the
[architecture decisions](docs/decisions/README.md) for the project structure and contribution
rules.

## Third-party software

This repository vendors MIT-licensed code from
[`oil-oil/video-publisher-skill`](https://github.com/oil-oil/video-publisher-skill) at a pinned
commit. See [UPSTREAM.md](vendor/oil-video-publisher/UPSTREAM.md) and
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## License

Licensed under the [Apache License 2.0](LICENSE). Vendored software remains subject to its original
license.
