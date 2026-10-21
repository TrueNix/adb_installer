import { AdbCommandError, runAdb } from "./adb/command"
import { discoverTargets, parseMdnsTargets } from "./adb/discovery"
import type {
  ActivityEvent,
  Device,
  DeviceStatus,
  ProductInfo,
  ScanResponse,
  Transport,
} from "./shared"

const installTimeoutMs = 180_000

export type ParsedDevice = {
  readonly serial: string
  readonly status: DeviceStatus
  readonly details: Readonly<Record<string, string>>
}

export { AdbCommandError, parseMdnsTargets }

function event(level: ActivityEvent["level"], message: string): ActivityEvent {
  return { at: new Date().toISOString(), level, message }
}

export function connectionEvent(address: string, output: string): ActivityEvent {
  const message = output.trim() || `Connected ${address}`
  const normalized = message.toLowerCase()
  if (
    normalized.includes("failed") ||
    normalized.includes("unable") ||
    normalized.includes("cannot")
  ) {
    return event("warning", message)
  }
  return event("success", message)
}

function statusFromMode(mode: string): DeviceStatus {
  if (mode === "device") {
    return "connected"
  }
  if (mode === "unauthorized") {
    return "unauthorized"
  }
  return "offline"
}

function transportFromDetails(
  serial: string,
  details: Readonly<Record<string, string>>,
): Transport {
  if (serial.includes(":")) {
    return "wifi"
  }
  if (details["usb"] !== undefined) {
    return "usb"
  }
  return "unknown"
}

function parseDetails(fields: readonly string[]): Readonly<Record<string, string>> {
  const details: Record<string, string> = {}
  for (const field of fields) {
    const separatorIndex = field.indexOf(":")
    if (separatorIndex <= 0) {
      continue
    }
    details[field.slice(0, separatorIndex)] = field.slice(separatorIndex + 1)
  }
  return details
}

export function parseDeviceLine(line: string): ParsedDevice | null {
  const parts = line.trim().split(/\s+/)
  const serial = parts[0]
  const mode = parts[1]
  if (serial === undefined || mode === undefined || serial === "List") {
    return null
  }
  return {
    serial,
    status: statusFromMode(mode),
    details: parseDetails(parts.slice(2)),
  }
}

async function getProp(serial: string, prop: string): Promise<string> {
  try {
    const output = await runAdb(["-s", serial, "shell", "getprop", prop])
    return output.stdout.trim()
  } catch (error) {
    if (error instanceof AdbCommandError) {
      return ""
    }
    throw error
  }
}

async function readProduct(serial: string): Promise<ProductInfo> {
  const [manufacturer, brand, model, product, device, androidRelease, sdk] = await Promise.all([
    getProp(serial, "ro.product.manufacturer"),
    getProp(serial, "ro.product.brand"),
    getProp(serial, "ro.product.model"),
    getProp(serial, "ro.product.name"),
    getProp(serial, "ro.product.device"),
    getProp(serial, "ro.build.version.release"),
    getProp(serial, "ro.build.version.sdk"),
  ])
  return {
    manufacturer,
    brand,
    model,
    product,
    device,
    androidRelease,
    sdk,
  }
}

function fallbackProduct(details: Readonly<Record<string, string>>): ProductInfo {
  return {
    manufacturer: "",
    brand: "",
    model: details["model"] ?? "",
    product: details["product"] ?? "",
    device: details["device"] ?? "",
    androidRelease: "",
    sdk: "",
  }
}

async function enrichDevice(parsed: ParsedDevice): Promise<Device> {
  const product =
    parsed.status === "connected"
      ? await readProduct(parsed.serial)
      : fallbackProduct(parsed.details)
  return {
    serial: parsed.serial,
    status: parsed.status,
    transport: transportFromDetails(parsed.serial, parsed.details),
    product,
    details: parsed.details,
  }
}

async function listDevices(): Promise<readonly Device[]> {
  const output = await runAdb(["devices", "-l"])
  const parsed = output.stdout
    .split("\n")
    .map(parseDeviceLine)
    .filter((device): device is ParsedDevice => device !== null)
  return Promise.all(parsed.map(enrichDevice))
}

export async function scanDevices(): Promise<ScanResponse> {
  const events: ActivityEvent[] = []
  await runAdb(["start-server"])
  const discovery = await discoverTargets()
  events.push(...discovery.events)
  const discovered = discovery.targets
  if (discovered.length > 0) {
    events.push(event("info", `Discovery found ${discovered.length} Wi-Fi target(s)`))
  }
  for (const target of discovered) {
    try {
      const output = await runAdb(["connect", target.address])
      events.push(connectionEvent(target.address, output.stdout))
    } catch (error) {
      if (error instanceof AdbCommandError) {
        events.push(event("warning", error.message))
        continue
      }
      throw error
    }
  }
  const devices = await listDevices()
  events.push(event("info", `Found ${devices.length} ADB device(s)`))
  return { devices, discovered, events }
}

export async function connectAddress(address: string): Promise<ScanResponse> {
  const events: ActivityEvent[] = []
  const output = await runAdb(["connect", address])
  events.push(connectionEvent(address, output.stdout))
  const devices = await listDevices()
  return { devices, discovered: [], events }
}

export async function pairDevice(address: string, code: string): Promise<ScanResponse> {
  const output = await runAdb(["pair", address, code], 60_000)
  const scan = await scanDevices()
  return {
    devices: scan.devices,
    discovered: scan.discovered,
    events: [event("success", output.stdout.trim() || `Paired ${address}`), ...scan.events],
  }
}

export async function installApk(serial: string, filePath: string): Promise<string> {
  const output = await runAdb(["-s", serial, "install", "-r", filePath], installTimeoutMs)
  return [output.stdout.trim(), output.stderr.trim()].filter(Boolean).join("\n")
}

export function installEvent(serial: string, fileName: string): ActivityEvent {
  return event("success", `Installed ${fileName} on ${serial}`)
}
