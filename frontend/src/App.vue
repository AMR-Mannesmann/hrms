<template>
	<ion-app>
		<FrappeUIProvider>
			<ion-router-outlet id="main-content" />
			<InstallPrompt />
		</FrappeUIProvider>
	</ion-app>
</template>

<script setup>
import { onMounted } from "vue"
import { IonApp, IonRouterOutlet } from "@ionic/vue"

import { FrappeUIProvider } from "frappe-ui"

import InstallPrompt from "@/components/InstallPrompt.vue"
import { showNotification } from "@/utils/pushNotifications"

onMounted(() => {
	window?.frappePushNotification?.onMessage((payload) => {
		showNotification(payload)
	})
})
</script>
