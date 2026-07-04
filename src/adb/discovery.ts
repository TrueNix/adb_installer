import { execFile } from "node:child_process"
import { Socket } from "node:net"
import { networkInterfaces } from "node:os"
import { promisify } from "node:util"
import type { ActivityEvent, MdnsTarget } from "../shared"
import { AdbCommandError, runAdb } from "./command"

const execFileAsync = promisify(execFile)
const mdnsAddressPattern = /((?:\d{1,3}\.){3}\d{1,3}:\d{2,5})/
const connectService = "_adb-tls-connect._tcp"
const legacyAdbPort = 5555
const probeTimeoutMs = 250
const probeConcurrency = 64

export type DiscoveryResult = {
  readonly events: readonly ActivityEvent[]
  readonly targets: readonly MdnsTarget[]
}

type InterfaceAddress = {
  readonly address: string
  readonly netmask: string
}

function event(level: ActivityEvent["level"], message: string): ActivityEvent {
  return { at: new Date().toISOString(), level, message }
}

function uniqueTargets(targets: readonly MdnsTarget[]): readonly MdnsTarget[] {
  const seen = new Set<string>()
  const unique: MdnsTarget[] = []
  for (const target of targets) {
    if (seen.has(target.address)) {
      continue
    }
    seen.add(target.address)
    unique.push(target)
  }
  return unique
}

export function parseMdnsTargets(stdout: string): readonly MdnsTarget[] {
  const targets: MdnsTarget[] = []
  for (const line of stdout.split("\n")) {
    if (!line.includes(connectService)) {
      continue
    }
    const match = line.match(mdnsAddressPattern)
    const address = match?.[1]
    if (address === undefined) {
      continue
    }
    targets.push({ address, service: connectService })
  }
  return uniqueTargets(targets)
}

export function parseAvahiTargets(stdout: string): readonly MdnsTarget[] {
  const targets: MdnsTarget[] = []
  for (const line of stdout.split("\n")) {
    const fields = line.split(";")
    const marker = fields[0]
    const service = fields[4]
    const address = fields[7]
    const port = fields[8]
    if (
      marker !== "=" ||
      service !== connectService ||
      address === undefined ||
      port === undefined
    ) {
      continue
    }
    if (!address.includes(".") || !/^\d+$/.test(port)) {
      continue
    }
    targets.push({ address: `${address}:${port}`, service })
  }
  return uniqueTargets(targets)
}

function interfaceAddresses(): readonly InterfaceAddress[] {
  const addresses: InterfaceAddress[] = []
  for (const [name, entries] of Object.entries(networkInterfaces())) {
    if (entries === undefined || name.startsWith("docker") || name.startsWith("br-")) {
      continue
    }
    for (const entry of entries) {
      if (entry.family !== "IPv4" || entry.internal) {
        continue
      }
      addresses.push({ address: entry.address, netmask: entry.netmask })
    }
  }
  return addresses
}

export function probeCandidatesForInterface(address: string, netmask: string): readonly string[] {
  if (netmask !== "255.255.255.0") {
    return []
  }
  const octets = address.split(".")
  const lastOctet = Number(octets[3])
  if (octets.length !== 4 || !Number.isInteger(lastOctet)) {
    return []
  }
  const prefix = `${octets[0]}.${octets[1]}.${octets[2]}`
  const candidates: string[] = []
  for (let host = 1; host <= 254; host += 1) {
    if (host === lastOctet) {
      continue
    }
    candidates.push(`${prefix}.${host}`)
  }
  return candidates
}

async function probeLegacyAdbHost(host: string): Promise<MdnsTarget | null> {
  return await new Promise((resolve) => {
    const socket = new Socket()
    let settled = false
    const finish = (target: MdnsTarget | null): void => {
      if (settled) {
        return
      }
      settled = true
      socket.destroy()
      resolve(target)
    }
    socket.setTimeout(probeTimeoutMs)
    socket.once("connect", () =>
      finish({ address: `${host}:${legacyAdbPort}`, service: "legacy-adb-tcp" }),
    )
    socket.once("timeout", () => finish(null))
    socket.once("error", () => finish(null))
    socket.connect({ host, port: legacyAdbPort })
  })
}

async function discoverLegacyAdbTargets(): Promise<DiscoveryResult> {
  const hosts = interfaceAddresses().flatMap((entry) =>
    probeCandidatesForInterface(entry.address, entry.netmask),
  )
  if (hosts.length === 0) {
    return {
      targets: [],
      events: [event("warning", "Legacy TCP scan skipped: no bounded /24 LAN interface found")],
    }
  }
  const targets: MdnsTarget[] = []
  let nextIndex = 0
  async function worker(): Promise<void> {
    while (nextIndex < hosts.length) {
      const host = hosts[nextIndex]
      nextIndex += 1
      if (host === undefined) {
        continue
      }
      const target = await probeLegacyAdbHost(host)
      if (target !== null) {
        targets.push(target)
      }
    }
  }
  const workerCount = Math.min(probeConcurrency, hosts.length)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
  return {
    targets: uniqueTargets(targets),
    events: [event("info", `Checked ${hosts.length} LAN address(es) for legacy ADB port 5555`)],
  }
}

async function discoverWithAdbMdns(): Promise<DiscoveryResult> {
  try {
    const output = await runAdb(["mdns", "services"])
    return { targets: parseMdnsTargets(output.stdout), events: [] }
  } catch (error) {
    if (error instanceof AdbCommandError) {
      return {
        targets: [],
        events: [event("warning", `ADB mDNS discovery unavailable: ${error.message}`)],
      }
    }
    throw error
  }
}

async function discoverWithAvahi(): Promise<DiscoveryResult> {
  try {
    const result = await execFileAsync("avahi-browse", ["-rtp", connectService], {
      encoding: "utf8",
      timeout: 5_000,
      windowsHide: true,
    })
    return { targets: parseAvahiTargets(String(result.stdout)), events: [] }
  } catch (error) {
    if (error instanceof Error) {
      return {
        targets: [],
        events: [event("warning", `Avahi mDNS fallback unavailable: ${error.message}`)],
      }
    }
    throw error
  }
}

export async function discoverTargets(): Promise<DiscoveryResult> {
  const adbMdns = await discoverWithAdbMdns()
  const avahi = await discoverWithAvahi()
  const legacy = await discoverLegacyAdbTargets()
  const targets = uniqueTargets([...adbMdns.targets, ...avahi.targets, ...legacy.targets])
  const discoveryEvents: ActivityEvent[] = [...adbMdns.events, ...avahi.events, ...legacy.events]
  if (avahi.targets.length > 0) {
    discoveryEvents.push(event("info", `Avahi discovered ${avahi.targets.length} Wi-Fi target(s)`))
  }
  if (legacy.targets.length > 0) {
    discoveryEvents.push(event("info", `Legacy TCP scan found ${legacy.targets.length} target(s)`))
  }
  return { targets, events: discoveryEvents }
}
