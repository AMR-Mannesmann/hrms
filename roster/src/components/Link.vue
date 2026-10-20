<template>
	<div>
		<span class="block text-xs leading-5 text-ink-gray-6">
			{{ props.label }}
		</span>
		<Combobox
			size="sm"
			:aria-label="label || doctype"
			v-model="value"
			:options="options.data || []"
			:filterable="false"
			:loading="options.loading"
			:class="disabled ? 'pointer-events-none' : ''"
			:disabled="disabled"
			@input="(event) => handleQueryUpdate(event.target.value)"
		>
			<template #suffix="{ clear }">
				<button
					v-if="modelValue && !disabled"
					type="button"
					:aria-label="`Clear ${label || doctype}`"
					class="flex items-center text-ink-gray-5"
					@pointerdown.stop
					@click.stop="clear"
				>
					<span class="lucide-x size-4" aria-hidden="true" />
				</button>
				<span v-else class="lucide-chevron-down size-4" aria-hidden="true" />
			</template>
		</Combobox>
	</div>
</template>

<script setup>
import { createResource, Combobox, debounce } from "frappe-ui";
import { ref, computed, watch, onMounted } from "vue";

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
		default: () => ({}),
	},
	disabled: {
		type: Boolean,
		default: false,
	},
	label: {
		type: String,
		default: "",
	},
});

const emit = defineEmits(["update:modelValue"]);

const searchText = ref("");

const value = computed({
	get: () => props.modelValue,
	set: (val) => emit("update:modelValue", val ?? ""),
});

const options = createResource({
	url: "frappe.desk.search.search_link",
	params: {
		doctype: props.doctype,
		txt: searchText.value,
		filters: props.filters,
	},
	method: "POST",
	transform: (data) => {
		const mappedOptions = data.map((doc) => {
			let title = null;
			if (doc.label && doc.label !== doc.value) {
				title = doc.label;
			} else if (doc.description) {
				title = doc.description.split(",")[0];
			}
			return {
				label: title ? `${title} : ${doc.value}` : doc.value,
				value: doc.value,
			};
		});

		// ensure the currently selected value is always resolvable, even if
		// the (possibly unfiltered/reloaded) result set doesn't include it
		if (
			props.modelValue &&
			!mappedOptions.some((option) => option.value === props.modelValue)
		) {
			mappedOptions.unshift({
				label: props.modelValue,
				value: props.modelValue,
			});
		}

		return mappedOptions;
	},
});

const reloadOptions = (searchTextVal) => {
	options.update({
		params: {
			txt: searchTextVal,
			doctype: props.doctype,
			filters: props.filters,
		},
	});
	options.reload();
};

const handleQueryUpdate = debounce((newQuery) => {
	const val = newQuery || "";
	if (searchText.value === val) return;
	searchText.value = val;
	reloadOptions(val);
}, 300);

onMounted(() => {
	reloadOptions(props.modelValue || "");
});

watch(
	() => props.doctype,
	() => {
		if (!props.doctype || props.doctype === options.doctype) return;
		reloadOptions("");
	},
);

watch(
	() => props.filters,
	() => reloadOptions(""),
	{ deep: true },
);

watch(
	() => props.modelValue,
	(value, previous) => {
		if (!value && previous) {
			searchText.value = "";
			reloadOptions("");
		} else if (
			value &&
			options.data &&
			!options.data.some((option) => option.value === value)
		) {
			reloadOptions("");
		}
	},
);
</script>
