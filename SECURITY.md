# Security policy

## Supported versions

Security fixes are provided for the latest commit on `main` and the latest published release. Older
releases may receive a fix only when the issue can be addressed safely without a broader backport.

## Reporting a vulnerability

Use GitHub's **Security → Report a vulnerability** private reporting flow for this repository. Do not
open a public issue for vulnerabilities, credential exposure, account takeover, publish-guard bypass,
or a way to trigger final publishing without explicit user action.

Include only the minimum information needed to reproduce the problem:

- affected commit or release;
- operating system and runtime versions;
- affected command or platform adapter;
- redacted reproduction steps and impact;
- whether final publishing, login state, or private media may be exposed.

Never send real cookies, tokens, QR codes, passwords, unpublished videos, or unredacted session
directories. Maintainers will acknowledge a complete report as capacity allows, coordinate a fix and
disclosure window, and credit the reporter when requested and appropriate.

## Security boundaries

The project intentionally requires explicit conversation authorization plus `--confirmed` before
opening or staging creator pages. Automated staging may upload and edit a draft, but the final publish
control must remain blocked. Authentication challenges, CAPTCHA, QR login, and platform risk controls
must be handed back to the user rather than bypassed.

The repository does not operate a hosted service and does not collect telemetry. Local data and
third-party integrations remain subject to the user's machine security and the relevant platform
terms.
