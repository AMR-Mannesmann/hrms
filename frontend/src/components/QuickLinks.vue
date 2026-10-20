<template>
	<div class="flex flex-col gap-5 my-4 w-full">
		<div class="text-lg-medium text-ink-gray-8">{{ title || __("Quick Links") }}</div>
		<div class="flex flex-col bg-surface-base rounded-4">
			<router-link
				class="flex flex-row flex-start p-4 items-center justify-between"
				:class="link !== props.items[props.items.length - 1] && 'border-b'"
				v-for="link in props.items"
				:key="link.title"
				:to="{ name: link.route }"
			>
				<div class="flex flex-row items-center gap-3 grow">
					<component :is="link.icon" class="h-5 w-5 text-ink-gray-4" />
					<div class="text-base font-normal text-ink-gray-7">
						{{ link.title }}
					</div>
				</div>
				<Icon name="lucide-chevron-right" class="h-5 w-5 text-ink-gray-4" />
			</router-link>
		</div>
	</div>
</template>

<script setup>
import { Icon } from "frappe-ui"

const props = defineProps({
	title: {
		type: String,
		required: false,
		default: "",
	},
	items: {
		type: Array,
		required: true,
	},
})
</script>
