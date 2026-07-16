# Releasing

This repository distributes source plus a prebuilt installable Skill. It is intentionally marked
`private` in `package.json` to prevent accidental npm publication.

## Release checklist

1. Update `CHANGELOG.md` and remove resolved entries from `Unreleased`.
2. Update the root and workspace package versions together.
3. If vendored code changed, update the pinned SHA and third-party notices.
4. Install exactly from the lockfile: `pnpm install --frozen-lockfile`.
5. Run `pnpm audit:dependencies`, `pnpm check:opensource`, `pnpm fmt:check`, `pnpm lint`, and
   `pnpm check-types`.
6. Run `pnpm build` and review changes under `skills/prepare-video-publish/scripts/`.
7. Install to a temporary directory with
   `pnpm install:skill --destination /tmp/prepare-video-publish-release`.
8. Verify the temporary package contains `SKILL.md`, references, licenses, the CLI bundle, the
   transcription script, and the Ego engine—but no sessions, credentials, logs, or `node_modules`.
9. Run both public one-command installers against the release ref in disposable Codex homes.
10. Confirm GitHub private vulnerability reporting and `main` branch protection are enabled.
11. Create a signed tag named `v<version>` and a GitHub release from that tag.

Do not run a live staging flow as part of an automated release. Creator-page verification uses a
maintainer-controlled account and must stop before final publishing.
