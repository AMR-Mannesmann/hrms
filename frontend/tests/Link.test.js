import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DOMWrapper, flushPromises, mount } from "@vue/test-utils"
import { setConfig } from "frappe-ui"
import Link from "../src/components/Link.vue"

const translate = (text, values = []) => text.replace(/\{(\d+)\}/g, (_, i) => values[i])
const wrappers = []
let fetcher

function link(props = {}) {
	const wrapper = mount(Link, {
		attachTo: document.body,
		props: { doctype: "Leave Type", ...props },
		global: { mocks: { __: translate } },
	})
	wrappers.push(wrapper)
	return wrapper
}

beforeEach(() => {
	fetcher = vi.fn(async () => [{ value: "LEAVE-001", label: "Annual Leave" }])
	setConfig("resourceFetcher", fetcher)
})

afterEach(() => {
	wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
	setConfig("resourceFetcher", undefined)
})

describe("document links", () => {
	it("settles an existing selection without searching for its display label", async () => {
		const wrapper = link({ modelValue: "LEAVE-001" })
		await flushPromises()
		expect(wrapper.get("input").element.value).toBe("Annual Leave : LEAVE-001")
		await new Promise((resolve) => setTimeout(resolve, 700))
		expect(fetcher).toHaveBeenCalledOnce()
	})

	it("uses server search results even when the label does not contain the query", async () => {
		const wrapper = link()
		await flushPromises()
		await wrapper.get("input").trigger("click")
		await wrapper.get("input").setValue("vacation")
		await vi.waitFor(() =>
			expect(fetcher).toHaveBeenLastCalledWith(
				expect.objectContaining({
					params: { doctype: "Leave Type", txt: "vacation", filters: {} },
				})
			)
		)
		await flushPromises()
		const option = document.querySelector('[role="option"]')
		expect(option?.textContent).toContain("Annual Leave")
		await new DOMWrapper(option).trigger("click")
		expect(wrapper.emitted("update:modelValue").at(-1)).toEqual(["LEAVE-001"])
	})

	it("clears a selected link to the empty document value", async () => {
		const wrapper = link({ modelValue: "LEAVE-001" })
		await flushPromises()
		await wrapper.get('button[aria-label="Clear Leave Type"]').trigger("click")
		expect(wrapper.emitted("update:modelValue").at(-1)).toEqual([""])
	})

	it("reloads the server options when link filters change", async () => {
		const wrapper = link({ filters: { company: "Company A" } })
		await flushPromises()
		await wrapper.setProps({ filters: { company: "Company B" } })
		expect(fetcher).toHaveBeenLastCalledWith(
			expect.objectContaining({
				params: { doctype: "Leave Type", txt: "", filters: { company: "Company B" } },
			})
		)
	})

	it("disables selection and clearing on submitted fields", async () => {
		const wrapper = link({ modelValue: "LEAVE-001", disabled: true })
		await flushPromises()
		expect(wrapper.get("input").element.disabled).toBe(true)
		expect(wrapper.find('button[aria-label="Clear Leave Type"]').exists()).toBe(false)
	})
})
