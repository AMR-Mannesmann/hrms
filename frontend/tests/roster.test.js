import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DOMWrapper, flushPromises, mount } from "@vue/test-utils"
import { Button, MultiSelect, setConfig } from "frappe-ui"
import dayjs from "../../roster/src/utils/dayjs"
import Link from "../../roster/src/components/Link.vue"
import MonthViewHeader from "../../roster/src/components/MonthViewHeader.vue"
import MonthViewTable from "../../roster/src/components/MonthViewTable.vue"

const wrappers = []
let fetcher

function mountRoster(component, props) {
	const wrapper = mount(component, {
		attachTo: document.body,
		props,
		global: { components: { Button } },
	})
	wrappers.push(wrapper)
	return wrapper
}

async function chooseOption(label) {
	const option = [...document.querySelectorAll('[role="option"]')].find((element) =>
		element.textContent.includes(label)
	)
	expect(option).toBeTruthy()
	await new DOMWrapper(option).trigger("click")
}

beforeEach(() => {
	fetcher = vi.fn(async ({ url, params }) => {
		if (url === "frappe.desk.search.search_link") {
			return [{ value: "EMP-001", label: "Ada Example" }]
		}
		if (url === "hrms.api.roster.get_default_company") return "Example Company"
		if (url === "frappe.client.get_list") {
			return [{ name: params.doctype === "Company" ? "Example Company" : "Engineering" }]
		}
		if (url === "hrms.api.roster.get_events") return {}
		throw new Error(`Unexpected API: ${url}`)
	})
	setConfig("resourceFetcher", fetcher)
})

afterEach(() => {
	wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
	setConfig("resourceFetcher", undefined)
})

describe("roster links", () => {
	it("does not search again when a selected id resolves to its display label", async () => {
		const wrapper = mountRoster(Link, { doctype: "Employee", modelValue: "EMP-001" })
		await flushPromises()
		expect(wrapper.get("input").element.value).toBe("Ada Example : EMP-001")
		await new Promise((resolve) => setTimeout(resolve, 700))
		expect(fetcher).toHaveBeenCalledOnce()
	})

	it("retains server search matches and emits a document id", async () => {
		const wrapper = mountRoster(Link, {
			doctype: "Employee",
			filters: { company: "Example Company" },
		})
		await flushPromises()
		await wrapper.get("input").trigger("click")
		await wrapper.get("input").setValue("fuzzy match")
		await vi.waitFor(() =>
			expect(fetcher).toHaveBeenLastCalledWith(
				expect.objectContaining({
					params: {
						doctype: "Employee",
						txt: "fuzzy match",
						filters: { company: "Example Company" },
					},
				})
			)
		)
		await flushPromises()
		await chooseOption("Ada Example : EMP-001")
		expect(wrapper.emitted("update:modelValue").at(-1)).toEqual(["EMP-001"])
	})

	it("clears a selected document to an empty string", async () => {
		const wrapper = mountRoster(Link, { doctype: "Employee", modelValue: "EMP-001" })
		await flushPromises()
		await wrapper.get('button[aria-label="Clear Employee"]').trigger("click")
		expect(wrapper.emitted("update:modelValue").at(-1)).toEqual([""])
	})

	it("keeps submitted document links disabled", async () => {
		const wrapper = mountRoster(Link, {
			doctype: "Employee",
			modelValue: "EMP-001",
			disabled: true,
		})
		await flushPromises()
		expect(wrapper.get("input").element.disabled).toBe(true)
		expect(wrapper.find('button[aria-label="Clear Employee"]').exists()).toBe(false)
	})
})

describe("roster filters", () => {
	it("emits scalar company and department values and clears them", async () => {
		const wrapper = mountRoster(MonthViewHeader, { firstOfMonth: dayjs("2026-10-01") })
		await flushPromises()
		expect(wrapper.emitted("updateFilters").at(-1)[0].company).toBe("Example Company")
		const department = wrapper.get('input[aria-label="Department"]')
		await department.trigger("click")
		await department.setValue("Engineering")
		await flushPromises()
		await chooseOption("Engineering")
		expect(wrapper.emitted("updateFilters").at(-1)[0]).toMatchObject({
			company: "Example Company",
			department: "Engineering",
		})
		await wrapper.get('button[aria-label="Clear filters"]').trigger("click")
		expect(wrapper.emitted("updateFilters").at(-1)[0]).toMatchObject({
			company: "",
			department: "",
		})
	})

	it("uses employee ids from the multi-select to filter visible rows", async () => {
		const wrapper = mountRoster(MonthViewTable, {
			firstOfMonth: dayjs("2026-10-01"),
			employees: [
				{ name: "EMP-001", employee_name: "Ada Example", designation: "Engineer", image: "" },
				{ name: "EMP-002", employee_name: "Grace Example", designation: "Manager", image: "" },
			],
			employeeFilters: { company: "Example Company" },
			shiftFilters: {},
		})
		await flushPromises()
		await wrapper.getComponent(MultiSelect).get("button").trigger("click")
		await flushPromises()
		await chooseOption("EMP-001: Ada Example")
		expect(wrapper.get("tbody").text()).toContain("Ada Example")
		expect(wrapper.get("tbody").text()).not.toContain("Grace Example")
	})
})

describe("roster drag and drop", () => {
	it("keeps the source shift and date when the pointer moves to another cell", async () => {
		fetcher.mockImplementation(async ({ url }) => {
			if (url === "hrms.api.roster.get_events")
				return {
					"EMP-001": [
						{
							name: "SHIFT-001",
							shift_type: "Day Shift",
							shift_location: "Office",
							start_date: "2026-10-01",
							end_date: "2026-10-01",
							status: "Active",
							start_time: "09:00:00",
							end_time: "17:00:00",
							color: "Blue",
						},
					],
				}
			if (url === "hrms.api.roster.swap_shift") return null
			throw new Error(`Unexpected API: ${url}`)
		})
		const wrapper = mountRoster(MonthViewTable, {
			firstOfMonth: dayjs("2026-10-01"),
			employees: [
				{ name: "EMP-001", employee_name: "Ada Example", designation: "Engineer", image: "" },
				{ name: "EMP-002", employee_name: "Grace Example", designation: "Manager", image: "" },
			],
			employeeFilters: { company: "Example Company" },
			shiftFilters: {},
		})
		await flushPromises()
		const source = wrapper.get('[draggable="true"]')
		await source.trigger("mouseenter")
		await source.trigger("dragstart", { dataTransfer: { effectAllowed: "none" } })
		await source.trigger("mouseleave")
		const target = wrapper.findAll("tbody tr")[1].findAll("td")[2]
		await target.trigger("mouseenter")
		await target.trigger("dragenter")
		await target.trigger("drop")
		await source.trigger("dragend")
		await flushPromises()
		expect(fetcher).toHaveBeenCalledWith(
			expect.objectContaining({
				url: "hrms.api.roster.swap_shift",
				params: {
					src_shift: "SHIFT-001",
					src_date: "2026-10-01",
					tgt_employee: "EMP-002",
					tgt_date: "2026-10-02",
					tgt_shift: "",
				},
			})
		)
	})
})
