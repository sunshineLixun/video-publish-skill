# oil-oil/video-publisher-skill

This directory contains a vendored copy of the browser orchestration engine from
https://github.com/oil-oil/video-publisher-skill at commit
`0c398e758892fb45f87139cf22e593468e23f887`.

The upstream code is licensed under the MIT License. The local integration keeps the upstream
final-publish guard and stateful Ego Lite scheduler, while adapting these product requirements:

- original declarations are opt-in for a publishing session;
- the local cover model can supply Douyin with only a `3:4` asset for legacy sessions, or both
  `3:4` and `4:3` assets for new sessions;
- Xiaohongshu can include the session prose before its exact real topic entities and supports the
  current cover dialog shape.

See `LICENSE` in this directory for the upstream license text.
