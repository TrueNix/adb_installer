import type { PackageAction } from "../shared"
import type { ViewElements } from "./dom"
import { type UiState, appendEvents, clearNotice, getState, localEvent, setState } from "./state"

type SyncView = () => void

function selectedConnectedSerial(state: UiState): string | null {
  const selected = state.devices.find((device) => device.serial === state.selectedSerial)
  return selected?.status === "connected" ? selected.serial : null
}

function setCleanupError(message: string): void {
  appendEvents([localEvent("error", message)])
  setState({ notice: { kind: "error", text: message } })
}

function packageActionFromValue(value: string): PackageAction | null {
  switch (value) {
    case "disable":
      return "disable"
    case "uninstall":
      return "uninstall"
    default:
      return null
  }
}

export async function loadPackages(sync: SyncView): Promise<void> {
  const state = getState()
  if (state.packageLoading) {
    return
  }
  const serial = selectedConnectedSerial(state)
  if (serial === null) {
    setCleanupError("Select a connected device before loading apps")
    sync()
    return
  }
  setState({
    notice: clearNotice(),
    packageLoading: true,
    selectedPackages: [],
    packageConfirmed: false,
  })
  sync()
  try {
    const { requestPackages } = await import("./api")
    const response = await requestPackages(serial)
    if (getState().selectedSerial !== serial) {
      return
    }
    setState({
      packages: response.packages,
      selectedPackages: [],
      packageConfirmed: false,
      notice: { kind: "success", text: `${response.packages.length} apps loaded` },
    })
    appendEvents(response.events)
  } catch (error) {
    setCleanupError(error instanceof Error ? error.message : "Package cleanup failed")
  } finally {
    setState({ packageLoading: false })
    sync()
  }
}

function selectPreset(sync: SyncView): void {
  const selectedPackages = getState()
    .packages.filter((entry) => entry.recommended)
    .map((entry) => entry.name)
  if (selectedPackages.length === 0) {
    setState({ notice: { kind: "error", text: "No TV preset packages found on this device" } })
    sync()
    return
  }
  setState({
    selectedPackages,
    packageConfirmed: false,
    notice: { kind: "success", text: `${selectedPackages.length} TV preset apps selected` },
  })
  sync()
}

function updatePackageSelection(packageName: string, selected: boolean): void {
  const state = getState()
  const selectedNames = new Set(state.selectedPackages)
  if (selected) {
    selectedNames.add(packageName)
  } else {
    selectedNames.delete(packageName)
  }
  setState({
    selectedPackages: state.packages
      .map((entry) => entry.name)
      .filter((name) => selectedNames.has(name)),
    packageConfirmed: false,
  })
}

async function applySelectedPackages(sync: SyncView): Promise<void> {
  const state = getState()
  const serial = selectedConnectedSerial(state)
  if (serial === null) {
    setCleanupError("Select a connected device before applying cleanup")
    sync()
    return
  }
  if (!state.packageConfirmed) {
    setState({ notice: { kind: "error", text: "Confirm selected packages before applying" } })
    sync()
    return
  }
  setState({ notice: clearNotice(), packageApplying: true })
  sync()
  try {
    const { requestPackageAction } = await import("./api")
    const response = await requestPackageAction(serial, state.packageAction, state.selectedPackages)
    appendEvents(response.events)
    const failed = response.events.some((entry) => entry.level === "error")
    setState({
      selectedPackages: [],
      packageConfirmed: false,
      notice: {
        kind: failed ? "error" : "success",
        text: failed ? "Cleanup finished with errors" : "Cleanup action applied",
      },
    })
  } catch (error) {
    setCleanupError(error instanceof Error ? error.message : "Package cleanup failed")
  } finally {
    setState({ packageApplying: false })
    sync()
  }
}

function handlePackageToggle(event: Event, sync: SyncView): void {
  if (!(event.target instanceof HTMLInputElement) || event.target.name !== "package-checkbox") {
    return
  }
  updatePackageSelection(event.target.value, event.target.checked)
  sync()
}

export function bindPackageWorkflow(elements: ViewElements, sync: SyncView): void {
  elements.loadPackagesButton.addEventListener("click", () => {
    void loadPackages(sync)
  })
  elements.presetPackagesButton.addEventListener("click", () => {
    selectPreset(sync)
  })
  elements.packageSearch.addEventListener("input", () => {
    setState({ packageSearch: elements.packageSearch.value })
    sync()
  })
  elements.packageAction.addEventListener("change", () => {
    const action = packageActionFromValue(elements.packageAction.value)
    if (action !== null) {
      setState({ packageAction: action, packageConfirmed: false })
      sync()
    }
  })
  elements.packageConfirm.addEventListener("change", () => {
    setState({ packageConfirmed: elements.packageConfirm.checked })
    sync()
  })
  elements.packageList.addEventListener("change", (event) => {
    handlePackageToggle(event, sync)
  })
  elements.applyPackagesButton.addEventListener("click", () => {
    void applySelectedPackages(sync)
  })
}
