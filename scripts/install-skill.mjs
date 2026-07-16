import { cp, mkdir, rm, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";

const { values } = parseArgs({
  options: {
    destination: { type: "string" },
    force: { type: "boolean", default: false },
  },
});

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "skills", "prepare-video-publish");

function targetDirectories() {
  if (values.destination) return [resolve(values.destination)];
  const codexHome = process.env.CODEX_HOME ?? join(homedir(), ".codex");
  return [join(codexHome, "skills", "prepare-video-publish")];
}

for (const destination of targetDirectories()) {
  const exists = await stat(destination).then(
    () => true,
    () => false,
  );
  if (exists && !values.force) {
    throw new Error(`${destination} already exists; pass --force to replace it`);
  }
  if (exists) await rm(destination, { recursive: true, force: true });
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true });
  process.stdout.write(`${destination}\n`);
}
