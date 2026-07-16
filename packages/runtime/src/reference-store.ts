import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, rm, stat } from "node:fs/promises";
import { basename, extname, join } from "node:path";

import type { ReferenceAsset, ReferenceAssetRole } from "@video-publish/core";

import { getSessionDirectory, mutateSession } from "./session-store";

const maxReferenceBytes = 20 * 1024 * 1024;
const imageTypes = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
} as const;

function validateHeader(image: Buffer, mimeType: ReferenceAsset["mimeType"]): void {
  const valid =
    (mimeType === "image/png" &&
      image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
    (mimeType === "image/jpeg" && image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff) ||
    (mimeType === "image/webp" &&
      image.subarray(0, 4).toString("ascii") === "RIFF" &&
      image.subarray(8, 12).toString("ascii") === "WEBP");
  if (!valid) throw new Error("The reference file does not match its image extension");
}

export async function addReferenceAsset(
  sessionPath: string,
  imagePath: string,
  role: ReferenceAssetRole,
): Promise<ReferenceAsset> {
  const extension = extname(imagePath).toLowerCase() as keyof typeof imageTypes;
  const mimeType = imageTypes[extension];
  if (!mimeType) throw new Error("Reference images must be JPEG, PNG, or WebP");
  const file = await stat(imagePath);
  if (!file.size || file.size > maxReferenceBytes) {
    throw new Error("Reference images must be between 1 byte and 20 MB");
  }
  validateHeader(await readFile(imagePath), mimeType);

  const id = randomUUID();
  const normalizedExtension = mimeType === "image/jpeg" ? ".jpg" : extension;
  const targetDirectory = join(getSessionDirectory(sessionPath), "references");
  const targetPath = join(targetDirectory, `${id}${normalizedExtension}`);
  const asset: ReferenceAsset = {
    id,
    role,
    name: basename(imagePath).slice(0, 255),
    mimeType,
    size: file.size,
    path: targetPath,
    createdAt: new Date().toISOString(),
  };
  await mkdir(targetDirectory, { recursive: true });
  await copyFile(imagePath, targetPath);
  try {
    await mutateSession(sessionPath, (session) => {
      if (session.references.length >= 12)
        throw new Error("A session supports 12 references at most");
      session.references.push(asset);
      session.updatedAt = asset.createdAt;
    });
  } catch (error) {
    await rm(targetPath, { force: true });
    throw error;
  }
  return asset;
}
