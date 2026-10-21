import type { ActivityEvent, Device, DeviceStatus } from "../shared"
import type { ViewElements } from "./dom"
import { renderPackages } from "./package-render"
import type { UiState } from "./state"

class RenderVariantError extends Error {
  constructor(value: never) {
    super(`Unexpected render variant: ${String(value)}`)
    this.name = "RenderVariantError"
  }
}

function assertNever(value: never): never {
  throw new RenderVariantError(value)
}

function createElement(tagName: string, className: string, text = ""): HTMLElement {
  const element = document.createElement(tagName)
  element.className = className
  if (text.length > 0) {
    element.textContent = text
  }
  return element
}

function statusLabel(status: DeviceStatus): string {
  switch (status) {
    case "connected":
      return "Connected"
    case "unauthorized":
      return "Unauthorized"
    case "offline":
      return "Offline"
    default:
      return assertNever(status)
  }
}

function productName(device: Device): string {
  const manufacturer = device.product.manufacturer || device.product.brand
  const model = device.product.model || device.details["model"] || device.product.product
  return [manufacturer, model].filter(Boolean).join(" ") || device.serial
}

function productMeta(device: Device): string {
  const android =
    device.product.androidRelease.length > 0 ? `Android ${device.product.androidRelease}` : ""
  return [device.product.product, device.product.device, android].filter(Boolean).join(" · ")
}

function formatBytes(file: File): string {
  const units = ["B", "KB", "MB", "GB"] as const
  let size = file.size
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  const unit = units[unitIndex] ?? "B"
  return `${size.toFixed(size >= 10 || unit === "B" ? 0 : 1)} ${unit}`
}

function createPill(text: string, className = ""): HTMLElement {
  return createElement("span", `pill ${className}`.trim(), text)
}

function deviceCard(device: Device, selectedSerial: string): HTMLButtonElement {
  const card = document.createElement("button")
  card.type = "button"
  card.className = device.serial === selectedSerial ? "device-card selected" : "device-card"
  card.dataset["serial"] = device.serial
  card.setAttribute("aria-pressed", String(device.serial === selectedSerial))

  const main = createElement("div", "device-card-main")
  const titleGroup = createElement("div", "")
  titleGroup.append(
    createElement("div", "device-title", productName(device)),
    createElement("div", "device-serial", device.serial),
  )
  main.append(titleGroup, createPill(statusLabel(device.status), device.status))

  const meta = createElement("div", "device-meta")
  meta.append(createPill(device.transport), createPill(productMeta(device) || "product pending"))
  card.append(main, meta)
  return card
}

function renderDevices(state: UiState, elements: ViewElements): void {
  elements.deviceList.replaceChildren(
    ...state.devices.map((device) => deviceCard(device, state.selectedSerial)),
  )
  elements.emptyDevices.classList.toggle("hidden", state.devices.length > 0)
}

function renderActivity(events: readonly ActivityEvent[], elements: ViewElements): void {
  const rows = events.map((activity) => {
    const row = createElement("li", `activity-row ${activity.level}`)
    const message = createElement("span", "activity-message", activity.message)
    const time = createElement("time", "activity-time", new Date(activity.at).toLocaleTimeString())
    time.setAttribute("datetime", activity.at)
    row.append(message, time)
    return row
  })
  elements.activityLog.replaceChildren(...rows)
  elements.emptyActivity.classList.toggle("hidden", events.length > 0)
}

function renderFile(state: UiState, elements: ViewElements): void {
  if (state.apkFile === null) {
    elements.apkName.textContent = "Choose APK"
    elements.apkMeta.textContent = "No file selected"
    return
  }
  elements.apkName.textContent = state.apkFile.name
  elements.apkMeta.textContent = formatBytes(state.apkFile)
}

function renderSelection(state: UiState, elements: ViewElements): void {
  const selected = state.devices.find((device) => device.serial === state.selectedSerial)
  elements.deviceCount.textContent = String(state.devices.length)
  elements.selectedProduct.textContent = selected === undefined ? "None" : productName(selected)
  elements.transportState.textContent = selected === undefined ? "Idle" : selected.transport
  if (selected === undefined) {
    elements.selectedDevice.textContent = "Select a connected device"
    return
  }
  const name = productName(selected)
  elements.selectedDevice.textContent =
    name === selected.serial ? selected.serial : `${name} · ${selected.serial}`
}

function renderNotice(state: UiState, elements: ViewElements): void {
  elements.notice.textContent = state.notice.text
  elements.notice.className =
    state.notice.kind === "success"
      ? "notice success"
      : state.notice.kind === "error"
        ? "notice error"
        : "notice"
}

function canInstall(state: UiState): boolean {
  const selected = state.devices.find((device) => device.serial === state.selectedSerial)
  return (
    selected?.status === "connected" &&
    state.apkFile !== null &&
    !state.installing &&
    !state.packageApplying
  )
}

export function render(state: UiState, elements: ViewElements): void {
  renderDevices(state, elements)
  renderActivity(state.events, elements)
  renderFile(state, elements)
  renderSelection(state, elements)
  renderNotice(state, elements)
  renderPackages(state, elements)
  elements.scanButton.disabled =
    state.scanning || state.installing || state.packageApplying || state.pairing
  elements.connectButton.disabled =
    state.connecting || state.installing || state.packageApplying || state.pairing
  elements.pairButton.disabled =
    state.pairing || state.connecting || state.installing || state.packageApplying
  elements.installButton.disabled = !canInstall(state)
  elements.scanState.textContent = state.scanning ? "Scanning" : "Ready"
  elements.scanBadge.textContent = state.scanning ? "Scanning" : "ADB"
  elements.installBadge.textContent = state.installing ? "Installing" : "Ready"
}
