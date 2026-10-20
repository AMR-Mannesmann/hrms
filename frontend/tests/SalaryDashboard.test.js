import { afterEach, describe, expect, it, vi } from "vitest"
import { flushPromises, mount } from "@vue/test-utils"
import { setConfig } from "frappe-ui"
import dayjs from "dayjs"
import Dashboard from "../src/views/salary_slip/Dashboard.vue"

vi.mock("@/components/BaseLayout.vue", () => ({
	default: { template: '<main><slot name="body" /></main>' },
}))
vi.mock("@/components/SalarySlipItem.vue", () => ({
	default: { props: ["doc"], template: "<div>{{ doc.name }}</div>" },
}))

afterEach(() => setConfig("resourceFetcher", undefined))

describe("salary dashboard", () => {
	it("renders while payroll periods load and filters slips after the selected period arrives", async () => {
		let loadPeriods
		const fetcher = vi.fn(({ params }) => {
			if (params.doctype === "Payroll Period") {
				return new Promise((resolve) => {
					loadPeriods = resolve
				})
			}
			return Promise.resolve([{ name: "SAL-001", currency: "USD", year_to_date: 6000 }])
		})
		setConfig("resourceFetcher", fetcher)
		const wrapper = mount(Dashboard, {
			global: {
				mocks: { __: (text) => text },
				stubs: { RouterLink: { template: '<a><slot :navigate="() => {}" /></a>' } },
				provide: {
					$translate: (text) => text,
					$employee: { data: { name: "EMP-001", company: "Example Company" } },
					$dayjs: dayjs,
					$socket: { on: vi.fn(), off: vi.fn() },
				},
			},
		})
		expect(wrapper.get('input[role="combobox"]').element.value).toBe("")
		loadPeriods([{ name: "2026", start_date: "2026-01-01", end_date: "2026-12-31" }])
		await flushPromises()
		expect(wrapper.get('input[role="combobox"]').element.value).toBe("Jan 2026 - Dec 2026")
		expect(wrapper.text()).toContain("SAL-001")
		expect(fetcher).toHaveBeenLastCalledWith(
			expect.objectContaining({
				params: expect.objectContaining({
					doctype: "Salary Slip",
					filters: {
						employee: "EMP-001",
						docstatus: 1,
						start_date: ["between", ["2026-01-01", "2026-12-31"]],
					},
				}),
			})
		)
		wrapper.unmount()
	})
})
