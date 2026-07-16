# Architecture

Video Publish Skill separates probabilistic content work from deterministic local state and browser
orchestration.

```text
Codex conversation
  ├─ transcript understanding and copy generation
  ├─ ImageGen cover generation
  └─ explicit user authorization
          │
          v
Local CLI runtime
  ├─ Zod contracts and atomic session persistence
  ├─ FFmpeg / faster-whisper transcription
  ├─ immutable reference and cover versions
  └─ confirmed platform dispatch
          │
          ├─ Chrome/Chromium: open page only
          └─ Ego Lite: inspect → upload → mutate → verify → hand off
```

## Components

- `packages/core`: schemas for sessions, generated content, covers, references, and platforms.
- `packages/runtime`: CLI commands, local file persistence, transcription, browser opening, and Ego
  staging integration.
- `skills/prepare-video-publish`: the installable Agent Skill, references, and bundled runtime.
- `vendor/oil-video-publisher`: pinned MIT upstream code used by the Ego staging integration.

The build bundles core and runtime dependencies into one Node.js executable, copies the transcription
script, then overlays the pinned Ego engine into the installable Skill. The installed Skill does not
depend on this source checkout.

## Trust boundaries

- Inputs, transcripts, session JSON, references, and covers are local untrusted data validated at CLI
  boundaries.
- Codex is responsible for semantic interpretation and image generation, but it cannot infer platform
  authorization from prior turns.
- Chrome and Ego Lite are external executors. Login and platform risk controls remain user-owned.
- Creator portals are volatile third-party UIs. A successful mutation is insufficient without a final
  read-back verification.
- Final publishing is outside the automation boundary.

## State and recovery

Session files are written atomically. Cover versions are immutable. Ego staging uses independent
platform task spaces and job records, enabling reruns to inspect current page facts before deciding
whether to reuse, repair, or stop. This is why platform adapters are state machines instead of a fixed
sequence of clicks.

## Decisions

The rationale for the most consequential constraints is recorded under [decisions](decisions/README.md).
