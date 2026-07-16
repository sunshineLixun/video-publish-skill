import { access, chmod, cp, mkdir, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skillRoot = join(root, "skills", "prepare-video-publish");
const runtimeBuild = join(root, "packages", "runtime", "dist", "video-publish.js");
const transcribeScript = join(root, "packages", "runtime", "scripts", "transcribe.py");
const egoPublisherSource = join(root, "vendor", "oil-video-publisher", "video-publisher");
const egoPublisherLicense = join(root, "vendor", "oil-video-publisher", "LICENSE");
const runtimeTarget = join(skillRoot, "scripts", "video-publish.mjs");
const skillNodeModules = join(skillRoot, "scripts", "node_modules");
const egoPublisherTarget = join(skillRoot, "scripts", "ego-publisher");

await Promise.all([
  access(runtimeBuild),
  access(transcribeScript),
  access(egoPublisherSource),
  access(egoPublisherLicense),
]);
await rm(join(skillRoot, "assets"), { force: true, recursive: true });
await rm(skillNodeModules, { force: true, recursive: true });
await rm(egoPublisherTarget, { force: true, recursive: true });
await mkdir(join(skillRoot, "scripts"), { recursive: true });
await cp(runtimeBuild, runtimeTarget);
await cp(transcribeScript, join(skillRoot, "scripts", "transcribe.py"));
await cp(egoPublisherSource, egoPublisherTarget, { recursive: true });
await cp(egoPublisherLicense, join(egoPublisherTarget, "LICENSE.upstream"));
await chmod(runtimeTarget, 0o755);

process.stdout.write(`${skillRoot}\n`);
