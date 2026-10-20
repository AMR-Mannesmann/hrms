export function devBoot() {
	return {
		name: "hrms-dev-boot",
		transformIndexHtml(html, context) {
			// Frappe renders this script in production. Vite loads boot data from the API.
			if (context.server) {
				return html.replace(/<script id="hrms-boot">[\s\S]*?<\/script>/, "")
			}
			return html
		},
	}
}
