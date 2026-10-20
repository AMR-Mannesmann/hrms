import { beforeEach, describe, expect, it, vi } from "vitest"
import { flushPromises, shallowMount } from "@vue/test-utils"
import { call, upload, createListResource, createResource } from "frappe-ui"
import { EditorUploads } from "../src/composables/editorUploads"
import FormView from "../src/components/FormView.vue"

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }))

vi.mock("vue-router", () => ({ useRouter: () => ({ replace, back: vi.fn() }) }))
vi.mock("frappe-ui", async (original) => ({
	...(await original()),
	call: vi.fn(),
	upload: vi.fn(),
	createListResource: vi.fn(),
	createResource: vi.fn(() => ({ data: null, reload: vi.fn() })),
	createDocumentResource: vi.fn((options) =>
		options.name ? { get: {}, setValue: {}, delete: {} } : undefined
	),
	toast: { success: vi.fn(), error: vi.fn() },
}))
vi.mock("@/components/FormField.vue", () => ({ default: { template: "<div />" } }))
vi.mock("@/components/FileUploaderView.vue", () => ({ default: { template: "<div />" } }))
vi.mock("@/components/WorkflowActionSheet.vue", () => ({ default: { template: "<div />" } }))
vi.mock("@/composables", () => ({ FileAttachment: vi.fn(), guessStatusColor: vi.fn() }))
vi.mock("@/composables/workflow", () => ({ default: vi.fn() }))
vi.mock("@/data/currencies", () => ({ getCompanyCurrency: vi.fn() }))
vi.mock("@/data/leaves", () => ({ getLeaveStatus: vi.fn() }))
vi.mock("@/utils/formatters", () => ({ formatCurrency: vi.fn() }))
vi.mock("@/utils/commonUtils", () => ({ useDownloadPDF: () => ({ downloadPDF: vi.fn() }) }))

beforeEach(() => {
	vi.clearAllMocks()
	upload.mockResolvedValue({ name: "FILE-001", file_url: "/private/files/receipt.png" })
	call.mockResolvedValue([])
})

describe("editor uploads", () => {
	it("uploads privately against an existing parent and forwards cancellation/progress", async () => {
		const uploads = new EditorUploads(() => ({ doctype: "Expense Claim", name: "CLAIM-001" }))
		const file = new File(["receipt"], "receipt.png", { type: "image/png" })
		const signal = new AbortController().signal
		const onProgress = vi.fn()
		await uploads.upload(file, { signal, onProgress, private: false })
		expect(upload).toHaveBeenCalledWith(file, {
			doctype: "Expense Claim",
			docname: "CLAIM-001",
			private: true,
			signal,
			onProgress,
		})
		await uploads.attachTo("Expense Claim", "CLAIM-001")
		expect(call).not.toHaveBeenCalled()
	})

	it("stages private files until the new parent exists and attaches them once", async () => {
		let name
		const uploads = new EditorUploads(() => ({ doctype: "Expense Claim", name }))
		await uploads.upload(new File(["pdf"], "receipt.pdf"))
		expect(upload).toHaveBeenCalledWith(expect.any(File), { private: true })
		expect(call).not.toHaveBeenCalled()
		name = "CLAIM-001"
		const attachment = uploads.attachTo("Expense Claim", name)
		expect(uploads.busy.value).toBe(true)
		await attachment
		expect(uploads.busy.value).toBe(false)
		expect(call).toHaveBeenCalledWith("frappe.client.set_value", {
			doctype: "File",
			name: "FILE-001",
			fieldname: { attached_to_doctype: "Expense Claim", attached_to_name: name },
		})
		await uploads.attachTo("Expense Claim", name)
		expect(call).toHaveBeenCalledOnce()
		await uploads.upload(new File(["video"], "receipt.mp4"))
		expect(upload).toHaveBeenLastCalledWith(expect.any(File), {
			private: true,
			doctype: "Expense Claim",
			docname: name,
		})
	})

	it("stays busy until concurrent uploads finish and clears busy after errors", async () => {
		let resolveFirst
		let rejectSecond
		upload.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					resolveFirst = resolve
				})
		)
		upload.mockImplementationOnce(
			() =>
				new Promise((_, reject) => {
					rejectSecond = reject
				})
		)
		const uploads = new EditorUploads()
		const first = uploads.upload(new File(["1"], "one.png"))
		const second = uploads.upload(new File(["2"], "two.png"))
		expect(uploads.busy.value).toBe(true)
		resolveFirst({ name: "FILE-001", file_url: "/private/files/one.png" })
		await first
		expect(uploads.busy.value).toBe(true)
		rejectSecond(new Error("Upload failed"))
		await expect(second).rejects.toThrow("Upload failed")
		expect(uploads.busy.value).toBe(false)
		await uploads.attachTo("Expense Claim", "CLAIM-001")
		expect(call.mock.calls[0][1].name).toBe("FILE-001")
	})

	it("retains staged files after an association failure for a later retry", async () => {
		const uploads = new EditorUploads()
		await uploads.upload(new File(["receipt"], "receipt.png"))
		call.mockRejectedValueOnce(new Error("Connection lost"))
		await expect(uploads.attachTo("Expense Claim", "CLAIM-001")).rejects.toThrow("Connection lost")
		expect(uploads.busy.value).toBe(false)
		await uploads.attachTo("Expense Claim", "CLAIM-001")
		expect(call).toHaveBeenCalledTimes(2)
		expect(call.mock.calls[1][1]).toEqual(call.mock.calls[0][1])
		expect(call.mock.calls[1][1].name).toBe("FILE-001")
	})

	it("rejects file-picker callbacks when the document is already saving", async () => {
		const uploads = new EditorUploads(
			() => ({}),
			() => false
		)
		await expect(uploads.upload(new File(["image"], "late.png"))).rejects.toThrow("finish saving")
		expect(upload).not.toHaveBeenCalled()
		expect(uploads.busy.value).toBe(false)
	})
})

describe("new form attachment retries", () => {
	it("keeps saved file metadata available to the attachment list", async () => {
		createListResource.mockReturnValue({ insert: {} })
		const wrapper = shallowMount(FormView, {
			props: { doctype: "Expense Claim", modelValue: {}, fields: [] },
			global: { provide: { $translate: (text) => text }, stubs: { Button: true } },
		})
		const attachmentOptions = createResource.mock.calls.find(
			([options]) => options.url === "hrms.api.get_attachments"
		)[0]
		const record = {
			name: "FILE-001",
			file_name: "receipt.pdf",
			file_url: "/private/files/receipt.pdf",
		}
		attachmentOptions.onSuccess([record])
		const files = wrapper.vm.fileAttachments
		const { default: FileUploaderView } = await vi.importActual(
			"@/components/FileUploaderView.vue"
		)
		const list = shallowMount(FileUploaderView, {
			props: { modelValue: files },
			global: { mocks: { __: (text) => text } },
		})
		expect(list.text()).toContain("receipt.pdf")
		expect(files[0]).toMatchObject({ ...record, uploaded: true })
		expect(record).not.toHaveProperty("uploaded")
		list.unmount()
		wrapper.unmount()
	})

	it("reuses the inserted document when attaching editor files fails", async () => {
		const doc = { doctype: "Expense Claim", name: "CLAIM-001" }
		const insert = vi.fn()
		createListResource.mockImplementation((options) => ({
			insert: {
				submit: insert.mockImplementation(async () => {
					options.insert.onSuccess(doc)
					return doc
				}),
			},
		}))
		const wrapper = shallowMount(FormView, {
			props: { doctype: "Expense Claim", modelValue: {}, fields: [] },
			global: { provide: { $translate: (text) => text }, stubs: { Button: true } },
		})
		let finishUpload
		upload.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					finishUpload = resolve
				})
		)
		const uploading = wrapper.vm.editorUploads.upload(new File(["receipt"], "receipt.png"))
		await wrapper.vm.handleDocInsert()
		expect(insert).not.toHaveBeenCalled()
		finishUpload({ name: "FILE-001", file_url: "/private/files/receipt.png" })
		await uploading
		call.mockRejectedValueOnce(new Error("Connection lost"))
		await wrapper.vm.handleDocInsert()
		expect(insert).toHaveBeenCalledOnce()
		expect(replace).not.toHaveBeenCalled()
		expect(wrapper.vm.isFormReadOnly).toBe(true)
		expect(wrapper.vm.formErrorMessage).toContain("Retry Attachments")
		await wrapper.vm.handleDocInsert()
		await flushPromises()
		expect(insert).toHaveBeenCalledOnce()
		expect(call).toHaveBeenCalledTimes(2)
		expect(replace).toHaveBeenCalledWith({
			name: "ExpenseClaimDetailView",
			params: { id: "CLAIM-001" },
		})
		wrapper.unmount()
	})
})
