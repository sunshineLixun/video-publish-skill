# Runtime Recovery

## ffmpeg or ffprobe missing

Ask the user to install FFmpeg with their system package manager, then rerun `prepare`.

## faster-whisper missing

Install into the active Python environment:

```bash
python3 -m pip install faster-whisper
```

Then rerun `prepare`. The first transcription can download the selected open model weights.

## Chrome missing

Install Google Chrome or Chromium. The runtime checks Google Chrome on macOS and Windows, then common Chrome and Chromium command names on Linux.

## Ego Lite staging failed

Confirm that Ego Lite is installed and `ego-browser --version` succeeds. Staging keeps one
persistent task space per platform. If a result reports `AUTH_REQUIRED`, finish
login in the handed-off task space and rerun only after the user explicitly says to continue.

Ego staging supports `rednote`, `douyin`, `bilibili`, and `wechat_channels`. A custom-cover run for
Bilibili or WeChat Channels requires a native `4:3` file in the current cover version. Add one with
`covers add --horizontal`, or rerun with `--skip-cover` to retain platform-generated covers.

If the bundled Ego publisher engine is missing, rebuild and reinstall the Skill.

## Session validation failed

Run `session show --session "/path/session.json"`. Older Web-review sessions are migrated to the
current conversation-first schema when they are read and written by the new runtime.
