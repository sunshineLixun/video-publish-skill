import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const ignoredDirectories = new Set([
  ".git",
  ".video-publish",
  ".video-publisher",
  ".venv",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "output",
  "venv",
]);
const requiredFiles = [
  "AGENTS.md",
  "CHANGELOG.md",
  "CODE_OF_CONDUCT.md",
  "CONTRIBUTING.md",
  "LICENSE",
  "NOTICE",
  "README.en.md",
  "README.md",
  "SECURITY.md",
  "SUPPORT.md",
  "THIRD_PARTY_NOTICES.md",
  ".github/workflows/ci.yml",
  ".github/dependabot.yml",
  ".github/ISSUE_TEMPLATE/bug_report.yml",
  ".github/ISSUE_TEMPLATE/feature_request.yml",
  ".github/PULL_REQUEST_TEMPLATE.md",
  "docs/ARCHITECTURE.md",
  "docs/CLI.md",
  "docs/RELEASING.md",
  "docs/decisions/001-manual-final-publish.md",
  "docs/decisions/002-vendored-ego-engine.md",
  "skills/prepare-video-publish/SKILL.md",
  "skills/prepare-video-publish/scripts/video-publish.mjs",
  "skills/prepare-video-publish/scripts/ego-publisher/LICENSE.upstream",
  "vendor/oil-video-publisher/LICENSE",
  "vendor/oil-video-publisher/UPSTREAM.md",
];
const forbiddenFileExtensions = new Set([".key", ".mobileprovision", ".p12", ".pem"]);
const secretPatterns = [
  { name: "private key", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: "GitHub token", pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/ },
  { name: "OpenAI-style secret", pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { name: "AWS access key", pattern: /\bAKIA[A-Z0-9]{16}\b/ },
  { name: "macOS user path", pattern: /\/Users\/[^/\s]+\// },
  { name: "Windows user path", pattern: /[A-Za-z]:\\Users\\[^\\\s]+\\/ },
];
const textExtensions = new Set([
  "",
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsonc",
  ".log",
  ".md",
  ".mjs",
  ".py",
  ".sh",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

async function collectFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(path)));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

const failures = [];
for (const file of requiredFiles) {
  const path = join(root, file);
  const exists = await stat(path).then(
    () => true,
    () => false,
  );
  if (!exists) failures.push(`Missing required file: ${file}`);
}

for (const path of await collectFiles(root)) {
  const file = relative(root, path);
  const extension = extname(file).toLowerCase();
  if (forbiddenFileExtensions.has(extension)) {
    failures.push(`Potential credential file: ${file}`);
    continue;
  }
  if (!textExtensions.has(extension)) continue;
  const content = await readFile(path, "utf8");
  for (const { name, pattern } of secretPatterns) {
    if (pattern.test(content)) failures.push(`${name} pattern found in ${file}`);
  }
  if (extension === ".md") {
    for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1];
      if (!target || /^(?:#|\/|https?:|mailto:)/.test(target)) continue;
      const localTarget = decodeURIComponent(target.split("#", 1)[0]);
      const exists = await stat(resolve(dirname(path), localTarget)).then(
        () => true,
        () => false,
      );
      if (!exists) failures.push(`Broken local Markdown link in ${file}: ${target}`);
    }
  }
}

if (failures.length) {
  process.stderr.write(`${failures.map((failure) => `- ${failure}`).join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("Open-source boundary check passed.\n");
}
