import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import { VitePWA } from "vite-plugin-pwa"
import frappeui from "frappe-ui/vite"

import path from "path"
import { devBoot } from "./vite/devBoot.js"

export default defineConfig({
	server: {
		port: 8080,
		allowedHosts: true,
	},
	plugins: [
		vue(),
		devBoot(),
		frappeui({
			frontendRoute: "/hrms",
			frappeProxy: { port: 8080 },
			jinjaBootData: false,
			buildConfig: false,
		}),
		VitePWA({
			registerType: "autoUpdate",
			strategies: "injectManifest",
			injectRegister: null,
			devOptions: {
				enabled: true,
			},
			manifest: {
				display: "standalone",
				name: "Frappe HR",
				short_name: "Frappe HR",
				start_url: "/hrms",
				scope: "/hrms",
				id: "/hrms",
				description: "Everyday HR & Payroll operations at your fingertips",
				theme_color: "#ffffff",
				icons: [
					{
						src: "/assets/hrms/manifest/manifest-icon-192.maskable.png",
						sizes: "192x192",
						type: "image/png",
						purpose: "any",
					},
					{
						src: "/assets/hrms/manifest/manifest-icon-192.maskable.png",
						sizes: "192x192",
						type: "image/png",
						purpose: "maskable",
					},
					{
						src: "/assets/hrms/manifest/manifest-icon-512.maskable.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "any",
					},
					{
						src: "/assets/hrms/manifest/manifest-icon-512.maskable.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "maskable",
					},
				],
			},
		}),
	],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},
	build: {
		outDir: "../hrms/public/frontend",
		emptyOutDir: true,
		target: "es2015",
		commonjsOptions: {
			include: [/tailwind.config.js/, /node_modules/],
		},
		sourcemap: true,
		rollupOptions: {
			output: {
				manualChunks: {
					"frappe-ui": ["frappe-ui"],
				},
			},
		},
	},
	optimizeDeps: {
		// The editor's extensionless package imports need Vite's resolver.
		exclude: ["frappe-ui/editor"],
	},
})
