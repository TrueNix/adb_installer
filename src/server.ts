import { createHash } from "node:crypto"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { gzipSync } from "node:zlib"
import { Hono } from "hono"
import { AdbCommandError, connectAddress, installApk, installEvent, scanDevices } from "./adb"
import { applyPackageAction, listPackages } from "./adb/packages"
import {
  type ApiFailure,
  ApiFailureSchema,
  ConnectRequestSchema,
  InstallRequestSchema,
  PackageActionRequestSchema,
  PackageListRequestSchema,
} from "./shared"

const publicDir = join(import.meta.dir, "..", "public")
const port = Number(Bun.env["PORT"] ?? "3000")
const app = new Hono()

function apiFailure(message: string): ApiFailure {
  return ApiFailureSchema.parse({ message })
}

function errorMessage(error: unknown): string {
  if (error instanceof AdbCommandError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return "Unexpected server failure"
}

type StaticAsset = {
  readonly name: string
  readonly contentType: string
  readonly cacheControl: string
}

function staticFile(asset: StaticAsset): Response {
  return new Response(Bun.file(join(publicDir, asset.name)), {
    headers: {
      "cache-control": asset.cacheControl,
      "content-type": asset.contentType,
    },
  })
}

function clientVersion(appJs: string): string {
  return createHash("sha256").update(appJs).digest("hex").slice(0, 12)
}

async function indexFile(acceptEncoding: string): Promise<Response> {
  const [html, css, appJs] = await Promise.all([
    Bun.file(join(publicDir, "index.html")).text(),
    Bun.file(join(publicDir, "styles.css")).text(),
    Bun.file(join(publicDir, "app.js")).text(),
  ])
  const body = html
    .replace('<link rel="stylesheet" href="/styles.css" />', `<style>${css}</style>`)
    .replace(
      '<script type="module" src="/app.js"></script>',
      `<script type="module" src="/app.js?v=${clientVersion(appJs)}"></script>`,
    )
  const headers = {
    "cache-control": "no-store",
    "content-type": "text/html; charset=utf-8",
    vary: "accept-encoding",
  }
  if (acceptEncoding.includes("gzip")) {
    return new Response(gzipSync(body), {
      headers: { ...headers, "content-encoding": "gzip" },
    })
  }
  return new Response(body, { headers })
}

function cleanFileName(fileName: string): string {
  const cleaned = fileName.replace(/[^\w.-]+/g, "_")
  return cleaned.length > 0 && cleaned !== "." && cleaned !== ".." ? cleaned : "upload.apk"
}

app.use("/api/*", async (context, next): Promise<Response | undefined> => {
  const origin = context.req.header("origin")
  const host = context.req.header("host")
  if (origin !== undefined && host !== undefined) {
    let originHost = ""
    try {
      originHost = new URL(origin).host
    } catch {
      return context.json(apiFailure("Cross-origin request rejected"), 403)
    }
    if (originHost !== host) {
      return context.json(apiFailure("Cross-origin request rejected"), 403)
    }
  }
  await next()
  return undefined
})

app.get("/", (context) => indexFile(context.req.header("accept-encoding") ?? ""))
app.get("/styles.css", () =>
  staticFile({
    name: "styles.css",
    contentType: "text/css; charset=utf-8",
    cacheControl: "public, max-age=31536000, immutable",
  }),
)
app.get("/app.js", () =>
  staticFile({
    name: "app.js",
    contentType: "text/javascript; charset=utf-8",
    cacheControl: "no-store",
  }),
)
app.get("/chunks/:name", (context) => {
  const name = context.req.param("name")
  if (!/^[A-Za-z0-9_-]+\.js$/.test(name)) {
    return context.text("Not found", 404)
  }
  return staticFile({
    name: `chunks/${name}`,
    contentType: "text/javascript; charset=utf-8",
    cacheControl: "no-store",
  })
})
app.get(
  "/robots.txt",
  () =>
    new Response("User-agent: *\nDisallow:\n", {
      headers: {
        "cache-control": "public, max-age=3600",
        "content-type": "text/plain; charset=utf-8",
      },
    }),
)

app.get("/api/health", (context) => context.json({ ok: true }))

app.get("/api/scan", async (context) => {
  try {
    return context.json(await scanDevices())
  } catch (error) {
    const message = error instanceof Error ? errorMessage(error) : "Unexpected server failure"
    return context.json(apiFailure(message), 500)
  }
})

app.post("/api/connect", async (context) => {
  try {
    const body = ConnectRequestSchema.safeParse(await context.req.json())
    if (!body.success) {
      return context.json(apiFailure("Enter an address like 192.168.1.42:5555"), 400)
    }
    return context.json(await connectAddress(body.data.address))
  } catch (error) {
    const message = error instanceof Error ? errorMessage(error) : "Unexpected server failure"
    return context.json(apiFailure(message), 500)
  }
})

app.post("/api/install", async (context) => {
  const tempDir = await mkdtemp(join(tmpdir(), "adb-installer-"))
  try {
    const form = await context.req.raw.formData()
    const request = InstallRequestSchema.safeParse({ serial: form.get("serial") })
    const apk = form.get("apk")
    if (!request.success || !(apk instanceof File)) {
      return context.json(apiFailure("Choose a device and APK before installing"), 400)
    }
    const fileName = cleanFileName(apk.name)
    const apkPath = join(tempDir, fileName)
    await writeFile(apkPath, new Uint8Array(await apk.arrayBuffer()))
    const output = await installApk(request.data.serial, apkPath)
    return context.json({
      serial: request.data.serial,
      fileName,
      output,
      events: [installEvent(request.data.serial, fileName)],
    })
  } catch (error) {
    const message = error instanceof Error ? errorMessage(error) : "Unexpected server failure"
    return context.json(apiFailure(message), 500)
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})

app.post("/api/packages/list", async (context) => {
  try {
    const body = PackageListRequestSchema.safeParse(await context.req.json())
    if (!body.success) {
      return context.json(apiFailure("Choose a connected device before loading apps"), 400)
    }
    return context.json(await listPackages(body.data.serial))
  } catch (error) {
    const message = error instanceof Error ? errorMessage(error) : "Unexpected server failure"
    return context.json(apiFailure(message), 500)
  }
})

app.post("/api/packages/apply", async (context) => {
  try {
    const body = PackageActionRequestSchema.safeParse(await context.req.json())
    if (!body.success) {
      return context.json(apiFailure("Select packages and confirm the cleanup action"), 400)
    }
    return context.json(await applyPackageAction(body.data))
  } catch (error) {
    const message = error instanceof Error ? errorMessage(error) : "Unexpected server failure"
    return context.json(apiFailure(message), 500)
  }
})

app.notFound((context) =>
  context.req.path.startsWith("/api/")
    ? context.json(apiFailure("Not found"), 404)
    : indexFile(context.req.header("accept-encoding") ?? ""),
)

if (import.meta.main) {
  const hostname = Bun.env["HOST"] ?? "127.0.0.1"
  Bun.serve({ hostname, port, fetch: app.fetch })

  console.log(`ADB Installer running at http://${hostname}:${port}`)
}

export { app }
