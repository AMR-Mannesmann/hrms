import { afterEach, describe, expect, it, vi } from "vitest"
import { readFileSync } from "node:fs"
import { devBoot } from "../vite/devBoot"
import { initSocket } from "../src/socket"
import { loadBootData } from "../src/boot"

const { io, socket, getCachedResource, getCachedListResource, frappeRequest } = vi.hoisted(() => ({
	io: vi.fn(),
	socket: { on: vi.fn() },
	getCachedResource: vi.fn(),
	getCachedListResource: vi.fn(),
	frappeRequest: vi.fn(),
}))

vi.mock("socket.io-client", () => ({ io }))
vi.mock("frappe-ui", () => ({ getCachedResource, getCachedListResource, frappeRequest }))

afterEach(() => {
	vi.resetAllMocks()
	delete window.frappe
	delete window.site_name
	delete window.csrf_token
})

describe("boot data", () => {
	const html = readFileSync("index.html", "utf8")

	it("leaves Jinja boot data available for Frappe production rendering", () => {
		expect(devBoot().transformIndexHtml(html, {})).toBe(html)
	})

	it("removes the unrendered Jinja script before Vite scans development HTML", () => {
		const result = devBoot().transformIndexHtml(html, { server: {} })
		expect(result).not.toContain("{{ boot }}")
		expect(result).not.toContain("{{ csrf_token }}")
		expect(result).toContain('src="/src/main.js"')
	})

	it("gets the development session token before authenticated requests start", async () => {
		const boot = { site_name: "hrms.localhost", socketio_port: 9001, csrf_token: "session-token" }
		frappeRequest.mockResolvedValue(boot)
		await loadBootData()
		expect(frappeRequest).toHaveBeenCalledWith({
			url: "/api/method/hrms.www.hrms.get_context_for_dev",
			method: "GET",
		})
		expect(window.csrf_token).toBe("session-token")
		expect(window.site_name).toBe("hrms.localhost")
		expect(window.frappe.boot).toEqual(boot)
	})
})

describe("realtime resources", () => {
	it("uses the boot site and configured Socket.IO port", () => {
		window.frappe = { boot: { site_name: "hrms.localhost", socketio_port: 9001 } }
		io.mockReturnValue(socket)
		expect(initSocket()).toBe(socket)
		expect(io.mock.calls[0][0]).toMatch(/\/hrms\.localhost$/)
		expect(io.mock.calls[0][1]).toEqual({ withCredentials: true, reconnectionAttempts: 5 })
	})

	it.each(["resource", "list"])("reloads a cached %s after a server notification", (type) => {
		window.site_name = "hrms.localhost"
		io.mockReturnValue(socket)
		const resource = { reload: vi.fn() }
		if (type === "resource") getCachedResource.mockReturnValue(resource)
		else getCachedListResource.mockReturnValue(resource)
		initSocket()
		const handler = socket.on.mock.calls.find(([event]) => event === "hrms:refetch_resource")[1]
		handler({ cache_key: "hrms:notifications" })
		expect(resource.reload).toHaveBeenCalledOnce()
	})

	it("ignores invalidation for an uncached resource", () => {
		io.mockReturnValue(socket)
		initSocket()
		const handler = socket.on.mock.calls[0][1]
		expect(() => handler({ cache_key: "missing" })).not.toThrow()
	})
})
