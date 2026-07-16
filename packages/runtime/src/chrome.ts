import { spawn } from "node:child_process";

function spawnDetached(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
    });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

export async function openChrome(urls: string[]): Promise<void> {
  if (process.platform === "darwin") {
    await spawnDetached("open", ["-a", "Google Chrome", ...urls]);
    return;
  }

  if (process.platform === "win32") {
    for (const url of urls) {
      await spawnDetached("cmd.exe", ["/d", "/s", "/c", "start", "", "chrome", url]);
    }
    return;
  }

  const commands = ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"];
  for (const command of commands) {
    try {
      await spawnDetached(command, urls);
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  throw new Error("Google Chrome or Chromium was not found");
}
