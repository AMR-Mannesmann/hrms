import { describe, expect, it, vi } from "vitest"
import { shallowMount } from "@vue/test-utils"
import ShiftRequestForm from "../src/views/attendance/ShiftRequestForm.vue"
import AttendanceRequestForm from "../src/views/attendance/AttendanceRequestForm.vue"

vi.mock("@ionic/vue", () => ({
	IonPage: { template: "<div><slot /></div>" },
	IonContent: { template: "<div><slot /></div>" },
}))
vi.mock("frappe-ui", () => ({
	createResource: () => ({ data: [{ fieldname: "from_date" }] }),
}))
vi.mock("@/components/FormView.vue", () => ({ default: { template: "<div />" } }))

function mountRequest(component, id) {
	return shallowMount(component, {
		props: { id },
		global: {
			provide: {
				$employee: { data: { name: "MANAGER-001", user_id: "manager@example.com" } },
				$translate: (text) => text,
			},
		},
	})
}

describe.each([
	["Shift Request", ShiftRequestForm, "shiftRequest"],
	["Attendance Request", AttendanceRequestForm, "attendanceRequest"],
])("%s employee", (name, component, model) => {
	it("initializes new requests from the session employee", () => {
		const wrapper = mountRequest(component)
		wrapper.vm.validateForm()
		expect(wrapper.vm[model].employee).toBe("MANAGER-001")
		wrapper.unmount()
	})
	it("preserves an existing employee when the manager saves", () => {
		const wrapper = mountRequest(component, "REQUEST-001")
		wrapper.vm[model].employee = "EMPLOYEE-001"
		wrapper.vm.validateForm()
		expect(wrapper.vm[model].employee).toBe("EMPLOYEE-001")
		wrapper.unmount()
	})
})

it("translates invalid shift dates without throwing", () => {
	const wrapper = mountRequest(ShiftRequestForm)
	expect(() => wrapper.vm.validateDates("2026-12-14", "2026-12-13")).not.toThrow()
	expect(wrapper.vm.formFields.data[0].error_message).toBe("To Date cannot be before From Date")
	wrapper.unmount()
})
