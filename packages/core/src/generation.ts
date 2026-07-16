import { z } from "zod";

import { coverRatioSchema } from "./cover";
import type { GeneratedContent } from "./session";

export const referenceAssetRoleSchema = z.enum(["reference", "person"]);

const ratioPromptsSchema = z.object({
  landscape: z.string().trim().max(2000),
  horizontal: z
    .string()
    .trim()
    .max(2000)
    .default("4:3 横向平台封面构图，准确排版指定标题并保留裁剪安全区域。"),
  portrait: z.string().trim().max(2000),
  vertical: z.string().trim().max(2000),
});

export const coverGenerationSpecSchema = z
  .object({
    instruction: z.string().trim().min(1).max(2000),
    prompt: z.string().trim().min(1).max(8000),
    negativePrompt: z.string().trim().max(4000),
    ratioPrompts: ratioPromptsSchema,
    preserveIdentity: z.boolean(),
    referenceAssetIds: z.array(z.string().uuid()).max(8),
    personAssetIds: z.array(z.string().uuid()).max(4),
  })
  .superRefine((value, context) => {
    for (const key of ["referenceAssetIds", "personAssetIds"] as const) {
      if (new Set(value[key]).size !== value[key].length) {
        context.addIssue({ code: "custom", message: `${key} must be unique`, path: [key] });
      }
    }
    if (value.referenceAssetIds.some((id) => value.personAssetIds.includes(id))) {
      context.addIssue({
        code: "custom",
        message: "An image cannot be both a general and person reference",
        path: ["personAssetIds"],
      });
    }
  });

export const referenceAssetSchema = z.object({
  id: z.string().uuid(),
  role: referenceAssetRoleSchema,
  name: z.string().trim().min(1).max(255),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  size: z
    .number()
    .int()
    .positive()
    .max(20 * 1024 * 1024),
  path: z.string().min(1),
  createdAt: z.string().datetime(),
});

export const coverFilesSchema = z.object({
  landscape: z.string().min(1),
  horizontal: z.string().min(1).optional(),
  portrait: z.string().min(1),
  vertical: z.string().min(1),
});

export const coverVersionSchema = z.object({
  version: z.number().int().positive(),
  createdAt: z.string().datetime(),
  spec: coverGenerationSpecSchema,
  changedRatios: z.array(coverRatioSchema).min(1).max(4),
  files: coverFilesSchema,
});

export type CoverGenerationSpec = z.infer<typeof coverGenerationSpecSchema>;
export type CoverVersion = z.infer<typeof coverVersionSchema>;
export type ReferenceAsset = z.infer<typeof referenceAssetSchema>;
export type ReferenceAssetRole = z.infer<typeof referenceAssetRoleSchema>;

export function createDefaultCoverSpec(content: GeneratedContent): CoverGenerationSpec {
  const subject = `${content.cover.category}。核心主题：${content.cover.headline}。补充信息：${content.cover.subheadline}。关键词：${content.cover.keywords.join("、")}。`;
  return {
    instruction: "根据字幕语义生成第一版四比例完整封面。",
    prompt: `用途：多平台视频完整封面。${subject}生成可直接发布的高质量完整封面，准确呈现指定封面文案并完成视觉排版。`,
    negativePrompt:
      "不要添加指定封面文案以外的文字、错误文字、乱码、水印、品牌标志、界面截图、低清晰度或杂乱背景。",
    ratioPrompts: {
      landscape: "横向完整封面构图，准确排版指定标题，保证缩略图下仍清晰可读。",
      horizontal: "4:3 横向平台封面构图，准确排版指定标题并保留裁剪安全区域。",
      portrait: "竖向海报式完整封面，主体和指定文案层次清晰。",
      vertical: "短视频竖屏完整封面，准确排版指定文案并保留平台安全区域。",
    },
    preserveIdentity: true,
    referenceAssetIds: [],
    personAssetIds: [],
  };
}
