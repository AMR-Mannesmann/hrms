import { describe, expect, it, vi } from "vitest"
import { flushPromises, mount } from "@vue/test-utils"
import { reactive } from "vue"
import Profile from "../src/views/Profile.vue"

let employeeDoc
let employeeFields

vi.mock("@ionic/vue", () => ({
	IonPage: { template: "<div><slot /></div>" },
	IonContent: { template: "<div><slot /></div>" },
	IonModal: { template: "<div><slot /></div>" },
}))
vi.mock("vue-router", () => ({ useRouter: () => ({ back: vi.fn() }) }))
vi.mock("frappe-ui", async (original) => ({
	...(await original()),
	createDocumentResource: () => employeeDoc,
	createResource: (options) =>
		options.url === "hrms.api.get_doctype_fields" ? employeeFields : { data: null },
}))
vi.mock("@/data/notifications", () => ({ arePushNotificationsEnabled: { data: false } }))
vi.mock("@/utils/formatters", () => ({ formatCurrency: (value) => value }))
vi.mock("@/utils/dialogs", () => ({ showErrorAlert: vi.fn() }))
vi.mock("@/components/ProfileInfoModal.vue", () => ({
	default: {
		props: ["data", "title"],
		template: '<div data-test="employee-details">{{ data[0].value }}</div>',
	},
}))

describe("profile information", () => {
	it("waits for the full employee record and field metadata after an immediate click", async () => {
		employeeDoc = reactive({ doc: null })
		employeeFields = reactive({ data: null })
		const wrapper = mount(Profile, {
			global: {
				stubs: { RouterLink: true, Button: true },
				provide: {
					$socket: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
					$session: {},
					$user: { data: { first_name: "Alex" } },
					$employee: { data: { name: "EMP-001", employee_name: "Alex Rivera" } },
					$translate: (text) => text,
				},
			},
		})
		const link = wrapper
			.findAll(".cursor-pointer")
			.find((item) => item.text() === "Employee Details")
		await link.trigger("click")
		expect(wrapper.text()).toContain("Loading...")
		expect(wrapper.find('[data-test="employee-details"]').exists()).toBe(false)
		employeeDoc.doc = { name: "EMP-001", employee_name: "Alex Rivera" }
		employeeFields.data = [
			{ fieldname: "employee_name", label: "Employee Name", fieldtype: "Data" },
		]
		await flushPromises()
		expect(wrapper.get('[data-test="employee-details"]').text()).toBe("Alex Rivera")
		wrapper.unmount()
	})
})
