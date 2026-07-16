import { z } from "zod";

export const coverRatioSchema = z.enum(["landscape", "horizontal", "portrait", "vertical"]);

export type CoverRatio = z.infer<typeof coverRatioSchema>;

export const coverRatioInfo = {
  landscape: { label: "16:9" },
  horizontal: { label: "4:3" },
  portrait: { label: "3:4" },
  vertical: { label: "9:16" },
} as const satisfies Record<CoverRatio, { label: string }>;
