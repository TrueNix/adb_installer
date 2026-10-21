import type { ManagedPackage, PackageIcon } from "../shared"
import type { ViewElements } from "./dom"
import type { UiState } from "./state"

const packageIconNames: Readonly<Record<PackageIcon, string>> = {
  app: "package",
  gamepad: "gamepad-2",
  message: "message-square",
  music: "music",
  photo: "image",
  play: "play",
  settings: "settings",
  store: "shopping-bag",
  video: "video",
}

function createElement(tagName: string, className: string, text = ""): HTMLElement {
  const element = document.createElement(tagName)
  element.className = className
  if (text.length > 0) {
    element.textContent = text
  }
  return element
}

function selectedDeviceIsConnected(state: UiState): boolean {
  return state.devices.some(
    (device) => device.serial === state.selectedSerial && device.status === "connected",
  )
}

function filteredPackages(state: UiState): readonly ManagedPackage[] {
  const query = state.packageSearch.trim().toLowerCase()
  if (query.length === 0) {
    return state.packages
  }
  return state.packages.filter((entry) => entry.name.toLowerCase().includes(query))
}

function packageRow(entry: ManagedPackage, state: UiState): HTMLLabelElement {
  const selected = state.selectedPackages.includes(entry.name)
  const row = document.createElement("label")
  row.className = selected ? "package-row selected" : "package-row"

  const checkbox = document.createElement("input")
  checkbox.type = "checkbox"
  checkbox.name = "package-checkbox"
  checkbox.value = entry.name
  checkbox.checked = selected
  checkbox.disabled = state.packageApplying

  const icon = createElement(
    "span",
    entry.recommended ? "package-icon recommended" : "package-icon",
  )
  icon.setAttribute("aria-hidden", "true")
  const glyph = document.createElement("i")
  glyph.dataset["lucide"] = packageIconNames[entry.icon]
  icon.append(glyph)

  const details = createElement("div", "package-details")
  const main = createElement("div", "package-row-main")
  main.append(createElement("span", "package-name", entry.name))
  if (entry.recommended) {
    main.append(createElement("span", "pill warning", "TV preset"))
  }

  const meta = createElement("div", "package-row-meta")
  meta.append(
    createElement("span", "pill", entry.kind),
    createElement("span", "pill", entry.reason || "Installed package"),
  )
  details.append(main, meta)
  row.append(checkbox, icon, details)
  return row
}

function cleanupSummary(state: UiState): string {
  if (state.packageLoading) {
    return "Loading installed apps"
  }
  if (state.packageApplying) {
    return "Applying selected cleanup action"
  }
  if (state.packages.length === 0) {
    return "Load apps from the selected device"
  }
  const selected = state.selectedPackages.length
  const scope = state.packageFilter === "all" ? "apps" : `${state.packageFilter} apps`
  return `${state.packages.length} ${scope} loaded · ${selected} selected`
}

function emptyPackageText(state: UiState, visibleCount: number): string {
  if (state.packages.length === 0) {
    return state.packageFilter === "all"
      ? "Load apps to review installed packages"
      : `No ${state.packageFilter} packages`
  }
  if (visibleCount === 0) {
    return "No packages match this search"
  }
  return ""
}

export function renderPackages(state: UiState, elements: ViewElements): void {
  const connected = selectedDeviceIsConnected(state)
  const visiblePackages = filteredPackages(state)
  elements.cleanupSummary.textContent = cleanupSummary(state)
  elements.packageSearch.value = state.packageSearch
  elements.packageFilter.value = state.packageFilter
  elements.packageAction.value = state.packageAction
  elements.packageConfirm.checked = state.packageConfirmed
  elements.loadPackagesButton.disabled = !connected || state.packageLoading || state.packageApplying
  elements.packageFilter.disabled = !connected || state.packageApplying
  elements.presetPackagesButton.disabled =
    state.packages.length === 0 ||
    state.packageApplying ||
    state.packageFilter === "disabled" ||
    state.packageFilter === "uninstalled"
  elements.packageSearch.disabled = state.packages.length === 0 || state.packageApplying
  elements.packageAction.disabled = state.packageApplying
  elements.packageConfirm.disabled = state.selectedPackages.length === 0 || state.packageApplying
  elements.applyPackagesButton.disabled =
    !connected ||
    state.packageApplying ||
    state.selectedPackages.length === 0 ||
    !state.packageConfirmed
  elements.applyPackagesButton.setAttribute("aria-busy", String(state.packageApplying))
  elements.packageList.replaceChildren(...visiblePackages.map((entry) => packageRow(entry, state)))
  elements.emptyPackages.textContent = emptyPackageText(state, visiblePackages.length)
  elements.emptyPackages.classList.toggle("hidden", visiblePackages.length > 0)
}
