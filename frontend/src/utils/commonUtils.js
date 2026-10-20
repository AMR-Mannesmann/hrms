import { toast } from "frappe-ui"
import { __ } from "@/plugins/translationsPlugin"

export function useDownloadPDF() {
	async function downloadPDF({ doctype, docname, filename = null }) {
		const headers = {
			"X-Frappe-Site-Name": window.location.hostname,
		}
		if (window.csrf_token) {
			headers["X-Frappe-CSRF-Token"] = window.csrf_token
		}

		fetch("/api/method/hrms.api._download_pdf", {
			method: "POST",
			headers,
			body: new URLSearchParams({ doctype: doctype, docname: docname }),
			responseType: "blob",
		})
			.then((response) => {
				if (response.ok) {
					return response.blob()
				} else {
					toast.error(__("Download Failed"), {
						description: __("Error downloading PDF"),
						position: "bottom-center",
					})
				}
			})
			.then((blob) => {
				if (!blob) return
				const blobUrl = window.URL.createObjectURL(blob)
				const link = document.createElement("a")
				link.href = blobUrl
				link.download = `${filename || docname}.pdf`
				link.click()
				setTimeout(() => {
					window.URL.revokeObjectURL(blobUrl)
				}, 3000)
			})
			.catch((error) => {
				toast.error(__("Error"), {
					description: __("Error downloading PDF", [__(error)]),
					position: "bottom-center",
				})
			})
	}

	return {
		downloadPDF,
	}
}
