import { afterEach, describe, expect, it } from "vitest"
import { flushPromises, mount } from "@vue/test-utils"
import dayjs from "dayjs"
import FormField from "../src/components/FormField.vue"

const wrappers = []

function field(props) {
	const wrapper = mount(FormField, {
		props: { label: "Test field", ...props },
		global: {
			provide: {
				$translate: (text, values = []) => text.replace(/\{(\d+)\}/g, (_, i) => values[i]),
				$dayjs: dayjs,
			},
		},
	})
	wrappers.push(wrapper)
	return wrapper
}

afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()))

describe("Frappe document fields", () => {
	it("mounts stored rich text with one compatible editor runtime", async () => {
		const wrapper = field({
			fieldtype: "Text Editor",
			modelValue: "<p><strong>Stored receipt</strong></p>",
		})
		await flushPromises()
		expect(wrapper.get('[contenteditable="true"]').text()).toBe("Stored receipt")
		expect(wrapper.get("strong").text()).toBe("Stored receipt")
	})

	it.each(["Data", "Small Text", "Text", "Long Text"])(
		"updates a %s field with its text value",
		async (fieldtype) => {
			const wrapper = field({ fieldtype, modelValue: "Before" })
			await wrapper.get(fieldtype === "Data" ? "input" : "textarea").setValue("After")
			expect(wrapper.emitted("update:modelValue").at(-1)).toEqual(["After"])
			expect(wrapper.emitted("change").at(-1)).toEqual(["After"])
		}
	)

	it.each(["Int", "Float", "Currency"])(
		"keeps zero in a %s field instead of applying its default",
		(fieldtype) => {
			const wrapper = field({ fieldtype, modelValue: 0, default: 12 })
			expect(wrapper.get("input").element.value).toBe("0")
			expect(wrapper.emitted("update:modelValue")).toBeUndefined()
		}
	)

	it("keeps an unchecked checkbox instead of applying a true default", () => {
		const wrapper = field({ fieldtype: "Check", modelValue: false, default: 1 })
		expect(wrapper.get('input[type="checkbox"]').element.checked).toBe(false)
		expect(wrapper.emitted("update:modelValue")).toBeUndefined()
	})

	it("updates a Check field with a boolean", async () => {
		const wrapper = field({ fieldtype: "Check", modelValue: 0 })
		await wrapper.get('input[type="checkbox"]').setValue(true)
		expect(wrapper.emitted("update:modelValue").at(-1)).toEqual([true])
	})

	it("shows a read-only zero and disables editing", () => {
		const wrapper = field({ fieldtype: "Currency", modelValue: 0, readOnly: 1 })
		expect(wrapper.get("input").element.value).toBe("0")
		expect(wrapper.get("input").element.disabled).toBe(true)
	})

	it("does not display hidden document fields", () => {
		const wrapper = field({ fieldtype: "Data", hidden: 1, modelValue: "Hidden" })
		expect(wrapper.find("input").exists()).toBe(false)
	})

	it("uses a document's numeric default when its value is absent", () => {
		const wrapper = field({ fieldtype: "Currency", default: "12.50" })
		expect(wrapper.emitted("update:modelValue")).toEqual([[12.5]])
	})

	it("initializes calculated read-only defaults on a new document", () => {
		const wrapper = field({ fieldtype: "Currency", default: "0", readOnly: 1 })
		expect(wrapper.emitted("update:modelValue")).toEqual([[0]])
		expect(wrapper.emitted("change")).toBeUndefined()
	})
})
