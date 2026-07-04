export class DomElementError extends Error {
  constructor(id: string) {
    super(`Missing required element: ${id}`)
    this.name = "DomElementError"
  }
}

type ElementConstructor<T extends Element> = abstract new () => T

export type ViewElements = {
  readonly addressInput: HTMLInputElement
  readonly apkInput: HTMLInputElement
  readonly apkMeta: HTMLElement
  readonly apkName: HTMLElement
  readonly connectButton: HTMLButtonElement
  readonly connectForm: HTMLFormElement
  readonly deviceCount: HTMLElement
  readonly deviceList: HTMLElement
  readonly dropZone: HTMLLabelElement
  readonly emptyActivity: HTMLElement
  readonly emptyDevices: HTMLElement
  readonly installBadge: HTMLElement
  readonly installButton: HTMLButtonElement
  readonly notice: HTMLElement
  readonly activityLog: HTMLOListElement
  readonly applyPackagesButton: HTMLButtonElement
  readonly cleanupSummary: HTMLElement
  readonly emptyPackages: HTMLElement
  readonly loadPackagesButton: HTMLButtonElement
  readonly packageAction: HTMLSelectElement
  readonly packageConfirm: HTMLInputElement
  readonly packageList: HTMLElement
  readonly packageSearch: HTMLInputElement
  readonly presetPackagesButton: HTMLButtonElement
  readonly scanBadge: HTMLElement
  readonly scanButton: HTMLButtonElement
  readonly scanState: HTMLElement
  readonly selectedDevice: HTMLElement
  readonly selectedProduct: HTMLElement
  readonly transportState: HTMLElement
}

function requiredElement<T extends HTMLElement>(id: string, elementType: ElementConstructor<T>): T {
  const element = document.getElementById(id)
  if (element instanceof elementType) {
    return element
  }
  throw new DomElementError(id)
}

export function getViewElements(): ViewElements {
  return {
    addressInput: requiredElement("address-input", HTMLInputElement),
    apkInput: requiredElement("apk-input", HTMLInputElement),
    apkMeta: requiredElement("apk-meta", HTMLElement),
    apkName: requiredElement("apk-name", HTMLElement),
    connectButton: requiredElement("connect-button", HTMLButtonElement),
    connectForm: requiredElement("connect-form", HTMLFormElement),
    deviceCount: requiredElement("device-count", HTMLElement),
    deviceList: requiredElement("device-list", HTMLElement),
    dropZone: requiredElement("drop-zone", HTMLLabelElement),
    emptyActivity: requiredElement("empty-activity", HTMLElement),
    emptyDevices: requiredElement("empty-devices", HTMLElement),
    installBadge: requiredElement("install-badge", HTMLElement),
    installButton: requiredElement("install-button", HTMLButtonElement),
    notice: requiredElement("notice", HTMLElement),
    activityLog: requiredElement("activity-log", HTMLOListElement),
    applyPackagesButton: requiredElement("apply-packages-button", HTMLButtonElement),
    cleanupSummary: requiredElement("cleanup-summary", HTMLElement),
    emptyPackages: requiredElement("empty-packages", HTMLElement),
    loadPackagesButton: requiredElement("load-packages-button", HTMLButtonElement),
    packageAction: requiredElement("package-action", HTMLSelectElement),
    packageConfirm: requiredElement("package-confirm", HTMLInputElement),
    packageList: requiredElement("package-list", HTMLElement),
    packageSearch: requiredElement("package-search", HTMLInputElement),
    presetPackagesButton: requiredElement("preset-packages-button", HTMLButtonElement),
    scanBadge: requiredElement("scan-badge", HTMLElement),
    scanButton: requiredElement("scan-button", HTMLButtonElement),
    scanState: requiredElement("scan-state", HTMLElement),
    selectedDevice: requiredElement("selected-device", HTMLElement),
    selectedProduct: requiredElement("selected-product", HTMLElement),
    transportState: requiredElement("transport-state", HTMLElement),
  }
}
