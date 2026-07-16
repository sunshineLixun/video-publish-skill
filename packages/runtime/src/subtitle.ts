import { access, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { runCommand } from "./process";

const subtitleExtensions = new Set([".srt", ".vtt", ".ass", ".ssa", ".txt"]);
const videoExtensions = new Set([".mp4", ".mov", ".mkv", ".webm"]);

type TranscriptResult = {
  kind: "video" | "subtitle";
  videoPath: string | null;
  subtitlePath: string | null;
  transcriptPath: string;
};

type WhisperOptions = {
  model: string;
  language: string;
};

function cleanCaptionText(value: string): string {
  return value
    .replace(/\{\\[^}]+\}/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\\N|\\n/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function deduplicateLines(lines: string[]): string[] {
  return lines.filter((line, index) => line && line !== lines[index - 1]);
}

function normalizeTimedSubtitle(value: string): string {
  const lines = value
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        line !== "WEBVTT" &&
        !/^\d+$/.test(line) &&
        !/^(NOTE|STYLE|REGION)(\s|$)/.test(line) &&
        !/\d{1,2}:\d{2}(?::\d{2})?[.,]\d{3}\s+-->/.test(line),
    )
    .map(cleanCaptionText);

  return deduplicateLines(lines).join("\n");
}

function splitAssDialogue(value: string, fieldCount: number): string[] {
  const fields: string[] = [];
  let remainder = value;

  for (let index = 0; index < fieldCount - 1; index += 1) {
    const commaIndex = remainder.indexOf(",");
    if (commaIndex === -1) break;
    fields.push(remainder.slice(0, commaIndex));
    remainder = remainder.slice(commaIndex + 1);
  }

  fields.push(remainder);
  return fields;
}

function normalizeAss(value: string): string {
  let textIndex = 9;
  let fieldCount = 10;
  let inEvents = false;
  const lines: string[] = [];

  for (const rawLine of value.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.startsWith("[")) {
      inEvents = line.toLowerCase() === "[events]";
      continue;
    }
    if (!inEvents) continue;

    if (line.toLowerCase().startsWith("format:")) {
      const fields = line
        .slice(line.indexOf(":") + 1)
        .split(",")
        .map((field) => field.trim().toLowerCase());
      const nextTextIndex = fields.indexOf("text");
      if (nextTextIndex >= 0) {
        textIndex = nextTextIndex;
        fieldCount = fields.length;
      }
      continue;
    }

    if (!line.toLowerCase().startsWith("dialogue:")) continue;
    const fields = splitAssDialogue(line.slice(line.indexOf(":") + 1), fieldCount);
    const text = cleanCaptionText(fields[textIndex] ?? fields.at(-1) ?? "");
    if (text) lines.push(text);
  }

  return deduplicateLines(lines).join("\n");
}

export function normalizeSubtitle(value: string, extension: string): string {
  if (extension === ".ass" || extension === ".ssa") return normalizeAss(value);
  if (extension === ".srt" || extension === ".vtt") return normalizeTimedSubtitle(value);
  return cleanCaptionText(value.replace(/^\uFEFF/, ""));
}

async function findPython(): Promise<string> {
  for (const command of [process.env.VIDEO_PUBLISH_PYTHON, "python3", "python"]) {
    if (!command) continue;
    try {
      await runCommand(command, ["--version"]);
      return command;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") continue;
    }
  }
  throw new Error("Python 3 is required for local Whisper transcription");
}

function resolveTranscribeScript(): string {
  if (process.env.VIDEO_PUBLISH_TRANSCRIBE_SCRIPT) {
    return resolve(process.env.VIDEO_PUBLISH_TRANSCRIBE_SCRIPT);
  }
  const runtimeRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  return join(runtimeRoot, "scripts", "transcribe.py");
}

async function transcribeVideo(
  videoPath: string,
  sessionDirectory: string,
  transcriptPath: string,
  options: WhisperOptions,
): Promise<void> {
  const audioPath = join(sessionDirectory, "transcription.wav");
  await runCommand("ffmpeg", [
    "-y",
    "-i",
    videoPath,
    "-vn",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-c:a",
    "pcm_s16le",
    audioPath,
  ]);

  try {
    const python = await findPython();
    const scriptPath = resolveTranscribeScript();
    await access(scriptPath);
    await runCommand(python, [
      scriptPath,
      "--audio",
      audioPath,
      "--output",
      transcriptPath,
      "--model",
      options.model,
      "--language",
      options.language,
    ]);
  } finally {
    await rm(audioPath, { force: true });
  }
}

async function extractEmbeddedSubtitle(
  videoPath: string,
  sessionDirectory: string,
): Promise<string | null> {
  const probe = await runCommand("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "s",
    "-show_entries",
    "stream=index,codec_name",
    "-of",
    "json",
    videoPath,
  ]);
  const value = JSON.parse(probe.stdout) as { streams?: unknown[] };
  if (!value.streams?.length) return null;

  const subtitlePath = join(sessionDirectory, "embedded-subtitle.srt");
  try {
    await runCommand("ffmpeg", [
      "-y",
      "-i",
      videoPath,
      "-map",
      "0:s:0",
      "-c:s",
      "srt",
      subtitlePath,
    ]);
    return subtitlePath;
  } catch {
    await rm(subtitlePath, { force: true });
    return null;
  }
}

export async function prepareTranscript(
  inputPath: string,
  sessionDirectory: string,
  options: WhisperOptions,
): Promise<TranscriptResult> {
  const extension = extname(inputPath).toLowerCase();
  const transcriptPath = join(sessionDirectory, "transcript.txt");

  if (subtitleExtensions.has(extension)) {
    const transcript = normalizeSubtitle(await readFile(inputPath, "utf8"), extension);
    if (!transcript) throw new Error("The subtitle file does not contain readable text");
    await writeFile(transcriptPath, `${transcript}\n`, "utf8");
    return {
      kind: "subtitle",
      videoPath: null,
      subtitlePath: inputPath,
      transcriptPath,
    };
  }

  if (!videoExtensions.has(extension)) {
    throw new Error(`Unsupported input type: ${extension || "no extension"}`);
  }

  const embeddedSubtitlePath = await extractEmbeddedSubtitle(inputPath, sessionDirectory);
  if (embeddedSubtitlePath) {
    const transcript = normalizeSubtitle(await readFile(embeddedSubtitlePath, "utf8"), ".srt");
    if (transcript) {
      await writeFile(transcriptPath, `${transcript}\n`, "utf8");
      return {
        kind: "video",
        videoPath: inputPath,
        subtitlePath: embeddedSubtitlePath,
        transcriptPath,
      };
    }
  }

  await transcribeVideo(inputPath, sessionDirectory, transcriptPath, options);
  const transcript = (await readFile(transcriptPath, "utf8")).trim();
  if (!transcript) throw new Error("Whisper did not produce a transcript");

  return {
    kind: "video",
    videoPath: inputPath,
    subtitlePath: null,
    transcriptPath,
  };
}
