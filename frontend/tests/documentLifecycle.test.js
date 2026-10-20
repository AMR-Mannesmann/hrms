import { beforeEach, describe, expect, it, vi } from "vitest"
import { flushPromises, shallowMount } from "@vue/test-utils"
import { nextTick, reactive } from "vue"
import { call, createDocumentResource, toast, upload } from "frappe-ui"
import { FileAttachment } from "@/composables"
import FormField from "../src/components/FormField.vue"
import FileUploaderView from "../src/components/FileUploaderView.vue"
import FormView from "../src/components/FormView.vue"
import { updateDocumentLifecycle } from "../src/composables/documentLifecycle"

vi.mock("vue-router", () => ({ useRouter: () => ({ back: vi.fn() }) }))
vi.mock("frappe-ui", async (original) => ({
	...(await original()),
	call: vi.fn(),
	upload: vi.fn(),
	toast: { success: vi.fn(), error: vi.fn() },
	createDocumentResource: vi.fn(),
	createListResource: vi.fn(() => ({})),
	createResource: vi.fn(() => ({ reload: vi.fn() })),
}))
vi.mock("@/components/FormField.vue", () => ({
	default: { props: ["readOnly"], template: "<div />" },
}))
vi.mock("@/components/FileUploaderView.vue", () => ({ default: { template: "<div />" } }))
vi.mock("@/components/WorkflowActionSheet.vue", () => ({ default: { template: "<div />" } }))
vi.mock("@/composables", () => ({ FileAttachment: vi.fn(), guessStatusColor: vi.fn() }))
vi.mock("@/composables/workflow", () => ({ default: vi.fn() }))
vi.mock("@/data/currencies", () => ({ getCompanyCurrency: vi.fn() }))
vi.mock("@/data/leaves", () => ({ getLeaveStatus: vi.fn() }))
vi.mock("@/utils/formatters", () => ({ formatCurrency: vi.fn() }))
vi.mock("@/utils/commonUtils", () => ({ useDownloadPDF: () => ({ downloadPDF: vi.fn() }) }))

beforeEach(() => vi.clearAllMocks())
const doc = { doctype: "Attendance Request", name: "ATT-001", employee: "EMP-001", docstatus: 0 }

function mountForm(model = doc, overrides = {}) {
	const resource = reactive({
		doc,
		originalDoc: structuredClone(doc),
		get: {},
		reload: vi.fn(),
		setValue: { submit: vi.fn() },
		delete: {},
		...overrides,
	})
	createDocumentResource.mockReturnValue(resource)
	const wrapper = shallowMount(FormView, {
		props: {
			doctype: doc.doctype,
			modelValue: model,
			fields: [{ fieldname: "explanation" }],
			showAttachmentView: true,
		},
		global: {
			provide: { $translate: (text) => text },
			stubs: {
				Button: {
					props: ["disabled", "loading"],
					template: '<button :disabled="disabled || loading"><slot /></button>',
				},
				Dialog: { props: ["open"], template: '<div v-if="open"><slot name="actions" /></div>' },
			},
		},
	})
	return { resource, wrapper }
}

describe("document lifecycle", () => {
	it("submits through the standard API without changing the loaded document", async () => {
		await updateDocumentLifecycle(doc, "submit")
		expect(call).toHaveBeenCalledWith("frappe.client.submit", { doc })
		expect(doc.docstatus).toBe(0)
	})
	it("cancels through the permission-checked cancel API", async () => {
		await updateDocumentLifecycle(doc, "cancel")
		expect(call).toHaveBeenCalledWith("frappe.client.cancel", {
			doctype: doc.doctype,
			name: doc.name,
		})
	})
	it("propagates server permission failures without changing local status", async () => {
		call.mockRejectedValueOnce(new Error("Not permitted"))
		await expect(updateDocumentLifecycle(doc, "submit")).rejects.toThrow("Not permitted")
		expect(doc.docstatus).toBe(0)
	})
	it.each(["submit", "cancel"])(
		"reloads after %s without saving a changed session employee",
		async (action) => {
			const { resource, wrapper } = mountForm({ ...doc, employee: "MANAGER-001" })
			await wrapper.vm.handleDocUpdate(action)
			expect(call).toHaveBeenCalledWith(
				`frappe.client.${action}`,
				action === "submit" ? { doc } : { doctype: doc.doctype, name: doc.name }
			)
			expect(resource.reload).toHaveBeenCalledOnce()
			expect(resource.setValue.submit).not.toHaveBeenCalled()
			wrapper.unmount()
		}
	)
	it("keeps ordinary edits on set_value", async () => {
		const { resource, wrapper } = mountForm({ ...doc, explanation: "Updated reason" })
		await wrapper.vm.handleDocUpdate()
		expect(resource.setValue.submit).toHaveBeenCalledWith(
			expect.objectContaining({ explanation: "Updated reason" })
		)
		expect(call).not.toHaveBeenCalled()
		wrapper.unmount()
	})
})

function deferred() {
	let resolve, reject
	const promise = new Promise((done, fail) => {
		resolve = done
		reject = fail
	})
	return { promise, resolve, reject }
}

describe("form lifecycle guards", () => {
	it("submits the saved expense snapshot without unselected advance rows", async () => {
		const saved = {
			doctype: "Expense Claim",
			name: "CLAIM-001",
			employee: "EMP-001",
			advances: [],
		}
		const polluted = { ...saved, advances: [{ employee_advance: "ADV-001", allocated_amount: 0 }] }
		const { wrapper } = mountForm(polluted, { originalDoc: saved, doc: polluted })
		await wrapper.vm.handleDocUpdate("submit")
		expect(call).toHaveBeenCalledWith("frappe.client.submit", { doc: saved })
		wrapper.unmount()
	})
	it("does not fall back to the mutable document when the saved snapshot is missing", async () => {
		const { wrapper } = mountForm(doc, { originalDoc: undefined })
		await wrapper.vm.handleDocUpdate("submit")
		expect(call).not.toHaveBeenCalled()
		expect(wrapper.vm.formErrorMessage).toContain("Reload before continuing")
		expect(wrapper.vm.isUpdatingDocument).toBe(false)
		wrapper.unmount()
	})
	it.each(["submit", "cancel"])(
		"locks edits and uploads through the %s request and reload",
		async (action) => {
			const request = deferred(),
				reload = deferred()
			call.mockReturnValueOnce(request.promise)
			const { wrapper, resource } = mountForm(doc, { reload: vi.fn(() => reload.promise) })
			wrapper.vm.showSubmitDialog = true
			const pending = wrapper.vm.handleDocUpdate(action)
			await nextTick()
			await wrapper.vm.handleDocUpdate(action)
			expect(call).toHaveBeenCalledOnce()
			for (const phase of ["request", "reload"]) {
				expect(wrapper.vm.isUpdatingDocument).toBe(true)
				expect(wrapper.vm.isFormReadOnly).toBe(true)
				expect(wrapper.findComponent(FormField).props("readOnly")).toBe(true)
				expect(wrapper.findComponent(FileUploaderView).attributes("inert")).toBeDefined()
				const confirmation = wrapper.findAll("button").find((button) => button.text() === "Yes")
				expect(confirmation.attributes("disabled")).toBeDefined()
				await expect(wrapper.vm.editorUploads.upload(new File(["x"], "late.png"))).rejects.toThrow(
					"finish saving"
				)
				await wrapper.vm.handleFileSelect({
					target: { files: [new File(["x"], "attachment.pdf")] },
				})
				await wrapper.vm.handleFileDelete({ uploaded: true })
				expect(upload).not.toHaveBeenCalled()
				expect(FileAttachment).not.toHaveBeenCalled()
				if (phase === "request") {
					request.resolve()
					await flushPromises()
				}
			}
			expect(resource.reload).toHaveBeenCalledOnce()
			reload.resolve()
			await pending
			expect(wrapper.vm.isUpdatingDocument).toBe(false)
			expect(wrapper.vm.isFormReadOnly).toBe(false)
			wrapper.unmount()
		}
	)
	it.each(["request", "reload"])(
		"unlocks after a %s failure and clears the error on retry",
		async (phase) => {
			const request = deferred()
			const { wrapper } = mountForm(doc, {
				reload: vi.fn(phase === "reload" ? () => request.promise : () => Promise.resolve()),
			})
			if (phase === "request") call.mockReturnValueOnce(request.promise)
			const pending = wrapper.vm.handleDocUpdate("submit")
			await flushPromises()
			request.reject(new Error("Not permitted"))
			await pending
			expect(wrapper.vm.isUpdatingDocument).toBe(false)
			expect(wrapper.vm.isFormReadOnly).toBe(false)
			expect(wrapper.vm.formErrorMessage).toBe("Not permitted")
			expect(toast.error).toHaveBeenCalledWith("Error", { description: "Not permitted" })
			wrapper.vm.documentResource.reload.mockResolvedValue()
			await wrapper.vm.handleDocUpdate("submit")
			expect(wrapper.vm.formErrorMessage).toBe("")
			wrapper.unmount()
		}
	)
})
