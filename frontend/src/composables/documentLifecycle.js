import { call } from "frappe-ui"

export async function updateDocumentLifecycle(doc, action) {
	if (!doc?.doctype || !doc?.name) {
		throw new Error("The saved document is unavailable. Reload before continuing.")
	}
	if (action === "submit") {
		return call("frappe.client.submit", { doc })
	}
	if (action === "cancel") {
		return call("frappe.client.cancel", { doctype: doc.doctype, name: doc.name })
	}
	throw new Error(`Unsupported document action: ${action}`)
}
