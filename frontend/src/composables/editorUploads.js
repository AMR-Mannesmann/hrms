import { computed, ref } from "vue"
import { call, upload } from "frappe-ui"

export const editorUploadsKey = Symbol("hrms-editor-uploads")

export class EditorUploads {
	constructor(getDocument = () => ({}), canUpload = () => true) {
		this.getDocument = getDocument
		this.canUpload = canUpload
		this.active = ref(0)
		this.busy = computed(() => this.active.value > 0)
		this.pendingFiles = new Set()
	}

	async upload(file, options = {}) {
		if (!this.canUpload())
			throw new Error("Wait for the document to finish saving before uploading files.")
		const { doctype, name } = this.getDocument()
		this.active.value++
		try {
			const result = await upload(file, {
				...options,
				private: true,
				...(name ? { doctype, docname: name } : {}),
			})
			if (!name) {
				if (!result.name) throw new Error("The uploaded file has no document ID.")
				this.pendingFiles.add(result.name)
			}
			return result
		} finally {
			this.active.value--
		}
	}

	async attachTo(doctype, name) {
		if (!this.pendingFiles.size) return
		const attachments = [...this.pendingFiles]
		this.active.value++
		try {
			for (const file of attachments) {
				// Updating the staged File is safe to retry after a lost response.
				await call("frappe.client.set_value", {
					doctype: "File",
					name: file,
					fieldname: { attached_to_doctype: doctype, attached_to_name: name },
				})
				this.pendingFiles.delete(file)
			}
		} finally {
			this.active.value--
		}
	}
}
