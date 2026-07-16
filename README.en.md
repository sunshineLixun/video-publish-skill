# Video Publish Skill

[中文](README.md) · [Development](docs/DEVELOPMENT.md) · [CLI](docs/CLI.md) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md)

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

## One-command install

macOS / Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/sunshineLixun/video-publish-skill/main/install.sh | sh
```

Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/sunshineLixun/video-publish-skill/main/install.ps1 | iex
```

The installer downloads only the prebuilt Skill and installs it under
`$CODEX_HOME/skills/prepare-video-publish`, or `~/.codex/skills/prepare-video-publish` when
`CODEX_HOME` is unset. It validates the new package before replacing an existing installation. Run
the same command again to upgrade. Git, pnpm, and a source checkout are not required.

Set `VIDEO_PUBLISH_REF` before running the command to install a specific Git ref.

## User requirements

- A Codex installation with Agent Skills and ImageGen.
- Node.js 20+ available to the Codex environment.
- FFmpeg and FFprobe.
- Python 3 plus `faster-whisper` when the input has no usable subtitles.
- Google Chrome or Chromium for opening creator pages.
- Optional: Ego Lite and the `ego-browser` command for automated staging.

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
rules. Cloning the repository, Node.js 22.13+, and pnpm 11 are development requirements only.

## Third-party software

This repository vendors MIT-licensed code from
[`oil-oil/video-publisher-skill`](https://github.com/oil-oil/video-publisher-skill) at a pinned
commit. See [UPSTREAM.md](vendor/oil-video-publisher/UPSTREAM.md) and
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## License

Licensed under the [Apache License 2.0](LICENSE). Vendored software remains subject to its original
license.
