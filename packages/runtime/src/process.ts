import { spawn } from "node:child_process";

type CommandResult = {
  stdout: string;
  stderr: string;
};

export function runCommand(
  command: string,
  args: string[],
  options: { cwd?: string } = {},
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      const result = {
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
      };

      if (code === 0) {
        resolve(result);
        return;
      }

      reject(
        new Error(`${command} exited with code ${code ?? "unknown"}: ${result.stderr.trim()}`),
      );
    });
  });
}
