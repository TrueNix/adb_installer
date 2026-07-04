import { describe, expect, it } from "bun:test"
import {
  buildPackageInventory,
  buildPackageOperation,
  parsePackageList,
  recommendedTvBloatPackages,
} from "../src/adb/packages"

describe("Package cleanup", () => {
  it("parses package manager output with file paths and invalid noise", () => {
    const packages = parsePackageList(`
package:/system/app/LeanbackLauncher/base.apk=com.google.android.tvlauncher
package:com.netflix.ninja
ignored:com.example.bad
package:not-a-valid-id
package:com.netflix.ninja
`)

    expect(packages).toEqual(["com.google.android.tvlauncher", "com.netflix.ninja"])
  })

  it("marks only installed Android TV bloat preset packages", () => {
    const packages = recommendedTvBloatPackages([
      "com.android.vending",
      "com.netflix.ninja",
      "com.google.android.tvlauncher",
      "com.google.android.youtube.tv",
    ])

    expect(packages).toEqual(["com.google.android.youtube.tv", "com.netflix.ninja"])
  })

  it("builds inventory rows with preset reasons and stable ordering", () => {
    const inventory = buildPackageInventory(["com.spotify.tv.android", "com.android.vending"])

    expect(inventory).toEqual([
      {
        icon: "store",
        kind: "Store",
        name: "com.android.vending",
        reason: "",
        recommended: false,
      },
      {
        icon: "music",
        kind: "Audio",
        name: "com.spotify.tv.android",
        reason: "Preloaded media app",
        recommended: true,
      },
    ])
  })

  it("builds guarded adb commands for disable and uninstall actions", () => {
    const disable = buildPackageOperation({
      action: "disable",
      packageName: "com.netflix.ninja",
      serial: "192.168.1.44:5555",
    })
    const uninstall = buildPackageOperation({
      action: "uninstall",
      packageName: "com.netflix.ninja",
      serial: "192.168.1.44:5555",
    })

    expect(disable).toEqual([
      "-s",
      "192.168.1.44:5555",
      "shell",
      "pm",
      "disable-user",
      "--user",
      "0",
      "com.netflix.ninja",
    ])
    expect(uninstall).toEqual([
      "-s",
      "192.168.1.44:5555",
      "shell",
      "pm",
      "uninstall",
      "--user",
      "0",
      "com.netflix.ninja",
    ])
  })
})
