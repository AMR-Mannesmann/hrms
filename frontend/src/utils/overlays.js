import {
	actionSheetController,
	alertController,
	loadingController,
	modalController,
	pickerController,
	popoverController,
} from "@ionic/vue"

export async function restoreMainContentAccessibility() {
	const overlays = await Promise.all([
		actionSheetController.getTop(),
		alertController.getTop(),
		loadingController.getTop(),
		modalController.getTop(),
		pickerController.getTop(),
		popoverController.getTop(),
	])
	if (overlays.some(Boolean) || document.querySelector('[aria-modal="true"]')) return

	// Reka restores the sheet's earlier aria-hidden state after Ionic clears it.
	document.getElementById("main-content")?.removeAttribute("aria-hidden")
}
