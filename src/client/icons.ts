import UploadCloud from "lucide/dist/esm/icons/cloud-upload.js"
import Gamepad2 from "lucide/dist/esm/icons/gamepad-2.js"
import HardDriveDownload from "lucide/dist/esm/icons/hard-drive-download.js"
import Image from "lucide/dist/esm/icons/image.js"
import List from "lucide/dist/esm/icons/list.js"
import MessageSquare from "lucide/dist/esm/icons/message-square.js"
import Music from "lucide/dist/esm/icons/music.js"
import PackageGlyph from "lucide/dist/esm/icons/package.js"
import Play from "lucide/dist/esm/icons/play.js"
import RefreshCw from "lucide/dist/esm/icons/refresh-cw.js"
import Settings from "lucide/dist/esm/icons/settings.js"
import ShieldOff from "lucide/dist/esm/icons/shield-off.js"
import ShoppingBag from "lucide/dist/esm/icons/shopping-bag.js"
import Sparkles from "lucide/dist/esm/icons/sparkles.js"
import Terminal from "lucide/dist/esm/icons/terminal.js"
import Trash2 from "lucide/dist/esm/icons/trash-2.js"
import Video from "lucide/dist/esm/icons/video.js"
import Wifi from "lucide/dist/esm/icons/wifi.js"

type AttributeValue = string | number
type IconAttributes = Readonly<Record<string, AttributeValue>>
type IconChild = readonly [string, IconAttributes]
type IconNode = readonly [string, IconAttributes, readonly IconChild[]]
type IconRegistry = Readonly<Record<string, IconNode>>

const svgNamespace = "http://www.w3.org/2000/svg"
const icons: IconRegistry = {
  "gamepad-2": Gamepad2,
  "hard-drive-download": HardDriveDownload,
  image: Image,
  list: List,
  "message-square": MessageSquare,
  music: Music,
  package: PackageGlyph,
  play: Play,
  "refresh-cw": RefreshCw,
  settings: Settings,
  "shield-off": ShieldOff,
  "shopping-bag": ShoppingBag,
  sparkles: Sparkles,
  terminal: Terminal,
  "trash-2": Trash2,
  "upload-cloud": UploadCloud,
  video: Video,
  wifi: Wifi,
}

function setAttributes(element: Element, attributes: IconAttributes): void {
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, String(value))
  }
}

function createIconElement(icon: IconNode): SVGElement {
  const [tagName, attributes, children] = icon
  const svg = document.createElementNS(svgNamespace, tagName)
  setAttributes(svg, attributes)
  for (const [childTag, childAttributes] of children) {
    const child = document.createElementNS(svgNamespace, childTag)
    setAttributes(child, childAttributes)
    svg.append(child)
  }
  return svg
}

function copyPlaceholderAttributes(source: Element, target: Element): void {
  for (const attribute of source.attributes) {
    if (attribute.name !== "data-lucide") {
      target.setAttribute(attribute.name, attribute.value)
    }
  }
}

export function renderLucideIcons(): void {
  for (const placeholder of document.querySelectorAll("i[data-lucide]")) {
    const iconName = placeholder.getAttribute("data-lucide") ?? ""
    const icon = icons[iconName]
    if (icon === undefined) {
      continue
    }
    const svg = createIconElement(icon)
    copyPlaceholderAttributes(placeholder, svg)
    placeholder.replaceWith(svg)
  }
}
