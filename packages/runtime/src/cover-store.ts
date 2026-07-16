import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, rename, rm, stat } from "node:fs/promises";
import { join } from "node:path";

import {
  getCurrentCoverVersion,
  type CoverRatio,
  type CoverVersion,
  type PublishSession,
} from "@video-publish/core";

import { getSessionDirectory, mutateSession } from "./session-store";

const requiredRatios = ["landscape", "portrait", "vertical"] as const;
const ratios = ["landscape", "horizontal", "portrait", "vertical"] as const;
const maxCoverBytes = 25 * 1024 * 1024;

async function validatePng(path: string): Promise<void> {
  const file = await stat(path);
  if (!file.size || file.size > maxCoverBytes) {
    throw new Error(`${path} must be a PNG between 1 byte and 25 MB`);
  }
  const header = (await readFile(path)).subarray(0, 8);
  if (!header.equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    throw new Error(`${path} is not a PNG image`);
  }
}

function validateSpecReferences(session: PublishSession): void {
  const spec = session.coverSpec;
  if (!spec) throw new Error("Finalize content before adding cover versions");
  const references = new Map(session.references.map((asset) => [asset.id, asset]));
  if (
    spec.referenceAssetIds.some((id) => references.get(id)?.role !== "reference") ||
    spec.personAssetIds.some((id) => references.get(id)?.role !== "person")
  ) {
    throw new Error("The current cover spec contains invalid reference image ids");
  }
}

export async function addCoverVersion(
  sessionPath: string,
  changedFiles: Partial<Record<CoverRatio, string>>,
): Promise<CoverVersion> {
  const changedRatios = ratios.filter((ratio) => changedFiles[ratio]);
  if (!changedRatios.length) throw new Error("Provide at least one generated cover");
  for (const ratio of changedRatios) await validatePng(changedFiles[ratio]!);

  let targetDirectory: string | null = null;
  let result: CoverVersion | null = null;
  try {
    await mutateSession(sessionPath, async (session) => {
      if (!session.content) throw new Error("Finalize content before adding cover versions");
      validateSpecReferences(session);
      const current = getCurrentCoverVersion(session);
      if (!current && requiredRatios.some((ratio) => !changedFiles[ratio])) {
        throw new Error("The first cover version requires landscape, portrait, and vertical files");
      }

      const nextVersion = Math.max(0, ...session.coverVersions.map((item) => item.version)) + 1;
      const directoryName = `v${String(nextVersion).padStart(3, "0")}`;
      targetDirectory = join(getSessionDirectory(sessionPath), "covers", directoryName);
      const temporaryDirectory = `${targetDirectory}.tmp-${randomUUID()}`;
      await mkdir(temporaryDirectory, { recursive: true });

      const sourceFiles = Object.fromEntries(
        ratios.map((ratio) => [ratio, changedFiles[ratio] ?? current?.files[ratio]]),
      ) as Partial<Record<CoverRatio, string>>;
      const availableRatios = ratios.filter((ratio) => sourceFiles[ratio]);
      for (const ratio of availableRatios) {
        const source = sourceFiles[ratio];
        if (!source) continue;
        await validatePng(source);
        await copyFile(source, join(temporaryDirectory, `${ratio}.png`));
      }
      await rename(temporaryDirectory, targetDirectory);

      const files = {
        landscape: join(targetDirectory!, "landscape.png"),
        portrait: join(targetDirectory!, "portrait.png"),
        vertical: join(targetDirectory!, "vertical.png"),
        ...(sourceFiles.horizontal ? { horizontal: join(targetDirectory!, "horizontal.png") } : {}),
      };
      result = {
        version: nextVersion,
        createdAt: new Date().toISOString(),
        spec: session.coverSpec!,
        changedRatios,
        files,
      };
      session.coverVersions.push(result);
      session.currentCoverVersion = nextVersion;
      session.updatedAt = result.createdAt;
    });
  } catch (error) {
    if (targetDirectory) await rm(targetDirectory, { force: true, recursive: true });
    throw error;
  }
  return result!;
}
