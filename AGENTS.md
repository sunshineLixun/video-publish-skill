# Repository instructions

- Answer project discussions in the language used by the contributor; keep code comments in English.
- Preserve the explicit-confirmation boundary and never add automatic final publishing.
- Keep platform page inspection, mutation, and verification separate and restart-safe.
- Do not add credentials, media, sessions, browser profiles, or real account evidence.
- Treat `vendor/oil-video-publisher/` as a pinned upstream snapshot and preserve its MIT attribution.
- Run `pnpm build` after runtime or vendor changes so the installable Skill stays synchronized.
- Run `pnpm check:opensource`, `pnpm fmt:check`, `pnpm lint`, and `pnpm check-types` before handoff.
- Do not edit generated `skills/prepare-video-publish/scripts/video-publish.mjs` directly.
