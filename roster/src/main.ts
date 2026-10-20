import "./index.css";

import { createApp } from "vue";
import router from "./router";
import App from "./App.vue";

import { Button, setConfig, frappeRequest, resourcesPlugin } from "frappe-ui";

async function initializeApp() {
	if (import.meta.env.DEV) {
		const boot = (await frappeRequest({
			url: "/api/method/hrms.www.hrms.get_context_for_dev",
			method: "GET",
		})) as { site_name: string; csrf_token: string };
		Object.assign(window, {
			frappe: { boot },
			site_name: boot.site_name,
			csrf_token: boot.csrf_token,
		});
	}

	const app = createApp(App);
	setConfig("resourceFetcher", frappeRequest);
	app.use(router);
	app.use(resourcesPlugin);
	app.component("Button", Button);
	app.mount("#app");
}

initializeApp();
