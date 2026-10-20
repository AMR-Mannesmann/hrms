import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import frappeui from "frappe-ui/vite";
import path from "path";

export default defineConfig({
	plugins: [
		vue(),
		{
			name: "roster-dev-boot",
			transformIndexHtml(html, context) {
				return context.server
					? html.replace(/<script id="roster-boot">[\s\S]*?<\/script>/, "")
					: html;
			},
		},
		frappeui({
			frontendRoute: "/hr/roster",
			frappeProxy: { port: 8081 },
			jinjaBootData: false,
			buildConfig: false,
		}),
	],
	server: {
		port: 8081,
		allowedHosts: true,
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},
	build: {
		outDir: "../hrms/public/roster",
		emptyOutDir: true,
		target: "es2015",
		commonjsOptions: {
			include: [/tailwind.config.js/, /node_modules/],
		},
	},
});
