import { z } from "zod"
export { UnexpectedVariantError, assertNever } from "./exhaustive"

export const DeviceStatusSchema = z.union([
  z.literal("connected"),
  z.literal("unauthorized"),
  z.literal("offline"),
])

export const TransportSchema = z.union([z.literal("wifi"), z.literal("usb"), z.literal("unknown")])

export const EventLevelSchema = z.union([
  z.literal("info"),
  z.literal("success"),
  z.literal("warning"),
  z.literal("error"),
])

export const ProductInfoSchema = z
  .object({
    manufacturer: z.string(),
    brand: z.string(),
    model: z.string(),
    product: z.string(),
    device: z.string(),
    androidRelease: z.string(),
    sdk: z.string(),
  })
  .readonly()

export const DeviceSchema = z
  .object({
    serial: z.string().min(1),
    status: DeviceStatusSchema,
    transport: TransportSchema,
    product: ProductInfoSchema,
    details: z.record(z.string()).readonly(),
  })
  .readonly()

export const MdnsTargetSchema = z
  .object({
    address: z.string().min(3),
    service: z.string().min(1),
  })
  .readonly()

export const ActivityEventSchema = z
  .object({
    at: z.string().datetime(),
    level: EventLevelSchema,
    message: z.string().min(1),
  })
  .readonly()

export const ScanResponseSchema = z
  .object({
    devices: z.array(DeviceSchema).readonly(),
    discovered: z.array(MdnsTargetSchema).readonly(),
    events: z.array(ActivityEventSchema).readonly(),
  })
  .readonly()

export const ConnectRequestSchema = z
  .object({
    address: z.string().trim().min(3).max(120),
  })
  .readonly()

export const InstallRequestSchema = z
  .object({
    serial: z.string().trim().min(1),
  })
  .readonly()

export const InstallResponseSchema = z
  .object({
    serial: z.string(),
    fileName: z.string(),
    output: z.string(),
    events: z.array(ActivityEventSchema).readonly(),
  })
  .readonly()

export const AndroidPackageNameSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)+$/)

export const PackageActionSchema = z.union([
  z.literal("disable"),
  z.literal("uninstall"),
  z.literal("enable"),
  z.literal("restore"),
])

export const PackageFilterSchema = z.union([
  z.literal("all"),
  z.literal("third-party"),
  z.literal("disabled"),
  z.literal("uninstalled"),
])

export const PackageIconSchema = z.union([
  z.literal("app"),
  z.literal("gamepad"),
  z.literal("message"),
  z.literal("music"),
  z.literal("photo"),
  z.literal("play"),
  z.literal("settings"),
  z.literal("store"),
  z.literal("video"),
])

export const PackageListRequestSchema = z
  .object({
    serial: z.string().trim().min(1),
    filter: PackageFilterSchema.default("all"),
  })
  .readonly()

export const ManagedPackageSchema = z
  .object({
    icon: PackageIconSchema.default("app"),
    kind: z.string().min(1).default("App"),
    name: AndroidPackageNameSchema,
    recommended: z.boolean(),
    reason: z.string(),
  })
  .readonly()

export const PackageListResponseSchema = z
  .object({
    serial: z.string(),
    filter: PackageFilterSchema,
    packages: z.array(ManagedPackageSchema).readonly(),
    recommendedCount: z.number().int().nonnegative(),
    events: z.array(ActivityEventSchema).readonly(),
  })
  .readonly()

export const PairRequestSchema = z
  .object({
    address: z.string().trim().min(3).max(120),
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/),
  })
  .readonly()

export const PackageOperationSchema = z
  .object({
    serial: z.string().trim().min(1),
    action: PackageActionSchema,
    packageName: AndroidPackageNameSchema,
  })
  .readonly()

export const PackageActionRequestSchema = z
  .object({
    serial: z.string().trim().min(1),
    action: PackageActionSchema,
    packages: z.array(AndroidPackageNameSchema).min(1).max(50).readonly(),
    confirmed: z.literal(true),
  })
  .readonly()

export const PackageActionResponseSchema = z
  .object({
    serial: z.string(),
    action: PackageActionSchema,
    packages: z.array(AndroidPackageNameSchema).readonly(),
    events: z.array(ActivityEventSchema).readonly(),
  })
  .readonly()

export const ApiFailureSchema = z
  .object({
    message: z.string(),
  })
  .readonly()

export type ActivityEvent = z.infer<typeof ActivityEventSchema>
export type ApiFailure = z.infer<typeof ApiFailureSchema>
export type Device = z.infer<typeof DeviceSchema>
export type DeviceStatus = z.infer<typeof DeviceStatusSchema>
export type EventLevel = z.infer<typeof EventLevelSchema>
export type InstallResponse = z.infer<typeof InstallResponseSchema>
export type ManagedPackage = z.infer<typeof ManagedPackageSchema>
export type MdnsTarget = z.infer<typeof MdnsTargetSchema>
export type PackageAction = z.infer<typeof PackageActionSchema>
export type PackageFilter = z.infer<typeof PackageFilterSchema>
export type PackageActionRequest = z.infer<typeof PackageActionRequestSchema>
export type PackageActionResponse = z.infer<typeof PackageActionResponseSchema>
export type PackageIcon = z.infer<typeof PackageIconSchema>
export type PackageListResponse = z.infer<typeof PackageListResponseSchema>
export type PackageOperation = z.infer<typeof PackageOperationSchema>
export type ProductInfo = z.infer<typeof ProductInfoSchema>
export type ScanResponse = z.infer<typeof ScanResponseSchema>
export type Transport = z.infer<typeof TransportSchema>
