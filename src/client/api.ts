import ky from "ky"
import {
  ConnectRequestSchema,
  type InstallResponse,
  InstallResponseSchema,
  type PackageAction,
  PackageActionRequestSchema,
  type PackageActionResponse,
  PackageActionResponseSchema,
  type PackageFilter,
  PackageListRequestSchema,
  type PackageListResponse,
  PackageListResponseSchema,
  PairRequestSchema,
  type ScanResponse,
  ScanResponseSchema,
} from "../shared"

const api = ky.create({
  prefixUrl: window.location.origin,
  timeout: 180_000,
})

export async function requestScan(): Promise<ScanResponse> {
  return ScanResponseSchema.parse(await api.get("api/scan").json())
}

export async function requestConnect(address: string): Promise<ScanResponse> {
  const body = ConnectRequestSchema.parse({ address })
  return ScanResponseSchema.parse(await api.post("api/connect", { json: body }).json())
}

export async function requestInstall(serial: string, apk: File): Promise<InstallResponse> {
  const form = new FormData()
  form.set("serial", serial)
  form.set("apk", apk)
  return InstallResponseSchema.parse(await api.post("api/install", { body: form }).json())
}

export async function requestPackages(
  serial: string,
  filter: PackageFilter,
): Promise<PackageListResponse> {
  const body = PackageListRequestSchema.parse({ serial, filter })
  return PackageListResponseSchema.parse(await api.post("api/packages/list", { json: body }).json())
}

export async function requestPair(address: string, code: string): Promise<ScanResponse> {
  const body = PairRequestSchema.parse({ address, code })
  return ScanResponseSchema.parse(await api.post("api/pair", { json: body }).json())
}

export async function requestPackageAction(
  serial: string,
  action: PackageAction,
  packages: readonly string[],
): Promise<PackageActionResponse> {
  const body = PackageActionRequestSchema.parse({ action, confirmed: true, packages, serial })
  return PackageActionResponseSchema.parse(
    await api.post("api/packages/apply", { json: body }).json(),
  )
}
