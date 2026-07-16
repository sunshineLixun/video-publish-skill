import { z } from "zod";

import {
  coverGenerationSpecSchema,
  coverVersionSchema,
  createDefaultCoverSpec,
  referenceAssetSchema,
  type CoverGenerationSpec,
  type CoverVersion,
} from "./generation";
import { platformIdSchema } from "./platforms";

export const coverContentSchema = z.object({
  headline: z.string().trim().min(1).max(48),
  subheadline: z.string().trim().min(1).max(80),
  category: z.string().trim().min(1).max(24),
  keywords: z.array(z.string().trim().min(1).max(20)).min(1).max(5),
  tone: z.string().trim().min(1).max(24),
  emphasis: z.array(z.string().trim().min(1).max(20)).max(3),
});

export const generatedContentSchema = z.object({
  summary: z.string().trim().min(1).max(2000),
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(5000),
  cover: coverContentSchema,
});

export const sourceSchema = z.object({
  kind: z.enum(["video", "subtitle"]),
  originalPath: z.string().min(1),
  videoPath: z.string().min(1).nullable(),
  subtitlePath: z.string().min(1).nullable(),
  transcriptPath: z.string().min(1),
});

const sessionDataSchema = z
  .object({
    version: z.literal(2),
    id: z.string().uuid(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    source: sourceSchema,
    content: generatedContentSchema.nullable(),
    coverSpec: coverGenerationSpecSchema.nullable(),
    references: z.array(referenceAssetSchema).max(12),
    coverVersions: z.array(coverVersionSchema),
    currentCoverVersion: z.number().int().positive().nullable(),
    selectedPlatforms: z.array(platformIdSchema).max(6),
    lastOpenedAt: z.string().datetime().nullable(),
  })
  .superRefine((value, context) => {
    if (
      value.currentCoverVersion !== null &&
      !value.coverVersions.some((item) => item.version === value.currentCoverVersion)
    ) {
      context.addIssue({
        code: "custom",
        message: "currentCoverVersion does not exist",
        path: ["currentCoverVersion"],
      });
    }
    if (new Set(value.selectedPlatforms).size !== value.selectedPlatforms.length) {
      context.addIssue({
        code: "custom",
        message: "selectedPlatforms must be unique",
        path: ["selectedPlatforms"],
      });
    }
  });

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function migrateLegacyPrompt(prompt: string, fallback: string): string {
  if (!prompt.trim()) return fallback;
  return prompt
    .replace("用途：多平台视频封面背景。", "用途：多平台视频完整封面。")
    .replace(
      "生成具有明确视觉主体和充足文字留白的高质量背景图，不在图片中生成文字。",
      "生成可直接发布的高质量完整封面，准确呈现指定封面文案并完成视觉排版。",
    );
}

function migrateCoverSpec(
  content: GeneratedContent | null,
  generation: Record<string, unknown>,
): CoverGenerationSpec | null {
  if (!content) return null;
  const fallback = createDefaultCoverSpec(content);
  const draft = asRecord(generation.draft);
  const ratioPrompts = asRecord(draft.ratioPrompts);
  const prompt = typeof draft.prompt === "string" ? draft.prompt : "";
  const negativePrompt =
    typeof draft.negativePrompt === "string" ? draft.negativePrompt : fallback.negativePrompt;
  return coverGenerationSpecSchema.parse({
    instruction: "从旧版本地审核会话迁移。",
    prompt: migrateLegacyPrompt(prompt, fallback.prompt),
    negativePrompt:
      negativePrompt === "不要文字、字母、数字、水印、标志、界面截图、低清晰度或杂乱背景。"
        ? fallback.negativePrompt
        : negativePrompt,
    ratioPrompts: {
      landscape:
        typeof ratioPrompts.landscape === "string" &&
        ratioPrompts.landscape !== "横向构图，为标题区域保留稳定留白。"
          ? ratioPrompts.landscape
          : fallback.ratioPrompts.landscape,
      portrait:
        typeof ratioPrompts.portrait === "string" &&
        ratioPrompts.portrait !== "竖向海报构图，主体与标题区域层次清晰。"
          ? ratioPrompts.portrait
          : fallback.ratioPrompts.portrait,
      vertical:
        typeof ratioPrompts.vertical === "string" &&
        ratioPrompts.vertical !== "短视频竖屏构图，上下区域都保留安全空间。"
          ? ratioPrompts.vertical
          : fallback.ratioPrompts.vertical,
    },
    preserveIdentity:
      typeof draft.preserveIdentity === "boolean"
        ? draft.preserveIdentity
        : fallback.preserveIdentity,
    referenceAssetIds: Array.isArray(draft.referenceAssetIds)
      ? draft.referenceAssetIds.filter((id): id is string => typeof id === "string")
      : [],
    personAssetIds: Array.isArray(draft.personAssetIds)
      ? draft.personAssetIds.filter((id): id is string => typeof id === "string")
      : [],
  });
}

function migrateSession(value: unknown): unknown {
  const record = asRecord(value);
  if (record.version === 2) return value;

  const contentResult = generatedContentSchema.safeParse(record.content);
  const content = contentResult.success ? contentResult.data : null;
  const generation = asRecord(record.generation);
  const referenceResult = z.array(referenceAssetSchema).safeParse(generation.assets);
  const references = referenceResult.success ? referenceResult.data : [];
  const coverSpec = migrateCoverSpec(content, generation);
  const covers = asRecord(record.covers);
  const hasCompleteCover = ["landscape", "portrait", "vertical"].every(
    (ratio) => typeof covers[ratio] === "string" && covers[ratio].length > 0,
  );
  const coverVersions: CoverVersion[] =
    hasCompleteCover && coverSpec
      ? [
          {
            version: 1,
            createdAt:
              typeof record.createdAt === "string" ? record.createdAt : new Date().toISOString(),
            spec: coverSpec,
            changedRatios: ["landscape", "portrait", "vertical"],
            files: {
              landscape: covers.landscape as string,
              portrait: covers.portrait as string,
              vertical: covers.vertical as string,
            },
          },
        ]
      : [];
  const selectedPlatformsResult = z.array(platformIdSchema).safeParse(record.selectedPlatforms);
  const createdAt =
    typeof record.createdAt === "string" ? record.createdAt : new Date().toISOString();

  return {
    version: 2,
    id: record.id,
    createdAt,
    updatedAt: createdAt,
    source: record.source,
    content,
    coverSpec,
    references,
    coverVersions,
    currentCoverVersion: coverVersions.length ? 1 : null,
    selectedPlatforms: selectedPlatformsResult.success ? selectedPlatformsResult.data : [],
    lastOpenedAt: null,
  };
}

export const sessionSchema = z.preprocess(migrateSession, sessionDataSchema);

export type CoverContent = z.infer<typeof coverContentSchema>;
export type GeneratedContent = z.infer<typeof generatedContentSchema>;
export type PublishSession = z.infer<typeof sessionSchema>;

export function getCurrentCoverVersion(session: PublishSession): CoverVersion | null {
  return session.coverVersions.find((item) => item.version === session.currentCoverVersion) ?? null;
}
