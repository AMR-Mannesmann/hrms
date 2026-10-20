<template>
	<ion-modal
		ref="modal"
		:trigger="trigger"
		:initial-breakpoint="1"
		:breakpoints="[0, 1]"
		:backdrop-breakpoint="1"
		:is-open="isOpen"
		@willPresent="showModalBackdrop = true"
		@willDismiss="showModalBackdrop = false"
		@didDismiss="handleDismiss"
	>
		<slot name="actionSheet"></slot>
		<div ref="portalTarget" class="contents" />
	</ion-modal>

	<!-- backdrop -->
	<div
		v-if="showModalBackdrop"
		class="fixed inset-0 z-[10000] !mt-0 bg-black opacity-30 cursor-pointer"
		@click="() => modalController.dismiss()"
	></div>
</template>

<script setup>
/**
 * Problem: ion-modal traps focus inside the modal making controls like autocomplete unusable inside it
 * @see https://github.com/ionic-team/ionic-framework/issues/24646
 * This custom ion-modal disables backdrop using backdrop-breakpoint=1 and we add a custom backdrop
 */
import { nextTick, ref } from "vue"
import { IonModal, modalController } from "@ionic/vue"
import { providePortalTarget } from "frappe-ui"
import { restoreMainContentAccessibility } from "@/utils/overlays"

const props = defineProps({
	trigger: {
		type: String,
		required: false,
	},
	isOpen: {
		type: Boolean,
		required: false,
	},
})
const emit = defineEmits(["did-dismiss"])
const showModalBackdrop = ref(false)
// Keep pickers and dialogs above the sheet, within its stacking context.
const portalTarget = ref()
providePortalTarget(portalTarget)

async function handleDismiss() {
	emit("did-dismiss")
	await nextTick()
	await restoreMainContentAccessibility()
}
</script>
