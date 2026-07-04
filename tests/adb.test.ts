import { describe, expect, it } from "bun:test"
import { connectionEvent, parseDeviceLine, parseMdnsTargets } from "../src/adb"
import { parseAvahiTargets, probeCandidatesForInterface } from "../src/adb/discovery"

describe("ADB parser", () => {
  it("parses connected Wi-Fi devices when adb lists product metadata", () => {
    const parsed = parseDeviceLine(
      "192.168.1.44:5555 device product:oriole model:Pixel_6 device:oriole transport_id:7",
    )

    expect(parsed?.serial).toBe("192.168.1.44:5555")
    expect(parsed?.status).toBe("connected")
    expect(parsed?.details["model"]).toBe("Pixel_6")
  })

  it("parses unauthorized devices without losing the serial", () => {
    const parsed = parseDeviceLine("R5CW123456 unauthorized usb:1-4 transport_id:2")

    expect(parsed?.serial).toBe("R5CW123456")
    expect(parsed?.status).toBe("unauthorized")
    expect(parsed?.details["usb"]).toBe("1-4")
  })

  it("deduplicates mDNS Wi-Fi targets", () => {
    const targets = parseMdnsTargets(`
List of discovered mdns services
adb-123._adb-tls-connect._tcp. 192.168.1.44:38427
adb-123._adb-tls-connect._tcp. 192.168.1.44:38427
`)

    expect(targets).toHaveLength(1)
    expect(targets[0]?.address).toBe("192.168.1.44:38427")
  })

  it("parses Avahi Android wireless debugging services", () => {
    const targets = parseAvahiTargets(`
=;enp6s0;IPv4;adb-12345;_adb-tls-connect._tcp;local;pixel.local;192.168.1.44;38427;""
=;enp6s0;IPv4;adb-12345;_adb-tls-pairing._tcp;local;pixel.local;192.168.1.44;37123;""
=;enp6s0;IPv6;adb-12345;_adb-tls-connect._tcp;local;pixel.local;fe80::1234;38427;""
`)

    expect(targets).toHaveLength(1)
    expect(targets[0]?.address).toBe("192.168.1.44:38427")
    expect(targets[0]?.service).toBe("_adb-tls-connect._tcp")
  })

  it("builds bounded legacy TCP scan candidates only for /24 LANs", () => {
    const candidates = probeCandidatesForInterface("192.168.1.31", "255.255.255.0")

    expect(candidates).toHaveLength(253)
    expect(candidates).toContain("192.168.1.1")
    expect(candidates).toContain("192.168.1.254")
    expect(candidates).not.toContain("192.168.1.31")
  })

  it("classifies adb connect authentication failures as warnings", () => {
    const activity = connectionEvent(
      "192.0.2.224:5555",
      "failed to authenticate to 192.0.2.224:5555",
    )

    expect(activity.level).toBe("warning")
  })
})
