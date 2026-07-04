import { describe, expect, it } from "bun:test"
import { shouldAutoLoadPackages } from "../src/client/package-autoload"
import type { UiState } from "../src/client/state"
import type { Device, ManagedPackage } from "../src/shared"

const connectedDevice: Device = {
  details: { model: "Smart TV Pro" },
  product: {
    androidRelease: "14",
    brand: "TCL",
    device: "G08",
    manufacturer: "TCL",
    model: "Smart TV Pro",
    product: "G08_4K_GB",
    sdk: "35",
  },
  serial: "192.0.2.224:5555",
  status: "connected",
  transport: "wifi",
}

const appPackage: ManagedPackage = {
  icon: "app",
  kind: "App",
  name: "com.example.app",
  reason: "",
  recommended: false,
}

function stateWith(patch: Partial<UiState> = {}): UiState {
  return {
    apkFile: null,
    connecting: false,
    devices: [connectedDevice],
    events: [],
    installing: false,
    notice: { kind: "idle", text: "" },
    packageAction: "disable",
    packageApplying: false,
    packageConfirmed: false,
    packageLoading: false,
    packageSearch: "",
    packages: [],
    scanning: false,
    selectedPackages: [],
    selectedSerial: connectedDevice.serial,
    ...patch,
  }
}

describe("Package auto-load", () => {
  it("loads packages when a connected selected device has no package list", () => {
    expect(shouldAutoLoadPackages(stateWith())).toBe(true)
  })

  it("does not load packages while the list is already loaded or loading", () => {
    expect(shouldAutoLoadPackages(stateWith({ packages: [appPackage] }))).toBe(false)
    expect(shouldAutoLoadPackages(stateWith({ packageLoading: true }))).toBe(false)
  })

  it("does not load packages without a connected selected device", () => {
    expect(shouldAutoLoadPackages(stateWith({ selectedSerial: "" }))).toBe(false)
    expect(
      shouldAutoLoadPackages(
        stateWith({ devices: [{ ...connectedDevice, status: "unauthorized" }] }),
      ),
    ).toBe(false)
  })
})
