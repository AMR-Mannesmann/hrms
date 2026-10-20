<template>
	<ion-page>
		<div class="flex h-full flex-col sm:w-96">
			<div class="relative min-h-0 flex-1">
				<ion-router-outlet :animated="false" />
			</div>
			<BottomTabs />
		</div>
	</ion-page>
</template>

<script setup>
import { IonPage, IonRouterOutlet } from "@ionic/vue"
import BottomTabs from "@/components/BottomTabs.vue"
</script>
