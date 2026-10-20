<template>
	<div v-if="showField" class="flex flex-col gap-1.5">
		<span
			v-if="!['Check', 'Section Break', 'Column Break'].includes(fieldtype)"
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
			@change="emit('change', $event.target.value)"
		/>
		<Checkbox
			v-else-if="fieldtype === 'Check'"
			v-bind="$attrs"
			:label="label"
			:model-value="checkedValue"
			:disabled="isReadOnly"
			@update:model-value="updateValue"
			@change="emit('change', $event.target.checked)"
		/>
		<TextInput
			v-else-if="fieldtype === 'Data' || isNumberType"
			v-bind="$attrs"
			:type="isNumberType && !(fieldtype === 'Currency' && isReadOnly) ? 'number' : 'text'"
			:model-value="modelValue"
			:disabled="isReadOnly"
			@update:model-value="updateValue"
			@change="emit('change', $event.target.value)"
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
		<TextInput
			v-else-if="fieldtype === 'Date'"
			v-bind="$attrs"
			type="date"
			:model-value="modelValue || ''"
			:placeholder="__('Select {0}', [label])"
			:disabled="isReadOnly"
			:min="minDate"
			:max="maxDate"
			@update:model-value="updateValue"
			@change="emit('change', $event.target.value)"
		/>
		<DateTimePicker
			v-else-if="fieldtype === 'Datetime'"
			v-bind="$attrs"
			:model-value="modelValue || ''"
			:placeholder="__('Select {0}', [label])"
			format="DD-MM-YYYY HH:mm:ss"
			:disabled="isReadOnly"
			@update:model-value="updateValue"
		/>
		<ErrorMessage :message="errorMessage" />
	</div>
</template>

<script setup>
import { Checkbox, Combobox, DateTimePicker, ErrorMessage, Textarea, TextInput } from "frappe-ui"
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
const editorExtensions = [RichTextKit]
const editorUploads = inject(editorUploadsKey, null) || new EditorUploads()
const uploadEditorFile = (file, options) => editorUploads.upload(file, options)
const isNumberType = computed(() => ["Int", "Float", "Currency"].includes(props.fieldtype))
const isReadOnly = computed(() => Boolean(props.readOnly || props.disabled))
const checkedValue = computed(() => [true, 1, "1"].includes(props.modelValue))
const showField = computed(() => {
	if (
		props.readOnly &&
		!props.modelValue &&
		!["Section Break", "Column Break"].includes(props.fieldtype)
	)
		return false

	return props.fieldtype !== "Table" && !props.hidden
})
const selectionList = computed(() => {
	if (props.fieldtype === "Link" && props.documentList) {
		return props.documentList
	} else if (props.fieldtype === "Select" && props.options) {
		return props.options.split("\n").map((option) => ({
			label: __(option),
			value: option,
		}))
	}

	return []
})

function updateValue(value) {
	if (isReadOnly.value) return
	emit("update:modelValue", value)
}

function setDefaultValue() {
	if (props.modelValue) return

	if (props.default) {
		if (props.fieldtype === "Check") {
			emit("update:modelValue", props.default === "1" ? true : false)
		} else if (props.fieldtype === "Date" && props.default === "Today") {
			emit("update:modelValue", dayjs().format("YYYY-MM-DD"))
		} else if (isNumberType.value) {
			emit("update:modelValue", parseFloat(props.default || 0))
		} else {
			emit("update:modelValue", props.default)
		}
	} else {
		props.fieldtype === "Check" ? emit("update:modelValue", false) : emit("update:modelValue", "")
	}
}

onMounted(setDefaultValue)
</script>
