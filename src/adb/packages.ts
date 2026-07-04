import { assertNever } from "../exhaustive"
import {
  type ActivityEvent,
  AndroidPackageNameSchema,
  type ManagedPackage,
  type PackageAction,
  type PackageActionRequest,
  type PackageActionResponse,
  type PackageIcon,
  type PackageListResponse,
  type PackageOperation,
} from "../shared"
import { AdbCommandError, runAdb } from "./command"

const packageTimeoutMs = 60_000

type PresetPackage = {
  readonly name: string
  readonly reason: string
}

type PackagePresentation = {
  readonly icon: PackageIcon
  readonly kind: string
}

const androidTvBloatPreset: readonly PresetPackage[] = [
  { name: "com.google.android.youtube.tv", reason: "Preloaded media app" },
  { name: "com.netflix.ninja", reason: "Preloaded media app" },
  { name: "com.amazon.amazonvideo.livingroom", reason: "Preloaded media app" },
  { name: "com.disney.disneyplus", reason: "Preloaded media app" },
  { name: "com.spotify.tv.android", reason: "Preloaded media app" },
  { name: "com.google.android.play.games", reason: "Optional Google TV app" },
  { name: "com.google.android.videos", reason: "Optional Google TV app" },
  { name: "com.google.android.music", reason: "Optional Google TV app" },
  { name: "com.google.android.apps.photos", reason: "Optional Google app" },
  { name: "com.google.android.apps.youtube.kids", reason: "Optional Google TV app" },
  { name: "com.google.android.feedback", reason: "Diagnostics and feedback app" },
]

const presetReasons = new Map(androidTvBloatPreset.map((entry) => [entry.name, entry.reason]))

const knownPackagePresentations = new Map<string, PackagePresentation>([
  ["com.android.vending", { icon: "store", kind: "Store" }],
  ["com.amazon.amazonvideo.livingroom", { icon: "video", kind: "Video" }],
  ["com.disney.disneyplus", { icon: "video", kind: "Video" }],
  ["com.google.android.apps.photos", { icon: "photo", kind: "Photos" }],
  ["com.google.android.apps.youtube.kids", { icon: "play", kind: "Video" }],
  ["com.google.android.feedback", { icon: "message", kind: "Feedback" }],
  ["com.google.android.music", { icon: "music", kind: "Audio" }],
  ["com.google.android.play.games", { icon: "gamepad", kind: "Games" }],
  ["com.google.android.tvlauncher", { icon: "settings", kind: "System" }],
  ["com.google.android.videos", { icon: "video", kind: "Video" }],
  ["com.google.android.youtube.tv", { icon: "play", kind: "Video" }],
  ["com.netflix.ninja", { icon: "video", kind: "Video" }],
  ["com.spotify.tv.android", { icon: "music", kind: "Audio" }],
])

function activity(level: ActivityEvent["level"], message: string): ActivityEvent {
  return { at: new Date().toISOString(), level, message }
}

function packageFromLine(line: string): string {
  const payload = line.slice("package:".length)
  const separator = payload.lastIndexOf("=")
  return separator >= 0 ? payload.slice(separator + 1) : payload
}

export function parsePackageList(output: string): readonly string[] {
  const packageNames = new Set<string>()
  for (const rawLine of output.split("\n")) {
    const line = rawLine.trim()
    if (!line.startsWith("package:")) {
      continue
    }
    const parsed = AndroidPackageNameSchema.safeParse(packageFromLine(line))
    if (parsed.success) {
      packageNames.add(parsed.data)
    }
  }
  return [...packageNames].sort((left, right) => left.localeCompare(right))
}

export function recommendedTvBloatPackages(installed: readonly string[]): readonly string[] {
  const installedPackages = new Set(installed)
  return androidTvBloatPreset
    .map((entry) => entry.name)
    .filter((packageName) => installedPackages.has(packageName))
}

function inferPackagePresentation(name: string): PackagePresentation {
  const known = knownPackagePresentations.get(name)
  if (known !== undefined) {
    return known
  }

  const normalized = name.toLowerCase()
  if (normalized.includes("youtube")) {
    return { icon: "play", kind: "Video" }
  }
  if (
    normalized.includes("amazonvideo") ||
    normalized.includes("disney") ||
    normalized.includes("netflix") ||
    normalized.includes("video")
  ) {
    return { icon: "video", kind: "Video" }
  }
  if (normalized.includes("music") || normalized.includes("spotify")) {
    return { icon: "music", kind: "Audio" }
  }
  if (normalized.includes("gallery") || normalized.includes("photo")) {
    return { icon: "photo", kind: "Photos" }
  }
  if (normalized.includes("game")) {
    return { icon: "gamepad", kind: "Games" }
  }
  if (normalized.includes("feedback")) {
    return { icon: "message", kind: "Feedback" }
  }
  if (normalized.includes("store") || normalized.includes("vending")) {
    return { icon: "store", kind: "Store" }
  }
  if (normalized.includes("launcher") || normalized.includes("settings")) {
    return { icon: "settings", kind: "System" }
  }

  return { icon: "app", kind: "App" }
}

export function buildPackageInventory(packageNames: readonly string[]): readonly ManagedPackage[] {
  return [...packageNames]
    .sort((left, right) => left.localeCompare(right))
    .map((name) => {
      const reason = presetReasons.get(name) ?? ""
      const presentation = inferPackagePresentation(name)
      return {
        icon: presentation.icon,
        kind: presentation.kind,
        name,
        recommended: reason.length > 0,
        reason,
      }
    })
}

export function buildPackageOperation(operation: PackageOperation): readonly string[] {
  switch (operation.action) {
    case "disable":
      return [
        "-s",
        operation.serial,
        "shell",
        "pm",
        "disable-user",
        "--user",
        "0",
        operation.packageName,
      ]
    case "uninstall":
      return [
        "-s",
        operation.serial,
        "shell",
        "pm",
        "uninstall",
        "--user",
        "0",
        operation.packageName,
      ]
    default:
      return assertNever(operation.action)
  }
}

export async function listPackages(serial: string): Promise<PackageListResponse> {
  const output = await runAdb(["-s", serial, "shell", "pm", "list", "packages"], packageTimeoutMs)
  const packages = buildPackageInventory(parsePackageList(output.stdout))
  const recommendedCount = packages.filter((entry) => entry.recommended).length
  return {
    serial,
    packages,
    recommendedCount,
    events: [activity("success", `Loaded ${packages.length} package(s) from ${serial}`)],
  }
}

function actionLabel(action: PackageAction): string {
  switch (action) {
    case "disable":
      return "Disabled"
    case "uninstall":
      return "Removed for user"
    default:
      return assertNever(action)
  }
}

function actionMessage(action: PackageAction, packageName: string, output: string): string {
  const details = output.trim()
  const prefix = `${actionLabel(action)} ${packageName}`
  return details.length > 0 ? `${prefix}: ${details}` : prefix
}

export async function applyPackageAction(
  request: PackageActionRequest,
): Promise<PackageActionResponse> {
  const events: ActivityEvent[] = []
  for (const packageName of request.packages) {
    try {
      const output = await runAdb(
        buildPackageOperation({
          action: request.action,
          packageName,
          serial: request.serial,
        }),
        packageTimeoutMs,
      )
      events.push(activity("success", actionMessage(request.action, packageName, output.stdout)))
    } catch (error) {
      if (error instanceof AdbCommandError) {
        events.push(
          activity(
            "error",
            `${actionLabel(request.action)} failed for ${packageName}: ${error.message}`,
          ),
        )
        continue
      }
      throw error
    }
  }
  return {
    serial: request.serial,
    action: request.action,
    packages: request.packages,
    events,
  }
}
