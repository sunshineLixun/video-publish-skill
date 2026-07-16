# ADR-001: Keep final publishing outside automation

## Status

Accepted

## Date

2026-07-15

## Context

Creator portals contain account-specific declarations, moderation warnings, audience controls, and
legal attestations. Their interfaces change without notice. Uploading a draft is reversible; clicking
the final publish control can create an immediate public and contractual effect.

## Decision

Automation may prepare local assets, open creator pages, upload media, fill metadata, and verify draft
state. It must never activate the final publish control. Opening pages and staging forms each require
fresh explicit user authorization, and the CLI independently requires `--confirmed`.

## Alternatives considered

### Fully automatic publishing

Rejected because a stale selector, unexpected dialog, or inferred authorization could publish the
wrong asset or accept an unintended declaration.

### A configuration switch enabling final publishing

Rejected because persistent configuration would weaken the per-run consent boundary and make unsafe
behavior easy to trigger accidentally.

## Consequences

- Every supported platform adapter must include and verify a final-publish guard.
- Completion means “ready for user review,” not “published.”
- Automated CI and release flows cannot perform end-to-end live publishing.
- Users retain responsibility for the final platform preview, declarations, audience, and publish
  action.
