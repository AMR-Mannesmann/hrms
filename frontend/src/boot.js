import { frappeRequest } from "frappe-ui"

export async function loadBootData() {
	if (!import.meta.env.DEV) return
	const boot = await frappeRequest({
		url: "/api/method/hrms.www.hrms.get_context_for_dev",
		method: "GET",
	})
	if (!window.frappe) window.frappe = {}
	window.frappe.boot = boot
	window.site_name = boot.site_name
	window.csrf_token = boot.csrf_token
}
