<template>
	<Combobox
		size="sm"
		v-model="value"
		:placeholder="__('Select {0}', [__(doctype)])"
		:options="options.data || []"
		:filterable="false"
		:loading="options.loading"
		:class="disabled ? 'pointer-events-none' : ''"
		:disabled="disabled"
		@input="handleQueryUpdate($event.target.value)"
	>
		<template #suffix="{ clear }">
			<button
				v-if="modelValue && !disabled"
				type="button"
				:aria-label="__('Clear {0}', [__(doctype)])"
				class="flex items-center text-ink-gray-5"
				@pointerdown.stop
				@click.stop="clear"
			>
				<Icon name="lucide-x" class="h-4 w-4" />
			</button>
			<Icon v-else name="lucide-chevron-down" class="h-4 w-4" />
		</template>
	</Combobox>
</template>

<script setup>
import { createResource, Combobox, debounce, Icon } from "frappe-ui"
import { ref, computed, watch } from "vue"

const props = defineProps({
	doctype: {
		type: String,
		required: true,
	},
	modelValue: {
		type: String,
		required: false,
		default: "",
	},
	filters: {
		type: Object,
		default: {},
	},
	disabled: {
		type: Boolean,
		default: false,
	},
})

const emit = defineEmits(["update:modelValue"])

const searchText = ref("")

const value = computed({
	get: () => props.modelValue,
	set: (val) => emit("update:modelValue", val ?? ""),
})

const options = createResource({
	url: "frappe.desk.search.search_link",
	params: {
		doctype: props.doctype,
		txt: searchText.value,
		filters: props.filters,
	},
	method: "POST",
	transform: (data) => {
		const mapped = data.map((doc) => {
			let title = null
			if (doc.label && doc.label !== doc.value) {
				title = doc.label
			} else if (doc.description) {
				title = doc.description.split(",")[0]
			}
			return {
				label: title ? `${title} : ${doc.value}` : doc.value,
				value: doc.value,
			}
		})

		if (props.modelValue && !mapped.find((o) => o.value === props.modelValue)) {
			mapped.unshift({ label: props.modelValue, value: props.modelValue })
		}
		return mapped
	},
})

const reloadOptions = (searchTextVal) => {
	options.update({
		params: {
			txt: searchTextVal,
			doctype: props.doctype,
			filters: props.filters,
		},
	})
	options.reload()
}

const handleQueryUpdate = debounce((newQuery) => {
	const val = newQuery || ""
	if (searchText.value === val) return
	searchText.value = val
	reloadOptions(val)
}, 300)

watch(
	() => props.doctype,
	() => {
		if (!props.doctype || props.doctype === options.doctype) return
		reloadOptions("")
	},
	{ immediate: true }
)

watch(
	() => props.filters,
	() => reloadOptions(''),
)

watch(
	() => props.modelValue,
	(newVal, oldVal) => {
		if (!newVal && oldVal) {
			// value cleared — reload so the dropdown shows the full default list
			searchText.value = ""
			reloadOptions("")
		} else if (newVal && newVal !== oldVal) {
			// reload so transform can inject it if it's outside the default page
			const inOptions = (options.data || []).find((o) => o.value === newVal)
			if (options.data && !inOptions) reloadOptions("")
		}
	}
)
</script>
