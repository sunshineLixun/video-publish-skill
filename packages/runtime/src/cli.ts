import { randomUUID } from "node:crypto";
import { access, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

import {
  createDefaultCoverSpec,
  getCurrentCoverVersion,
  platformIdSchema,
  platformMap,
  platforms,
  referenceAssetRoleSchema,
  type CoverRatio,
  type PublishSession,
} from "@video-publish/core";

import { openChrome } from "./chrome";
import { addCoverVersion } from "./cover-store";
import { stagePublishingWithEgo, type EgoStagedPlatformId } from "./ego-publisher";
import { addReferenceAsset } from "./reference-store";
import {
  mutateSession,
  readCoverSpec,
  readGeneratedContent,
  readSession,
  writeSession,
} from "./session-store";
import { prepareTranscript } from "./subtitle";

const videoExtensions = new Set([".mp4", ".mov", ".mkv", ".webm"]);
const egoStagedPlatformIds = new Set<EgoStagedPlatformId>([
  "rednote",
  "douyin",
  "bilibili",
  "wechat_channels",
]);

function requireOption(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing required option: --${name}`);
  return resolve(value);
}

async function prepareCommand(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      input: { type: "string", short: "i" },
      language: { type: "string", default: "auto" },
      model: { type: "string", default: "small" },
      output: { type: "string", short: "o" },
      subtitle: { type: "string" },
      video: { type: "string" },
    },
  });
  const inputPath = requireOption(values.input, "input");
  await access(inputPath);
  const subtitlePath = values.subtitle ? resolve(values.subtitle) : null;
  const videoPath = values.video ? resolve(values.video) : null;
  if (subtitlePath) await access(subtitlePath);
  if (videoPath) await access(videoPath);

  const sessionId = randomUUID();
  const outputRoot = resolve(values.output ?? join(process.cwd(), ".video-publish", "sessions"));
  const sessionDirectory = join(outputRoot, sessionId);
  const sessionPath = join(sessionDirectory, "session.json");
  await mkdir(sessionDirectory, { recursive: true });
  const transcript = await prepareTranscript(subtitlePath ?? inputPath, sessionDirectory, {
    language: values.language,
    model: values.model,
  });
  const resolvedVideoPath = videoPath ?? transcript.videoPath ?? (subtitlePath ? inputPath : null);
  const now = new Date().toISOString();
  const session: PublishSession = {
    version: 2,
    id: sessionId,
    createdAt: now,
    updatedAt: now,
    source: {
      kind: resolvedVideoPath ? "video" : "subtitle",
      originalPath: inputPath,
      videoPath: resolvedVideoPath,
      subtitlePath: subtitlePath ?? transcript.subtitlePath,
      transcriptPath: transcript.transcriptPath,
    },
    content: null,
    coverSpec: null,
    references: [],
    coverVersions: [],
    currentCoverVersion: null,
    selectedPlatforms: [],
    lastOpenedAt: null,
  };
  await writeSession(sessionPath, session);
  process.stdout.write(
    `${JSON.stringify({ sessionPath, transcriptPath: transcript.transcriptPath })}\n`,
  );
}

async function finalizeCommand(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      content: { type: "string", short: "c" },
      session: { type: "string", short: "s" },
    },
  });
  const sessionPath = requireOption(values.session, "session");
  const content = await readGeneratedContent(requireOption(values.content, "content"));
  const session = await mutateSession(sessionPath, (current) => {
    current.content = content;
    current.coverSpec ??= createDefaultCoverSpec(content);
    current.updatedAt = new Date().toISOString();
  });
  process.stdout.write(
    `${JSON.stringify({ sessionPath, status: "content-ready", title: content.title, coverSpec: session.coverSpec })}\n`,
  );
}

function validateSpecReferences(session: PublishSession): void {
  if (!session.coverSpec) throw new Error("The session has no cover spec");
  const references = new Map(session.references.map((asset) => [asset.id, asset]));
  if (
    session.coverSpec.referenceAssetIds.some((id) => references.get(id)?.role !== "reference") ||
    session.coverSpec.personAssetIds.some((id) => references.get(id)?.role !== "person")
  ) {
    throw new Error("The cover spec contains invalid reference image ids");
  }
}

async function specCommand(args: string[]): Promise<void> {
  const [action, ...options] = args;
  const { values } = parseArgs({
    args: options,
    options: {
      file: { type: "string", short: "f" },
      session: { type: "string", short: "s" },
    },
  });
  const sessionPath = requireOption(values.session, "session");
  if (action === "show") {
    const session = await readSession(sessionPath);
    process.stdout.write(
      `${JSON.stringify({ sessionPath, coverSpec: session.coverSpec }, null, 2)}\n`,
    );
    return;
  }
  if (action === "set") {
    const spec = await readCoverSpec(requireOption(values.file, "file"));
    const session = await mutateSession(sessionPath, (current) => {
      current.coverSpec = spec;
      validateSpecReferences(current);
      current.updatedAt = new Date().toISOString();
    });
    process.stdout.write(`${JSON.stringify({ sessionPath, coverSpec: session.coverSpec })}\n`);
    return;
  }
  throw new Error("Spec action must be show or set");
}

async function referencesCommand(args: string[]): Promise<void> {
  const [action, ...options] = args;
  const { values } = parseArgs({
    args: options,
    options: {
      image: { type: "string", short: "i" },
      role: { type: "string", short: "r" },
      session: { type: "string", short: "s" },
    },
  });
  const sessionPath = requireOption(values.session, "session");
  if (action === "list") {
    const session = await readSession(sessionPath);
    process.stdout.write(
      `${JSON.stringify({ sessionPath, references: session.references }, null, 2)}\n`,
    );
    return;
  }
  if (action === "add") {
    const role = referenceAssetRoleSchema.parse(values.role);
    const imagePath = requireOption(values.image, "image");
    await access(imagePath);
    const asset = await addReferenceAsset(sessionPath, imagePath, role);
    process.stdout.write(`${JSON.stringify({ sessionPath, asset })}\n`);
    return;
  }
  throw new Error("References action must be add or list");
}

async function coversCommand(args: string[]): Promise<void> {
  const [action, ...options] = args;
  const { values } = parseArgs({
    args: options,
    options: {
      horizontal: { type: "string" },
      landscape: { type: "string" },
      portrait: { type: "string" },
      session: { type: "string", short: "s" },
      vertical: { type: "string" },
    },
  });
  const sessionPath = requireOption(values.session, "session");
  if (action === "current") {
    const session = await readSession(sessionPath);
    process.stdout.write(
      `${JSON.stringify({ sessionPath, current: getCurrentCoverVersion(session) }, null, 2)}\n`,
    );
    return;
  }
  if (action === "add") {
    const changedFiles = Object.fromEntries(
      (["landscape", "horizontal", "portrait", "vertical"] as const)
        .filter((ratio) => values[ratio])
        .map((ratio) => [ratio, resolve(values[ratio]!)]),
    ) as Partial<Record<CoverRatio, string>>;
    const version = await addCoverVersion(sessionPath, changedFiles);
    process.stdout.write(`${JSON.stringify({ sessionPath, status: "covers-ready", version })}\n`);
    return;
  }
  throw new Error("Covers action must be add or current");
}

async function videoCommand(args: string[]): Promise<void> {
  const [action, ...options] = args;
  if (action !== "set") throw new Error("Video action must be set");
  const { values } = parseArgs({
    args: options,
    options: {
      file: { type: "string", short: "f" },
      session: { type: "string", short: "s" },
    },
  });
  const sessionPath = requireOption(values.session, "session");
  const videoPath = requireOption(values.file, "file");
  await access(videoPath);
  const extension = videoPath.slice(videoPath.lastIndexOf(".")).toLowerCase();
  if (!videoExtensions.has(extension)) throw new Error("Video must be MP4, MOV, MKV, or WebM");
  const session = await mutateSession(sessionPath, (current) => {
    current.source.videoPath = videoPath;
    current.source.kind = "video";
    current.updatedAt = new Date().toISOString();
  });
  process.stdout.write(`${JSON.stringify({ sessionPath, videoPath: session.source.videoPath })}\n`);
}

async function platformsCommand(args: string[]): Promise<void> {
  const [action, ...options] = args;
  if (action === "list") {
    process.stdout.write(`${JSON.stringify({ platforms }, null, 2)}\n`);
    return;
  }
  if (action !== "open" && action !== "stage") {
    throw new Error("Platforms action must be list, open, or stage");
  }
  const { values } = parseArgs({
    args: options,
    options: {
      confirmed: { type: "boolean", default: false },
      "confirm-original-rights": { type: "boolean", default: false },
      platform: { type: "string", multiple: true, short: "p" },
      session: { type: "string", short: "s" },
      "skip-cover": { type: "boolean", default: false },
    },
  });
  if (!values.confirmed) {
    throw new Error(
      `Refusing to ${action} platforms without explicit user confirmation (--confirmed)`,
    );
  }
  const selected = [...new Set((values.platform ?? []).map((id) => platformIdSchema.parse(id)))];
  if (!selected.length) throw new Error("Select at least one platform with --platform");
  const sessionPath = requireOption(values.session, "session");
  const session = await readSession(sessionPath);
  if (!session.source.videoPath) throw new Error("Attach a video before opening publishing pages");
  if (!session.content) throw new Error("Finalize publishing content first");
  if (!getCurrentCoverVersion(session))
    throw new Error("Generate covers before opening publishing pages");
  await access(session.source.videoPath);

  if (action === "stage") {
    const unsupported = selected.filter(
      (id) => !egoStagedPlatformIds.has(id as EgoStagedPlatformId),
    );
    if (unsupported.length) {
      throw new Error(`Ego staging does not support: ${unsupported.join(", ")}`);
    }
    const openedAt = new Date().toISOString();
    await mutateSession(sessionPath, (current) => {
      current.selectedPlatforms = selected;
      current.lastOpenedAt = openedAt;
      current.updatedAt = openedAt;
    });
    const run = await stagePublishingWithEgo({
      sessionPath,
      session,
      platforms: selected as EgoStagedPlatformId[],
      confirmOriginalRights: values["confirm-original-rights"],
      uploadCover: !values["skip-cover"],
      emit: (message) =>
        process.stdout.write(`${JSON.stringify({ event: "ego-progress", message })}\n`),
    });
    process.stdout.write(
      `${JSON.stringify({
        sessionPath,
        status: "review-required",
        jobId: run.jobId,
        statePath: run.statePath,
        results: run.results,
        message: "Ego task spaces are open for review. Final publish remains manual.",
      })}\n`,
    );
    return;
  }

  const urls = selected.map((id) => platformMap.get(id)!.publishUrl);
  await openChrome(urls);
  const openedAt = new Date().toISOString();
  await mutateSession(sessionPath, (current) => {
    current.selectedPlatforms = selected;
    current.lastOpenedAt = openedAt;
    current.updatedAt = openedAt;
  });
  process.stdout.write(`${JSON.stringify({ sessionPath, opened: selected, openedAt })}\n`);
}

async function sessionCommand(args: string[]): Promise<void> {
  const [action, ...options] = args;
  if (action !== "show") throw new Error("Session action must be show");
  const { values } = parseArgs({
    args: options,
    options: { session: { type: "string", short: "s" } },
  });
  const sessionPath = requireOption(values.session, "session");
  const session = await readSession(sessionPath);
  await writeSession(sessionPath, session);
  process.stdout.write(`${JSON.stringify({ sessionPath, session }, null, 2)}\n`);
}

function printHelp(): void {
  process.stdout.write(
    `video-publish <command>\n\nCommands:\n  prepare       Extract or transcribe subtitles\n  finalize      Validate Codex-generated publishing content\n  session       Show durable local session state\n  spec          Show or update the current cover generation spec\n  references    Add or list reference images\n  covers        Add an immutable cover version or show the current version\n  video         Attach a video to a subtitle-only session\n  platforms     List, open, or stage confirmed publishing pages\n`,
  );
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  if (command === "prepare") return prepareCommand(args);
  if (command === "finalize") return finalizeCommand(args);
  if (command === "session") return sessionCommand(args);
  if (command === "spec") return specCommand(args);
  if (command === "references") return referencesCommand(args);
  if (command === "covers") return coversCommand(args);
  if (command === "video") return videoCommand(args);
  if (command === "platforms") return platformsCommand(args);
  printHelp();
}

main().catch((error: unknown) => {
  process.stderr.write(`${JSON.stringify({ error: (error as Error).message })}\n`);
  process.exitCode = 1;
});
