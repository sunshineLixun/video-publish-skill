## Summary

Describe the user-visible change and why it is needed.

## Safety impact

Explain effects on confirmation, login state, draft identity, declarations, cover handling, and the
final-publish guard. Write “None” when not applicable.

## Verification

- [ ] `pnpm check:opensource`
- [ ] `pnpm audit:dependencies`
- [ ] `pnpm fmt:check`
- [ ] `pnpm lint`
- [ ] `pnpm check-types`
- [ ] `pnpm build`
- [ ] Generated Skill files are included when source or vendor files changed
- [ ] No credentials, local paths, private media, sessions, or browser state are included
- [ ] User-visible changes are documented in `CHANGELOG.md`

## Third-party changes

List upstream revision and license changes, or write “None.”
