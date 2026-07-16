import { mkdir, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import {
  coverGenerationSpecSchema,
  generatedContentSchema,
  sessionSchema,
  type CoverGenerationSpec,
  type GeneratedContent,
  type PublishSession,
} from "@video-publish/core";

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}

export async function readSession(sessionPath: string): Promise<PublishSession> {
  return sessionSchema.parse(await readJson(sessionPath));
}

export async function writeSession(sessionPath: string, session: PublishSession): Promise<void> {
  const parsed = sessionSchema.parse(session);
  const temporaryPath = `${sessionPath}.tmp`;
  await mkdir(dirname(sessionPath), { recursive: true });
  await writeFile(temporaryPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  await rename(temporaryPath, sessionPath);
}

export async function mutateSession(
  sessionPath: string,
  mutate: (session: PublishSession) => Promise<void> | void,
): Promise<PublishSession> {
  const lockPath = `${sessionPath}.lock`;
  let lock: Awaited<ReturnType<typeof open>> | null = null;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      lock = await open(lockPath, "wx");
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  if (!lock) throw new Error("Timed out waiting for the local session lock");

  try {
    const session = await readSession(sessionPath);
    await mutate(session);
    await writeSession(sessionPath, session);
    return session;
  } finally {
    await lock.close();
    await rm(lockPath, { force: true });
  }
}

export async function readGeneratedContent(contentPath: string): Promise<GeneratedContent> {
  return generatedContentSchema.parse(await readJson(contentPath));
}

export async function readCoverSpec(specPath: string): Promise<CoverGenerationSpec> {
  return coverGenerationSpecSchema.parse(await readJson(specPath));
}

export function getSessionDirectory(sessionPath: string): string {
  return dirname(sessionPath);
}
