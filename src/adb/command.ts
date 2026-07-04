import { execFile } from "node:child_process"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)
export const defaultTimeoutMs = 12_000

export class AdbCommandError extends Error {
  readonly args: readonly string[]

  constructor(args: readonly string[], message: string) {
    super(`adb ${args.join(" ")} failed: ${message}`)
    this.name = "AdbCommandError"
    this.args = args
  }
}

export type CommandOutput = {
  readonly stdout: string
  readonly stderr: string
}

export async function runAdb(
  args: readonly string[],
  timeoutMs = defaultTimeoutMs,
): Promise<CommandOutput> {
  try {
    const result = await execFileAsync("adb", [...args], {
      encoding: "utf8",
      timeout: timeoutMs,
      windowsHide: true,
    })
    return { stdout: String(result.stdout), stderr: String(result.stderr) }
  } catch (error) {
    if (error instanceof Error) {
      throw new AdbCommandError(args, error.message)
    }
    throw error
  }
}
