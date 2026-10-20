<template>
	<!-- Filter Action Sheet -->
	<div
		class="bg-surface-base w-full flex flex-col items-center justify-center pb-5 max-h-[calc(100vh-5rem)]"
	>
		<div class="w-full pt-8 pb-5 border-b text-center sticky top-0 z-[100]">
			<span class="text-ink-gray-8 text-lg-bold">{{ __("Filters") }} </span>
		</div>

		<div class="w-full p-4 overflow-auto">
			<div class="flex flex-col gap-5 items-center justify-center">
				<div
					v-for="filter in filterConfig"
					:key="filter.fieldname"
					class="flex flex-col w-full gap-1"
				>
					<!-- Status filter -->
					<div
						class="flex flex-col gap-1.5"
						v-if="['status', 'approval_status'].includes(filter.fieldname)"
					>
						<div class="text-ink-gray-7 text-base-semibold">
							{{ __(filter.label) }}
						</div>
						<div class="flex flex-row gap-2 mt-2 flex-wrap">
							<Button
								v-for="option in filter.options"
								variant="outline"
								@click="setStatusFilter(filter.fieldname, option)"
								class="text-sm text-ink-gray-7"
								:class="[
									option === filters[filter.fieldname].value
										? '!border !border-outline-gray-8 !text-ink-gray-8 !bg-surface-gray-1 !font-medium'
										: '!font-normal',
								]"
							>
								{{ __(option) }}
							</Button>
						</div>
					</div>

					<!-- Field filters -->
					<div v-else class="flex flex-col gap-2">
						<div class="text-ink-gray-7 text-base-semibold">
							{{ __(filter.label) }}
						</div>
						<div class="flex flex-row items-center gap-3">
							<Select
								v-if="filterConditionMap[filter.fieldtype]"
								class="mt-1 w-[75px]"
								:options="filterConditionMap[filter.fieldtype]"
								:aria-label="__('Operator for {0}', [__(filter.label)])"
								v-model="filters[filter.fieldname].condition"
							/>
							<FormField
								class="w-full"
								:fieldtype="filter.fieldtype"
								:fieldname="filter.fieldname"
								:label="__(filter.label)"
								:hideLabel="true"
								:options="filter.options"
								v-model="filters[filter.fieldname].value"
							/>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Filter Buttons -->
		<div class="grid w-full grid-cols-2 gap-3 sticky bottom-0 border-t p-4 z-[100]">
			<Button @click="emit('clear-filters')" variant="outline" class="w-full py-5 text-sm">
				{{ __("Clear All") }}
			</Button>
			<Button @click="emit('apply-filters')" variant="solid" class="w-full py-5 text-sm">
				{{ __("Apply Filters") }}
			</Button>
		</div>
	</div>
</template>

<script setup>
import { computed } from "vue"
import FormField from "@/components/FormField.vue"
import { Select } from "frappe-ui"

const props = defineProps({
	filterConfig: {
		type: Array,
		required: true,
	},
	filters: {
		type: Object,
		required: true,
	},
})

const emit = defineEmits(["apply-filters", "clear-filters", "update:filters"])
const numberOperators = [
	{ label: "=", value: "=" },
	{ label: ">", value: ">" },
	{ label: "<", value: "<" },
	{ label: ">=", value: ">=" },
	{ label: "<=", value: "<=" },
]

const filterConditionMap = {
	Date: numberOperators,
	Currency: numberOperators,
}

const filters = computed({
	get() {
		return props.filters
	},
	set(value) {
		emit("update:filters", value)
	},
})

function setStatusFilter(fieldname, value) {
	if (filters.value[fieldname].value === value) {
		filters.value[fieldname].value = ""
	} else {
		filters.value[fieldname].value = value
	}
}
</script>
