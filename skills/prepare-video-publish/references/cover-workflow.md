# Cover Workflow

Use this workflow for initial covers and every later revision in the current Codex task.

## Cover Spec

`finalize` creates a default spec in `session.json`. Inspect it with:

```bash
node "<runtime>" spec show --session "/path/session.json"
```

When the user changes visual direction or adds references, write a complete JSON spec and apply it:

```json
{
  "instruction": "The latest user request that defines this version.",
  "prompt": "Complete final-cover art direction.",
  "negativePrompt": "Avoid constraints.",
  "ratioPrompts": {
    "landscape": "16:9-specific composition.",
    "horizontal": "4:3-specific composition.",
    "portrait": "3:4-specific composition.",
    "vertical": "9:16-specific composition."
  },
  "preserveIdentity": true,
  "referenceAssetIds": [],
  "personAssetIds": []
}
```

```bash
node "<runtime>" spec set \
  --session "/path/session.json" \
  --file "/path/cover-spec.json"
```

## Add References

Inspect every supplied image before using it. Persist it in the session:

```bash
node "<runtime>" references add \
  --session "/path/session.json" \
  --role reference \
  --image "/path/style.png"
```

Use `--role person` for identity references. Put returned IDs into the matching spec arrays. Treat
general references as style, composition, lighting, or subject guidance. When `preserveIdentity` is
true, explicitly require consistent facial and identity features for person references.

## Generate Final Covers

Use Codex built-in ImageGen in this task. Do not call an external image API, browser canvas, React
template, SVG renderer, HTML renderer, or source-video frame.

For every changed ratio, make one distinct generation call and combine:

1. Current `content.cover` values from the session.
2. `coverSpec.prompt` and the matching ratio prompt.
3. `coverSpec.negativePrompt` as explicit avoid constraints.
4. Every selected reference path and its role.
5. `cover.headline` and `cover.subheadline` as exact text that must appear verbatim.
6. Category and keywords only when useful, with exact spelling.
7. A prohibition on other text, misspellings, garbled characters, logos, and watermarks.
8. A requirement for a complete publish-ready composition with final typography and safe areas.

Use `referenced_image_paths` when all references have local paths. Never provide both local paths
and recent-conversation image inputs to the same generation call.

Inspect every result for exact copy, legibility, ratio, safe areas, and identity consistency.
Regenerate only failed ratios. Copy accepted PNG files into session-bound working paths rather than
leaving them only in Codex's default generated-images directory.

## Register A Version

New sessions should register all four files. The runtime still accepts a legacy first version
without `horizontal`, but Bilibili and 微信视频号 custom-cover staging then requires adding `4:3`
later or using `--skip-cover`:

```bash
node "<runtime>" covers add \
  --session "/path/session.json" \
  --landscape "/path/landscape.png" \
  --horizontal "/path/horizontal-4x3.png" \
  --portrait "/path/portrait.png" \
  --vertical "/path/vertical.png"
```

Later versions may change only selected ratios:

```bash
node "<runtime>" covers add \
  --session "/path/session.json" \
  --vertical "/path/new-vertical.png"
```

The runtime creates `covers/vNNN`, copies changed files, inherits unchanged ratios, and records the
spec snapshot. Never overwrite an earlier version.

## Present In Codex

Show each current file using its absolute local path:

```markdown
### 16:9

![16:9 cover](/absolute/session/covers/v002/landscape.png)
```

Present all four ratios even when only one changed, and identify the new version number.
