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

  it("rejects an incomplete pairing request before touching adb", async () => {
    const response = await app.request("/api/pair", {
      body: JSON.stringify({ address: "192.0.2.1:37829", code: "12" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })

    expect(response.status).toBe(400)
  })

  it("rejects an unknown package filter before touching adb", async () => {
    const response = await app.request("/api/packages/list", {
      body: JSON.stringify({ serial: "192.0.2.1:5555", filter: "bogus" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })

    expect(response.status).toBe(400)
  })

  it("accepts same-origin API calls", async () => {
    const response = await app.request("/api/health", {
      headers: { host: "localhost:3000", origin: "http://localhost:3000" },
    })

    expect(response.status).toBe(200)
  })
})
