import { defineConfig } from "vitest/config"
import vue from "@vitejs/plugin-vue"
import frappeui from "frappe-ui/vite"
import path from "node:path"

export default defineConfig({
	plugins: [vue(), frappeui({ frappeProxy: false, jinjaBootData: false, buildConfig: false })],
	resolve: {
		dedupe: ["vue", "vue-router", "frappe-ui"],
		alias: { "@": path.resolve(import.meta.dirname, "src") },
	},
	test: {
		environment: "happy-dom",
		include: ["tests/**/*.test.js"],
		server: { deps: { inline: ["frappe-ui"] } },
	},
})
