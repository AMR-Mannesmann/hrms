<template>
	<div v-if="props.value == null || props.value === ''" class="text-ink-gray-5 text-base">-</div>

	<Badge
		v-else-if="props.fieldtype === 'Select'"
		variant="outline"
		:theme="colorMap[props.value]"
		:label="__(props.value)"
		size="md"
	/>

	<div v-else-if="props.fieldtype === 'Date'" class="text-ink-gray-8 text-base">
		{{ dayjs(props.value).format("D MMM YYYY") }}
	</div>

	<Checkbox
		v-else-if="props.fieldtype === 'Check'"
		label=""
		:model-value="[true, 1, '1'].includes(props.value)"
		:disabled="true"
		class="rounded-1 text-ink-gray-7"
	/>

	<div
		v-else-if="['Small Text', 'Text', 'Long Text'].includes(props.fieldtype)"
		class="text-ink-gray-8 text-base bg-surface-gray-2 rounded-4 py-3 pl-3 mt-2"
	>
		{{ props.value }}
	</div>

	<EmployeeAvatar
		v-else-if="props.fieldtype === 'Link' && ['employee', 'reports_to'].includes(props.fieldname)"
		:employeeID="props.value"
		:showLabel="true"
	/>

	<div
		v-else-if="props.fieldtype === 'geolocation'"
		class="rounded-4 border-4 translate-z-0 block overflow-hidden w-full h-170 mt-2"
	>
		<iframe
			width="100%"
			height="170"
			frameborder="0"
			scrolling="no"
			marginheight="0"
			marginwidth="0"
			style="border: 0"
			:src="`https://maps.google.com/maps?q=${getCoordinates(props.value).latitude},${
				getCoordinates(props.value).longitude
			}&hl=en&z=15&amp;output=embed`"
		>
		</iframe>
	</div>

	<div v-else class="text-ink-gray-8 text-base">{{ props.value }}</div>
</template>

<script setup>
import { inject } from "vue"
import { Badge, Checkbox } from "frappe-ui"

import EmployeeAvatar from "@/components/EmployeeAvatar.vue"

const dayjs = inject("$dayjs")

const props = defineProps({
	value: [String, Number, Boolean, Array, Object],
	fieldtype: String,
	fieldname: String,
})

const colorMap = {
	Approved: "green",
	Rejected: "red",
	Open: "amber",
	"Approved & Draft": "gray",
	"Rejected & Draft": "gray",
}

const getCoordinates = (value) => {
	const [longitude, latitude] = JSON.parse(value).features[0].geometry.coordinates
	return { longitude, latitude }
}
</script>
