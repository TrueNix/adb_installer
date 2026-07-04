declare module "lucide/dist/esm/icons/*.js" {
  type AttributeValue = string | number
  type IconAttributes = Readonly<Record<string, AttributeValue>>
  type IconChild = readonly [string, IconAttributes]
  type IconNode = readonly [string, IconAttributes, readonly IconChild[]]

  const icon: IconNode
  // biome-ignore lint/style/noDefaultExport: Lucide per-icon modules expose default icon nodes.
  export default icon
}
