<template>
	<FrappeTabButtons
		:options="options"
		:model-value="modelValue"
		size="md"
		fluid
		@update:model-value="$emit('update:modelValue', $event)"
	/>
</template>

<script setup>
import { computed, inject } from "vue"
import { TabButtons as FrappeTabButtons } from "frappe-ui"

const __ = inject("$translate")
const props = defineProps({
	buttons: {
		type: Array,
		required: true,
	},
	modelValue: {
		type: String,
	},
})

defineEmits(["update:modelValue"])

const options = computed(() =>
	props.buttons.map((button) => ({
		value: button.key ?? button.label ?? button,
		label: button.label ?? __(button),
	}))
)
</script>
