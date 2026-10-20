<template>
	<DateRangePicker
		:model-value="range"
		:format="dateFormat"
		:typeable="false"
		:disabled="disabled"
		@update:model-value="updateRange"
	>
		<template #trigger="{ setOpen, open, disabled }">
			<div
				class="grid grid-cols-2 divide-x divide-outline-gray-2 rounded-4 border bg-surface-base text-sm transition-colors"
				:class="
					open
						? 'border-outline-gray-4 ring-2 ring-outline-gray-2'
						: 'border-outline-gray-2 hover:border-outline-gray-3'
				"
			>
				<Button
					v-for="(fieldname, index) in ['fromDate', 'toDate']"
					:key="fieldname"
					variant="ghost"
					class="h-auto min-w-0 justify-start px-3 py-2 text-left"
					:class="index === 0 ? 'rounded-r-0' : 'rounded-l-0'"
					:disabled="disabled"
					aria-haspopup="dialog"
					:aria-expanded="open"
					@click="setOpen(!open)"
				>
					<span class="flex min-w-0 items-center gap-2">
						<span class="lucide-calendar-days size-4 shrink-0 text-ink-gray-5" aria-hidden="true" />
						<span class="flex min-w-0 flex-col leading-tight">
							<span class="text-xs text-ink-gray-5">
								{{ index === 0 ? __("From Date") : __("To Date") }}
							</span>
							<span class="truncate text-ink-gray-9">{{ formatDate(range[index]) }}</span>
						</span>
					</span>
				</Button>
			</div>
		</template>
		<template #actions="{ clear, close, disabled }">
			<Button
				variant="ghost"
				:label="__('Clear')"
				:disabled="disabled"
				@click="clear(); updateRange([]); close()"
			/>
		</template>
	</DateRangePicker>
</template>

<script setup>
import { computed, inject } from "vue"
import { Button, DateRangePicker } from "frappe-ui"

const props = defineProps({
	fromDate: { type: String, default: "" },
	toDate: { type: String, default: "" },
	disabled: Boolean,
})
const emit = defineEmits(["update:fromDate", "update:toDate"])
const __ = inject("$translate")
const dayjs = inject("$dayjs")
const dateFormat = (window.frappe?.boot?.sysdefaults?.date_format || "yyyy-mm-dd").toUpperCase()

const range = computed(() =>
	props.fromDate || props.toDate ? [props.fromDate || "", props.toDate || ""] : []
)

function updateRange(value) {
	if (props.disabled) return
	const [fromDate = "", toDate = ""] = value || []
	if (value?.length && !(fromDate && toDate)) return
	emit("update:fromDate", fromDate)
	emit("update:toDate", toDate)
}

function formatDate(value) {
	return value ? dayjs(value).format(dateFormat) : __("Add date")
}
</script>
