# Content Contract

Write one JSON object with this exact shape:

```json
{
  "summary": "A faithful summary of the complete transcript.",
  "title": "A concise shared publishing title.",
  "description": "A self-contained publishing description.",
  "cover": {
    "headline": "Short cover headline",
    "subheadline": "One supporting line",
    "category": "Topic category",
    "keywords": ["keyword one", "keyword two"],
    "tone": "professional",
    "emphasis": ["key phrase"]
  }
}
```

## Rules

- Base every factual statement on the transcript.
- Use the transcript language unless the user requests another language.
- Keep `title` within 100 characters.
- Keep `cover.headline` within 48 characters and make it readable without the description.
- Keep `cover.subheadline` within 80 characters.
- Use one to five `keywords`.
- Use no more than three `emphasis` phrases.
- Do not mention visual details, speakers' appearance, locations, or on-screen actions unless the transcript explicitly states them.
- Do not add hashtags unless the user asks for them.
- Produce valid JSON without Markdown fences.
