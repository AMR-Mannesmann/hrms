<template>
	<ListItem>
		<template #left>
			<Icon name="lucide-clock" class="h-5 w-5 text-ink-gray-4" />
			<div class="flex flex-col items-start gap-1.5">
				<div class="text-base font-normal text-ink-gray-7">
					{{ __("Log Type: {0}", [props.doc.log_type]) }}
				</div>
				<div class="text-xs font-normal text-ink-gray-4">
					<span>{{ formatTimestamp(props.doc.time) }}</span>
				</div>
			</div>
		</template>
		<template #right>
			<Icon name="lucide-chevron-right" class="h-5 w-5 text-ink-gray-4" />
		</template>
	</ListItem>
</template>

<script setup>
import { Icon } from "frappe-ui"

import ListItem from "@/components/ListItem.vue"
import { formatTimestamp } from "@/utils/formatters"

const props = defineProps({
	doc: {
		type: Object,
	},
})
</script>
