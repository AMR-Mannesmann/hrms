import { createResource, toast } from "frappe-ui"

function getFileReader() {
	const fileReader = new FileReader()
	const zoneOriginalInstance = fileReader["__zone_symbol__originalInstance"]
	return zoneOriginalInstance || fileReader
}

export class FileAttachment {
	constructor(fileObj) {
		this.fileObj = fileObj
		this.fileName = fileObj.name
	}

	async upload(documentType, documentName, fieldName) {
		return new Promise(async (resolve, reject) => {
			const reader = getFileReader()
			const uploader = createResource({
				url: "hrms.api.upload_base64_file",
				onSuccess: (fileDoc) => resolve(fileDoc),
				onError: (error) => {
					toast.error("Error", {
						description: `File upload failed for ${this.fileName}. ${error.messages?.[0] || ""}`,
					})
					reject(error)
				},
			})

			reader.onload = () => {
				console.log("Loaded successfully ✅")
				this.fileContents = reader.result.toString().split(",")[1]

				uploader.submit({
					content: this.fileContents,
					dt: documentType,
					dn: documentName,
					filename: this.fileName,
					fieldname: fieldName,
				})
			}
			reader.readAsDataURL(this.fileObj)
		})
	}

	delete() {
		return createResource({
			url: "hrms.api.delete_attachment",
			onSuccess: () => {
				console.log("Deleted successfully ✅")
			},
			onError: (error) => {
				toast.error("Error", {
					description: `File deletion failed. ${error.messages?.[0] || ""}`,
				})
			},
		}).submit({
			filename: this.fileName,
		})
	}
}

const hasWords = (list, status) => list.some((word) => status.includes(word))

export async function guessStatusColor(doctype, status) {
	const statesResource = createResource({
		url: "hrms.api.get_doctype_states",
		params: { doctype: doctype },
	})

	const stateMap = await statesResource.reload()

	if (Object.keys(stateMap || {})?.length) {
		const theme = stateMap?.[status]
		if (["yellow", "orange"].includes(theme)) return "amber"
		if (theme === "purple") return "violet"
		if (["gray", "blue", "green", "amber", "red", "violet"].includes(theme)) return theme
	}

	let color = "gray"
	status = status.toLowerCase()

	// a draft is not final whatever else its status says
	if (hasWords(["draft"], status)) {
		return color
	} else if (hasWords(["open", "pending", "unpaid", "review", "medium", "not approved"], status)) {
		color = "amber"
	} else if (hasWords(["urgent", "high", "failed", "rejected", "error"], status)) {
		color = "red"
	} else if (
		hasWords(
			[
				"closed",
				"finished",
				"converted",
				"completed",
				"complete",
				"confirmed",
				"approved",
				"yes",
				"active",
				"available",
				"success",
			],
			status
		)
	) {
		color = "green"
	} else if (status === "submitted") {
		color = "blue"
	}

	return color
}
