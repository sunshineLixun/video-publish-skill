import { spawn } from "node:child_process";
import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { getCurrentCoverVersion, type PublishSession } from "@video-publish/core";

export type EgoStagedPlatformId = "rednote" | "douyin" | "bilibili" | "wechat_channels";

type EgoBlocker = {
  code: string;
  message: string;
  retryable: boolean;
  requiresUser: boolean;
};

type EgoPlatformSummary = {
  status: string;
  taskSpaceId: number | null;
  ready: boolean;
  missing: string[];
  blocker: EgoBlocker | null;
  evidencePath: string | null;
};

type EgoPublisherSummary = {
  schemaVersion: number;
  jobId: string;
  status: string;
  ready: boolean;
  statePath: string;
  platforms: Record<string, EgoPlatformSummary>;
};

export type EgoStageResult = EgoPlatformSummary & {
  platform: EgoStagedPlatformId;
  videoPath: string;
  coverPath: string | null;
  coverPaths: {
    portrait3x4: string | null;
    horizontal4x3: string | null;
  };
};

export type EgoPublishingStageRun = {
  engineRoot: string;
  jobId: string;
  statePath: string;
  results: EgoStageResult[];
  logs: string[];
};

type StagePublishingWithEgoOptions = {
  sessionPath: string;
  session: PublishSession;
  platforms: EgoStagedPlatformId[];
  confirmOriginalRights: boolean;
  uploadCover: boolean;
  emit: (message: string) => void;
};

const platformNames: Record<EgoStagedPlatformId, string> = {
  rednote: "xiaohongshu",
  douyin: "douyin",
  bilibili: "bilibili",
  wechat_channels: "wechat_channels",
};
const portraitCoverPlatforms = new Set<EgoStagedPlatformId>([
  "rednote",
  "douyin",
  "wechat_channels",
]);
const horizontalCoverPlatforms = new Set<EgoStagedPlatformId>([
  "douyin",
  "bilibili",
  "wechat_channels",
]);

function fitTitle(title: string, fallback: string, maxLength: number): string {
  const source = Array.from(title).length <= maxLength ? title : fallback;
  return Array.from(source).slice(0, maxLength).join("");
}

function topicHashtags(topics: string[]): string {
  return topics.map((topic) => `#${topic.replace(/^#+/, "").replace(/\s+/g, "")}`).join(" ");
}

async function writeJsonAtomic(filePath: string, value: unknown): Promise<void> {
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporaryPath, filePath);
}

async function resolveEngineRoot(): Promise<string> {
  const moduleDirectory = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    process.env.VIDEO_PUBLISH_EGO_ENGINE,
    join(moduleDirectory, "ego-publisher"),
    join(moduleDirectory, "../../../vendor/oil-video-publisher/video-publisher"),
    join(homedir(), ".codex", "skills", "video-publisher"),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    const root = resolve(candidate);
    try {
      await access(join(root, "scripts", "v2", "publisher.mjs"));
      return root;
    } catch {}
  }

  throw new Error(
    "Ego publisher engine is missing. Rebuild the skill or set VIDEO_PUBLISH_EGO_ENGINE.",
  );
}

function runProcess(
  command: string,
  args: string[],
  options: { env?: NodeJS.ProcessEnv; onStderrLine?: (line: string) => void } = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolveProcess, reject) => {
    const child = spawn(command, args, {
      env: options.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let stderrRemainder = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;
      stderrRemainder += text;
      const lines = stderrRemainder.split("\n");
      stderrRemainder = lines.pop() ?? "";
      for (const line of lines) {
        if (line.trim()) options.onStderrLine?.(line.trim());
      }
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (stderrRemainder.trim()) options.onStderrLine?.(stderrRemainder.trim());
      resolveProcess({ code: code ?? 1, stdout, stderr });
    });
  });
}

async function handOffTaskSpaces(summary: EgoPublisherSummary): Promise<void> {
  const state = JSON.parse(await readFile(summary.statePath, "utf8")) as {
    platforms: Record<string, { taskSpaceId?: number }>;
  };
  await Promise.all(
    Object.entries(state.platforms)
      .filter(
        ([platform]) =>
          summary.platforms[platform]?.ready === true ||
          summary.platforms[platform]?.blocker?.requiresUser === true,
      )
      .map(([, platform]) => platform.taskSpaceId)
      .filter((id): id is number => Number.isInteger(id))
      .map((id) =>
        runProcess("ego-browser", ["taskspace", "handoff", String(id)]).catch(() => null),
      ),
  );
}

export async function stagePublishingWithEgo(
  options: StagePublishingWithEgoOptions,
): Promise<EgoPublishingStageRun> {
  const currentCover = getCurrentCoverVersion(options.session);
  const videoPath = options.session.source.videoPath;
  const content = options.session.content;
  if (!currentCover || !videoPath || !content) {
    throw new Error("The publishing session is incomplete");
  }

  const engineRoot = await resolveEngineRoot();
  const sessionDirectory = dirname(options.sessionPath);
  const egoDirectory = join(sessionDirectory, "ego");
  const stateRoot = join(egoDirectory, "jobs");
  const configPath = join(egoDirectory, "config.json");
  const packagePath = join(egoDirectory, "package.json");
  const selectedPlatformNames = options.platforms.map((platform) => platformNames[platform]);
  const topics = content.cover.keywords.slice(0, 5);
  const packageTitle = fitTitle(content.title, content.cover.headline, 80);
  const portraitCoverPath = currentCover.files.portrait;
  const horizontalCoverPath = currentCover.files.horizontal ?? null;

  if (
    options.uploadCover &&
    options.platforms.some(
      (platform) => platform === "bilibili" || platform === "wechat_channels",
    ) &&
    !horizontalCoverPath
  ) {
    throw new Error(
      "Bilibili and WeChat Channels custom covers require a 4:3 cover. Add it with covers add --horizontal, or stage with --skip-cover.",
    );
  }

  const requiredFiles = [videoPath];
  if (options.uploadCover) {
    if (options.platforms.some((platform) => portraitCoverPlatforms.has(platform))) {
      requiredFiles.push(portraitCoverPath);
    }
    if (
      horizontalCoverPath &&
      options.platforms.some((platform) => horizontalCoverPlatforms.has(platform))
    ) {
      requiredFiles.push(horizontalCoverPath);
    }
  }
  await Promise.all([
    ...requiredFiles.map((filePath) => access(filePath)),
    mkdir(stateRoot, { recursive: true }),
  ]);

  await writeJsonAtomic(configPath, {
    schemaVersion: 2,
    onboarding: {
      completed: true,
      completedAt: options.session.createdAt,
      updatedAt: new Date().toISOString(),
    },
    locale: "zh-CN",
    sourceDirectory: dirname(videoPath),
    availablePlatforms: selectedPlatformNames,
    defaultPlatforms: selectedPlatformNames,
    contentProfile: {
      copyStyle: "clear, conversational, specific, non-hype",
      recurringTags: [],
    },
    declarations: { originalityPolicy: "ask_each_run" },
    platforms: {
      douyin: { defaultTopics: [] },
      bilibili: { allowedAutoTags: [] },
    },
    execution: {
      checkConcurrency: options.platforms.length,
      uploadConcurrency: options.platforms.length,
    },
    cover: { uploadExistingByDefault: options.uploadCover },
  });
  await writeJsonAtomic(packagePath, {
    videoPath,
    title: packageTitle,
    xhsTitle: fitTitle(content.title, content.cover.headline, 20),
    douyinTitle: fitTitle(content.title, content.cover.headline, 30),
    bilibiliTitle: packageTitle,
    wechatTitle: packageTitle,
    description: content.description,
    douyinDescription: content.description,
    bilibiliDescription: content.description,
    wechatDescription: `${packageTitle}\n\n${topicHashtags(topics)}`,
    xhsTopics: topics,
    douyinTopics: topics,
    bilibiliTags: topics,
    bilibiliAllowedAutoTags: [],
    wechatTags: topics,
    originalDeclaration: options.confirmOriginalRights,
    cover: {
      uploadCustomCover: options.uploadCover,
      vertical3x4Path: portraitCoverPath,
      horizontal4x3Path: horizontalCoverPath ?? "",
    },
  });

  const logs: string[] = [];
  const publisherPath = join(engineRoot, "scripts", "v2", "publisher.mjs");
  const args = [
    publisherPath,
    packagePath,
    options.session.id,
    ...selectedPlatformNames,
    "--state-root",
    stateRoot,
    "--check-concurrency",
    String(options.platforms.length),
    "--upload-concurrency",
    String(options.platforms.length),
  ];
  if (options.confirmOriginalRights) args.push("--confirm-original-rights");

  const execution = await runProcess(process.execPath, args, {
    env: { ...process.env, VIDEO_PUBLISHER_CONFIG: configPath },
    onStderrLine: (line) => {
      logs.push(line);
      options.emit(line);
    },
  });
  let summary: EgoPublisherSummary;
  try {
    summary = JSON.parse(execution.stdout.trim()) as EgoPublisherSummary;
  } catch {
    const detail = execution.stderr.trim().slice(-2000);
    throw new Error(`Ego publisher failed before returning state: ${detail || "unknown error"}`);
  }
  if (![0, 10].includes(execution.code)) {
    throw new Error(
      `Ego publisher exited with code ${execution.code}: ${execution.stderr.trim().slice(-2000)}`,
    );
  }

  await handOffTaskSpaces(summary);
  const results = options.platforms.map((platform): EgoStageResult => {
    const result = summary.platforms[platformNames[platform]];
    if (!result) throw new Error(`Ego publisher omitted platform result: ${platform}`);
    const portrait3x4 =
      options.uploadCover && portraitCoverPlatforms.has(platform) ? portraitCoverPath : null;
    const horizontal4x3 =
      options.uploadCover && horizontalCoverPlatforms.has(platform) ? horizontalCoverPath : null;
    return {
      platform,
      ...result,
      videoPath,
      coverPath: platform === "bilibili" ? horizontal4x3 : portrait3x4,
      coverPaths: {
        portrait3x4,
        horizontal4x3,
      },
    };
  });
  return {
    engineRoot,
    jobId: summary.jobId,
    statePath: summary.statePath,
    logs,
    results,
  };
}
