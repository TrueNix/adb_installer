import { describe, expect, it } from "bun:test"
import { app } from "../src/server"

describe("Server routing", () => {
  it("rejects chunk paths that escape the chunk directory", async () => {
    const response = await app.request("/chunks/..%2f..%2fpackage.json")

    expect(response.status).toBe(404)
  })

  it("answers unknown API paths with JSON 404 instead of the app shell", async () => {
    const response = await app.request("/api/does-not-exist")

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ message: "Not found" })
  })

  it("rejects cross-origin API calls", async () => {
    const response = await app.request("/api/health", {
      headers: { host: "localhost:3000", origin: "http://evil.example" },
    })

    expect(response.status).toBe(403)
  })

  it("accepts same-origin API calls", async () => {
    const response = await app.request("/api/health", {
      headers: { host: "localhost:3000", origin: "http://localhost:3000" },
    })

    expect(response.status).toBe(200)
  })
})
