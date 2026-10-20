import { beforeEach, describe, expect, it, vi } from "vitest"
import { flushPromises, shallowMount } from "@vue/test-utils"
import { nextTick, reactive } from "vue"
import { call, createDocumentResource, toast } from "frappe-ui"
import { modalController } from "@ionic/vue"
import RequestActionSheet from "../src/components/RequestActionSheet.vue"

vi.mock("vue-router", () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock("@ionic/vue", () => ({
	IonModal: { template: "<div />" },
	modalController: { dismiss: vi.fn() },
}))
vi.mock("frappe-ui", async (original) => ({
	...(await original()),
	call: vi.fn(),
	createDocumentResource: vi.fn(),
	toast: { success: vi.fn(), error: vi.fn() },
	createResource: vi.fn(({ url }) => ({
		data: url.endsWith("get_doc_permissions")
			? { permissions: { submit: true, cancel: true } }
			: url.endsWith("get_permitted_fields_for_write")
			? ["status"]
			: [],
		reload: vi.fn(),
	})),
}))
vi.mock("@/components/FormattedField.vue", () => ({ default: { template: "<div />" } }))
vi.mock("@/components/FilePreviewModal.vue", () => ({ default: { template: "<div />" } }))
vi.mock("@/components/WorkflowActionSheet.vue", () => ({ default: { template: "<div />" } }))
vi.mock("@/composables/workflow", () => ({ default: () => ({ hasWorkflow: false }) }))
vi.mock("@/data/currencies", () => ({ getCompanyCurrency: vi.fn() }))
vi.mock("@/data/leaves", () => ({ getLeaveStatus: vi.fn() }))
vi.mock("@/data/settings", () => ({ settings: { data: {} } }))
vi.mock("@/utils/formatters", () => ({ formatCurrency: vi.fn() }))

beforeEach(() => vi.clearAllMocks())
const doc = {
	doctype: "Shift Request",
	name: "SHIFT-001",
	employee: "EMP-001",
	status: "Draft",
	docstatus: 0,
}

function mountSheet(overrides = {}) {
	const resource = reactive({
		doc: { ...doc },
		originalDoc: { ...doc },
		setValue: { submit: vi.fn() },
		reload: vi.fn(),
		...overrides,
	})
	createDocumentResource.mockReturnValue(resource)
	const wrapper = shallowMount(RequestActionSheet, {
		props: { modelValue: resource.doc, fields: [] },
		global: {
			provide: { $translate: (text) => text, $employee: { data: { name: "MANAGER-001" } } },
			stubs: {
				Button: {
					props: ["disabled"],
					template: '<button :disabled="disabled"><slot /></button>',
				},
			},
		},
	})
	return { wrapper, resource }
}

function deferred() {
	let resolve, reject
	const promise = new Promise((done, fail) => {
		resolve = done
		reject = fail
	})
	return { promise, resolve, reject }
}

describe("request sheet actions", () => {
	it("submits the saved snapshot without client-only unselected advances", async () => {
		const originalDoc = { ...doc, doctype: "Expense Claim", advances: [] }
		const { wrapper } = mountSheet({
			originalDoc,
			doc: { ...originalDoc, advances: [{ allocated_amount: 0 }] },
		})
		await wrapper.vm.updateDocumentStatus({ docstatus: 1 })
		expect(call).toHaveBeenCalledWith("frappe.client.submit", { doc: originalDoc })
		wrapper.unmount()
	})
	it("does not submit a mutable document if its saved snapshot is missing", async () => {
		const { wrapper } = mountSheet({ originalDoc: undefined })
		await wrapper.vm.updateDocumentStatus({ docstatus: 1 })
		expect(call).not.toHaveBeenCalled()
		expect(toast.error).toHaveBeenCalledWith("Error", {
			description: expect.stringContaining("Reload before continuing"),
		})
		expect(wrapper.vm.isUpdatingDocument).toBe(false)
		wrapper.unmount()
	})
	it.each(["approve", "submit", "cancel"])(
		"accepts one %s click and disables actions until reload finishes",
		async (action) => {
			const request = deferred(),
				reload = deferred()
			const params =
				action === "approve" ? { status: "Approved" } : { docstatus: action === "submit" ? 1 : 2 }
			const { wrapper, resource } = mountSheet({ reload: vi.fn(() => reload.promise) })
			if (action === "approve") resource.setValue.submit.mockReturnValueOnce(request.promise)
			else call.mockReturnValueOnce(request.promise)
			const pending = wrapper.vm.updateDocumentStatus(params)
			await wrapper.vm.updateDocumentStatus(params)
			await nextTick()
			expect(action === "approve" ? resource.setValue.submit : call).toHaveBeenCalledOnce()
			for (const phase of ["request", "reload"]) {
				expect(wrapper.vm.isUpdatingDocument).toBe(true)
				for (const button of wrapper.findAll("button"))
					expect(button.attributes("disabled")).toBeDefined()
				wrapper.vm.openFormView()
				expect(modalController.dismiss).not.toHaveBeenCalled()
				if (phase === "request") {
					request.resolve()
					await flushPromises()
				}
			}
			reload.resolve()
			await pending
			expect(wrapper.vm.isUpdatingDocument).toBe(false)
			wrapper.unmount()
		}
	)
	it.each(["request", "reload"])(
		"unlocks after a %s failure and permits a retry",
		async (phase) => {
			const failure = deferred()
			const { wrapper, resource } = mountSheet()
			if (phase === "request") call.mockReturnValueOnce(failure.promise)
			else resource.reload.mockReturnValueOnce(failure.promise)
			const pending = wrapper.vm.updateDocumentStatus({ docstatus: 1 })
			await flushPromises()
			failure.reject(new Error("Not permitted"))
			await pending
			expect(wrapper.vm.isUpdatingDocument).toBe(false)
			expect(toast.error).toHaveBeenCalledWith("Error", { description: "Not permitted" })
			await wrapper.vm.updateDocumentStatus({ docstatus: 1 })
			expect(call).toHaveBeenCalledTimes(2)
			expect(toast.success).toHaveBeenCalledOnce()
			wrapper.unmount()
		}
	)
})

describe("expense approval permissions", () => {
	it.each([
		[true, ["approval_status"], true],
		[false, ["approval_status"], false],
		[true, [], false],
	])("requires document write=%s and approval field permission=%j", (write, fields, allowed) => {
		const { wrapper } = mountSheet({
			doc: { ...doc, doctype: "Expense Claim", approval_status: "Draft" },
		})
		wrapper.vm.docPermissions.data = { permissions: { write } }
		wrapper.vm.permittedWriteFields.data = fields
		expect(Boolean(wrapper.vm.hasPermission("approval"))).toBe(allowed)
		wrapper.unmount()
	})
})
