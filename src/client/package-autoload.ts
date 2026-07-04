import type { UiState } from "./state"

export function shouldAutoLoadPackages(state: UiState): boolean {
  if (state.packageLoading || state.packageApplying || state.packages.length > 0) {
    return false
  }
  return state.devices.some(
    (device) => device.serial === state.selectedSerial && device.status === "connected",
  )
}
