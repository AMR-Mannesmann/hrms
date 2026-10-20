<template>
	<div v-if="showField" class="flex flex-col gap-1.5">
		<span
			v-if="!hideLabel && !['Check', 'Section Break', 'Column Break'].includes(fieldtype)"
			class="block text-sm leading-5 text-ink-gray-6"
			:class="reqd ? `after:content-['_*'] after:text-ink-red-6` : ''"
		>
			{{ label }}
		</span>

		<Combobox
			v-if="fieldtype === 'Select' || documentList"
			v-bind="$attrs"
			:placeholder="__('Select {0}', [label])"
			:options="selectionList"
			:model-value="modelValue === '' ? null : modelValue"
			:disabled="isReadOnly"
			@update:model-value="updateValue($event ?? '')"
		/>
		<Link
			v-else-if="fieldtype === 'Link'"
			v-bind="$attrs"
			:doctype="options"
			:model-value="modelValue"
			:filters="linkFilters"
			:disabled="isReadOnly"
			@update:model-value="updateValue"
		/>
		<Editor
			v-else-if="fieldtype === 'Text Editor'"
			:model-value="modelValue || ''"
			:extensions="editorExtensions"
			:placeholder="__('Enter {0}', [label])"
			:editable="!isReadOnly"
			:upload-function="uploadEditorFile"
			@update:model-value="updateValue"
		>
			<div class="overflow-hidden rounded-1 border border-outline-gray-2">
				<EditorFixedMenu
					v-if="!isReadOnly"
					:items="articleToolbar"
					class="overflow-x-auto border-b border-outline-gray-2 p-1"
				/>
				<EditorContent class="prose-sm min-h-[4rem] p-1" />
			</div>
		</Editor>
		<Textarea
			v-else-if="['Small Text', 'Text', 'Long Text'].includes(fieldtype)"
			v-bind="$attrs"
			:model-value="modelValue"
			:placeholder="__('Enter {0}', [label])"
			:disabled="isReadOnly"
			class="min-h-15"
			@update:model-value="updateValue"
		/>
		<Checkbox
			v-else-if="fieldtype === 'Check'"
			v-bind="$attrs"
			:label="label"
			:model-value="checkedValue"
			:disabled="isReadOnly"
			@update:model-value="updateValue"
		/>
		<TextInput
			v-else-if="fieldtype === 'Data' || isNumberType"
			v-bind="$attrs"
			:type="isNumberType && !isReadOnly ? 'number' : 'text'"
			:model-value="modelValue"
			:disabled="isReadOnly"
			@update:model-value="updateValue"
		/>
		<div v-else-if="fieldtype === 'Section Break'" :class="addSectionPadding ? 'mt-2' : ''">
			<h2
				v-if="label"
				class="text-base-semibold text-ink-gray-7"
				:class="addSectionPadding ? 'pt-4' : ''"
			>
				{{ label }}
			</h2>
		</div>
		<DatePicker
			v-else-if="fieldtype === 'Date'"
			v-bind="$attrs"
			:model-value="modelValue || ''"
			:placeholder="__('Select {0}', [label])"
			:format="dateFormat"
			:disabled="isReadOnly"
			:min="minDate"
			:max="maxDate"
			@update:model-value="updateValue"
		/>
		<TimePicker
			v-else-if="fieldtype === 'Time'"
			v-bind="$attrs"
			:model-value="modelValue || ''"
			:placeholder="__('Select {0}', [label])"
			:disabled="isReadOnly"
			@update:model-value="updateValue"
		/>
		<DateTimePicker
			v-else-if="fieldtype === 'Datetime'"
			v-bind="$attrs"
			:model-value="modelValue || ''"
			:placeholder="__('Select {0}', [label])"
			:format="`${dateFormat} HH:mm:ss`"
			:disabled="isReadOnly"
			:min="minDate"
			:max="maxDate"
			@update:model-value="updateValue"
		/>
		<ErrorMessage :message="errorMessage" />
	</div>
</template>

<script setup>
import {
	Checkbox,
	Combobox,
	DatePicker,
	DateTimePicker,
	ErrorMessage,
	Textarea,
	TextInput,
	TimePicker,
} from "frappe-ui"
import {
	articleToolbar,
	Editor,
	EditorContent,
	EditorFixedMenu,
	RichTextKit,
} from "frappe-ui/editor"
import { computed, inject, onMounted } from "vue"
import Link from "@/components/Link.vue"
import { EditorUploads, editorUploadsKey } from "@/composables/editorUploads"

const __ = inject("$translate")
const dayjs = inject("$dayjs")
const props = defineProps({
	fieldtype: String,
	fieldname: String,
	modelValue: { type: [String, Number, Boolean, Array, Object], default: undefined },
	default: { type: [String, Number, Boolean, Array, Object], default: undefined },
	label: String,
	hideLabel: Boolean,
	options: [String, Array],
	linkFilters: Object,
	documentList: Array,
	readOnly: [Boolean, Number],
	disabled: Boolean,
	reqd: [Boolean, Number],
	hidden: { type: [Boolean, Number], default: false },
	errorMessage: String,
	minDate: String,
	maxDate: String,
	addSectionPadding: { type: Boolean, default: true },
})
const emit = defineEmits(["change", "update:modelValue"])
const dateFormat = (window.frappe?.boot?.sysdefaults?.date_format || "yyyy-mm-dd").toUpperCase()
const editorExtensions = [RichTextKit]
const editorUploads = inject(editorUploadsKey, null) || new EditorUploads()
const uploadEditorFile = (file, options) => editorUploads.upload(file, options)
const isNumberType = computed(() => ["Int", "Float", "Currency"].includes(props.fieldtype))
const isReadOnly = computed(() => Boolean(props.readOnly || props.disabled))
const checkedValue = computed(() => [true, 1, "1"].includes(props.modelValue))
const showField = computed(() => {
	if (props.hidden || props.fieldtype === "Table") return false
	const isEmpty = props.modelValue == null || props.modelValue === ""
	return !(
		props.readOnly &&
		isEmpty &&
		!["Section Break", "Column Break"].includes(props.fieldtype)
	)
})
const selectionList = computed(() => {
	if (props.documentList) return props.documentList
	const values = Array.isArray(props.options) ? props.options : (props.options || "").split("\n")
	return values.map((value) => (typeof value === "object" ? value : { label: __(value), value }))
})

function updateValue(value) {
	if (isReadOnly.value) return
	emit("update:modelValue", value)
	emit("change", value)
}

onMounted(() => {
	if (props.modelValue != null && props.modelValue !== "") return
	let value = props.default
	if (props.fieldtype === "Check") value = [true, 1, "1"].includes(value)
	else if (props.fieldtype === "Date" && value === "Today") value = dayjs().format("YYYY-MM-DD")
	else if (isNumberType.value && value != null && value !== "") value = parseFloat(value)
	emit("update:modelValue", value ?? "")
})
</script>
