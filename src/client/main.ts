import { getViewElements } from "./dom"
import { renderLucideIcons } from "./icons"
import { shouldAutoLoadPackages } from "./package-autoload"
import { bindPackageWorkflow, loadPackages } from "./package-workflow"
import { render } from "./render"
import { appendEvents, clearNotice, getState, localEvent, setState } from "./state"

const elements = getViewElements()

function sync(): void {
  render(getState(), elements)
  renderLucideIcons()
}

function autoLoadPackages(): void {
  if (shouldAutoLoadPackages(getState())) {
    void loadPackages(sync)
  }
}

function chooseSelectedSerial(currentSerial: string): string {
  const state = getState()
  const current = state.devices.find((device) => device.serial === currentSerial)
  if (current !== undefined) {
    return current.serial
  }
  return (
    state.devices.find((device) => device.status === "connected")?.serial ??
    state.devices[0]?.serial ??
    ""
  )
}

function clearPackageState(): void {
  setState({
    packageConfirmed: false,
    packageSearch: "",
    packages: [],
    selectedPackages: [],
  })
}

function setSelectedSerial(serial: string): void {
  const changed = serial !== getState().selectedSerial
  setState({ selectedSerial: serial })
  if (changed) {
    clearPackageState()
  }
}

async function scan(): Promise<void> {
  setState({ scanning: true, notice: clearNotice() })
  sync()
  try {
    const { requestScan } = await import("./api")
    const response = await requestScan()
    setState({ devices: response.devices })
    setSelectedSerial(chooseSelectedSerial(getState().selectedSerial))
    appendEvents(response.events)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Operation failed"
    appendEvents([localEvent("error", message)])
    setState({ notice: { kind: "error", text: message } })
  } finally {
    setState({ scanning: false })
    sync()
    autoLoadPackages()
  }
}

async function connect(address: string): Promise<void> {
  setState({ connecting: true, notice: clearNotice() })
  sync()
  try {
    const { requestConnect } = await import("./api")
    const response = await requestConnect(address)
    setState({ devices: response.devices })
    setSelectedSerial(chooseSelectedSerial(address))
    appendEvents(response.events)
    elements.addressInput.value = ""
  } catch (error) {
    const message = error instanceof Error ? error.message : "Operation failed"
    appendEvents([localEvent("error", message)])
    setState({ notice: { kind: "error", text: message } })
  } finally {
    setState({ connecting: false })
    sync()
    autoLoadPackages()
  }
}

async function install(): Promise<void> {
  const state = getState()
  if (state.apkFile === null || state.selectedSerial.length === 0) {
    setState({ notice: { kind: "error", text: "Choose a device and APK" } })
    sync()
    return
  }
  setState({ installing: true, notice: clearNotice() })
  sync()
  try {
    const { requestInstall } = await import("./api")
    const response = await requestInstall(state.selectedSerial, state.apkFile)
    appendEvents(response.events)
    setState({ notice: { kind: "success", text: response.output || "Install complete" } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Operation failed"
    appendEvents([localEvent("error", message)])
    setState({ notice: { kind: "error", text: message } })
  } finally {
    setState({ installing: false })
    sync()
  }
}

function handleDeviceClick(event: MouseEvent): void {
  if (!(event.target instanceof Element)) {
    return
  }
  const card = event.target.closest("button[data-serial]")
  if (!(card instanceof HTMLButtonElement)) {
    return
  }
  const serial = card.dataset["serial"]
  if (serial === undefined) {
    return
  }
  setSelectedSerial(serial)
  setState({ notice: clearNotice() })
  sync()
  autoLoadPackages()
}

function setFile(file: File | null): void {
  setState({ apkFile: file, notice: clearNotice() })
  sync()
}

elements.scanButton.addEventListener("click", () => {
  void scan()
})

elements.connectForm.addEventListener("submit", (event) => {
  event.preventDefault()
  const address = elements.addressInput.value.trim()
  if (address.length === 0) {
    setState({ notice: { kind: "error", text: "Enter an ADB address" } })
    sync()
    return
  }
  void connect(address)
})

elements.installButton.addEventListener("click", () => {
  void install()
})

bindPackageWorkflow(elements, sync)

elements.deviceList.addEventListener("click", handleDeviceClick)

elements.apkInput.addEventListener("change", (event) => {
  if (!(event.target instanceof HTMLInputElement)) {
    return
  }
  setFile(event.target.files?.item(0) ?? null)
})

elements.dropZone.addEventListener("dragover", (event) => {
  event.preventDefault()
  elements.dropZone.classList.add("drag-over")
})

elements.dropZone.addEventListener("dragleave", () => {
  elements.dropZone.classList.remove("drag-over")
})

elements.dropZone.addEventListener("drop", (event) => {
  event.preventDefault()
  elements.dropZone.classList.remove("drag-over")
  setFile(event.dataTransfer?.files.item(0) ?? null)
})

sync()

requestAnimationFrame(() => {
  void scan()
})
