import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DOMWrapper, flushPromises, mount } from "@vue/test-utils"
import { setConfig } from "frappe-ui"
import Login from "../src/views/Login.vue"

vi.mock("@ionic/vue", () => ({
	IonPage: { template: "<div><slot /></div>" },
	IonContent: { template: "<div><slot /></div>" },
}))

let wrapper
let session

beforeEach(() => {
	setConfig("resourceFetcher", async ({ url }) => (url.includes("oauth") ? [] : 0))
	session = { login: vi.fn(), otp: vi.fn() }
	wrapper = mount(Login, {
		attachTo: document.body,
		global: { provide: { $session: session, $translate: (text) => text } },
	})
})
afterEach(() => {
	wrapper.unmount()
	setConfig("resourceFetcher", undefined)
})

describe("authentication forms", () => {
	it("submits credentials and the requested OTP through their separate forms", async () => {
		session.login.mockResolvedValue({
			verification: { setup: true, prompt: "Enter your verification code" },
			tmp_id: "verification-session",
		})
		session.otp.mockResolvedValue({ message: "Logged In" })
		await flushPromises()
		await wrapper.get('input[autocomplete="username"]').setValue("employee@example.com")
		await wrapper.get('input[autocomplete="current-password"]').setValue("local-test-password")
		await wrapper.get("form").trigger("submit")
		await flushPromises()
		expect(session.login).toHaveBeenCalledWith("employee@example.com", "local-test-password")
		const code = new DOMWrapper(document.querySelector('input[autocomplete="one-time-code"]'))
		await code.setValue("123456")
		const verification = new DOMWrapper(code.element.closest("form"))
		expect(verification.get("button").attributes("type")).toBe("submit")
		await verification.trigger("submit")
		await flushPromises()
		expect(session.otp).toHaveBeenCalledWith("verification-session", "123456")
	})

	it("shows authentication errors and permits another login attempt", async () => {
		session.login.mockRejectedValue({ messages: ["Invalid login credentials"] })
		await flushPromises()
		await wrapper.get("form").trigger("submit")
		await flushPromises()
		expect(wrapper.text()).toContain("Invalid login credentials")
		expect(wrapper.get('button[type="submit"]').element.disabled).toBe(false)
	})
})
