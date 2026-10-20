import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { restoreMainContentAccessibility } from "../src/utils/overlays"

const { getTop } = vi.hoisted(() => ({ getTop: vi.fn() }))
vi.mock("@ionic/vue", () => ({
	actionSheetController: { getTop },
	alertController: { getTop },
	loadingController: { getTop },
	modalController: { getTop },
	pickerController: { getTop },
	popoverController: { getTop },
}))

beforeEach(() => {
	getTop.mockReset().mockResolvedValue(undefined)
	document.body.innerHTML = '<main id="main-content" aria-hidden="true">Employee requests</main>'
})
afterEach(() => {
	document.body.innerHTML = ""
})

describe("nested sheet accessibility", () => {
	it("exposes the page again after all nested overlays have closed", async () => {
		await restoreMainContentAccessibility()
		expect(document.getElementById("main-content").hasAttribute("aria-hidden")).toBe(false)
	})

	it("keeps the page hidden while another Ionic overlay remains open", async () => {
		getTop.mockResolvedValueOnce({ presented: true })
		await restoreMainContentAccessibility()
		expect(document.getElementById("main-content").getAttribute("aria-hidden")).toBe("true")
	})

	it("keeps the page hidden while another modal dialog remains open", async () => {
		document.body.insertAdjacentHTML("beforeend", '<div role="dialog" aria-modal="true" />')
		await restoreMainContentAccessibility()
		expect(document.getElementById("main-content").getAttribute("aria-hidden")).toBe("true")
	})
})
