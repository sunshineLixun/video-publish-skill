# ADR-002: Vendor the pinned Ego staging engine

## Status

Accepted

## Date

2026-07-15

## Context

The staging integration depends on a stateful browser orchestration engine from
`oil-oil/video-publisher-skill`. The installable Agent Skill must work without a separate source clone,
and local safety patches must be reviewable with the exact upstream revision.

## Decision

Keep a pinned MIT-licensed upstream snapshot under `vendor/oil-video-publisher/`. Record its full commit
SHA and local adaptations, preserve the upstream license, and copy the engine into the installable Skill
during `pnpm build`.

## Alternatives considered

### Fetch upstream during installation

Rejected because it makes builds non-reproducible, introduces a network-time supply-chain boundary,
and can silently change safety behavior.

### Depend on an unversioned global installation

Rejected because contributors and users could execute different adapter implementations while
believing they are running the same release.

### Fork without preserving upstream provenance

Rejected because it obscures license obligations and makes security review and future updates harder.

## Consequences

- Repository size is larger, but releases are self-contained and reproducible.
- Every upstream refresh requires an explicit provenance and license review.
- Generated bundled files must be rebuilt and committed with vendor changes.
