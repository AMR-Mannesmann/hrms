<template>
	<div
		class="flex flex-col items-center rounded-4 p-5 text-sm text-ink-gray-5"
		:class="[props.isTableField ? 'border-2 border-dashed border-outline-gray-3 mt-5' : '']"
	>
		{{ __(props.message) }}
	</div>
</template>

<script setup>
const props = defineProps({
	message: { type: String },
	isTableField: { type: Boolean, default: false },
})
</script>
