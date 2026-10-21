import type { ActivityEvent, Device, ManagedPackage, PackageAction, PackageFilter } from "../shared"

export type NoticeKind = "idle" | "success" | "error"

export type Notice = {
  readonly kind: NoticeKind
  readonly text: string
}

export type UiState = {
  readonly apkFile: File | null
  readonly connecting: boolean
  readonly devices: readonly Device[]
  readonly events: readonly ActivityEvent[]
  readonly installing: boolean
  readonly notice: Notice
  readonly packageAction: PackageAction
  readonly packageApplying: boolean
  readonly packageConfirmed: boolean
  readonly packageFilter: PackageFilter
  readonly packageLoading: boolean
  readonly packageSearch: string
  readonly packages: readonly ManagedPackage[]
  readonly pairing: boolean
  readonly scanning: boolean
  readonly selectedSerial: string
  readonly selectedPackages: readonly string[]
}

const idleNotice: Notice = { kind: "idle", text: "" }

let currentState: UiState = {
  apkFile: null,
  connecting: false,
  devices: [],
  events: [],
  installing: false,
  notice: idleNotice,
  packageAction: "disable",
  packageApplying: false,
  packageConfirmed: false,
  packageFilter: "all",
  packageLoading: false,
  packageSearch: "",
  packages: [],
  pairing: false,
  scanning: false,
  selectedSerial: "",
  selectedPackages: [],
}

export function getState(): UiState {
  return currentState
}

export function setState(patch: Partial<UiState>): UiState {
  currentState = { ...currentState, ...patch }
  return currentState
}

export function appendEvents(events: readonly ActivityEvent[]): UiState {
  currentState = { ...currentState, events: [...events, ...currentState.events].slice(0, 40) }
  return currentState
}

export function localEvent(level: ActivityEvent["level"], message: string): ActivityEvent {
  return { at: new Date().toISOString(), level, message }
}

export function clearNotice(): Notice {
  return idleNotice
}
