<template>
	<div class="flex items-center">
		<!-- Month Change -->
		<div class="flex items-center bg-surface-gray-1 rounded-5 space-x-0.5">
			<Button
				icon="lucide-chevron-left"
				aria-label="Previous month"
				variant="ghost"
				@click="emit('addToMonth', -1)"
			/>
			<span class="w-32 text-center text-base-medium">
				{{ props.firstOfMonth.format("MMMM") }}, {{ firstOfMonth.format("YYYY") }}
			</span>
			<Button
				icon="lucide-chevron-right"
				aria-label="Next month"
				variant="ghost"
				@click="emit('addToMonth', 1)"
			/>
		</div>

		<!-- Filters -->
		<div class="ml-auto space-x-2.5 flex">
			<div v-for="[key, value] of Object.entries(filters)" :key="key" class="w-40">
				<FormControl
					type="combobox"
					:placeholder="toTitleCase(key)"
					:aria-label="toTitleCase(key)"
					:options="value.options"
					v-model="value.model"
					:disabled="!value.options.length"
				/>
			</div>
			<Button
				icon="lucide-x"
				aria-label="Clear filters"
				@click="Object.values(filters).forEach((d) => (d.model = null))"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import { reactive, watch } from "vue";
import { FormControl, createResource, createListResource } from "frappe-ui";
import { Dayjs } from "dayjs";

import { raiseToast } from "../utils";

export type FilterField =
	| "company"
	| "department"
	| "branch"
	| "designation"
	| "shift_type"
	| "shift_location";

const props = defineProps<{
	firstOfMonth: Dayjs;
}>();

const emit = defineEmits<{
	(e: "addToMonth", change: number): void;
	(e: "updateFilters", newFilters: { [K in FilterField]: string }): void;
}>();

const filters: {
	[K in FilterField]: {
		options: string[];
		model: string | null;
	};
} = reactive({
	company: { options: [], model: null },
	department: { options: [], model: null },
	branch: { options: [], model: null },
	designation: { options: [], model: null },
	shift_type: { options: [], model: null },
	shift_location: { options: [], model: null },
});

watch(
	() => filters.company.model,
	(val) => {
		if (val) getFilterOptions("department", { company: val });
		else {
			filters.department.model = null;
			filters.department.options = [];
		}
	},
);

watch(filters, (val) => {
	const newFilters = {
		company: val.company.model || "",
		department: val.department.model || "",
		branch: val.branch.model || "",
		designation: val.designation.model || "",
		shift_type: val.shift_type.model || "",
		shift_location: val.shift_location.model || "",
	};
	emit("updateFilters", newFilters);
});

const toTitleCase = (str: string) =>
	str
		.split("_")
		.map((s) => s.charAt(0).toUpperCase() + s.slice(1))
		.join(" ");

// RESOURCES

const defaultCompany = createResource({
	url: "hrms.api.roster.get_default_company",
	auto: true,
	onSuccess: () => {
		["company", "branch", "designation", "shift_type", "shift_location"].forEach((field) =>
			getFilterOptions(field as FilterField),
		);
	},
});

const getFilterOptions = (field: FilterField, listFilters: { company?: string } = {}) => {
	createListResource({
		doctype: toTitleCase(field),
		fields: ["name"],
		filters: listFilters,
		pageLength: 100,
		auto: true,
		onSuccess: (data: { name: string }[]) => {
			const value = field === "company" ? defaultCompany.data : "";
			filters[field].model = value || null;
			filters[field].options = data.map((item) => item.name);
		},
		onError(error: { messages: string[] }) {
			raiseToast("error", error.messages[0]);
		},
	});
};
</script>
