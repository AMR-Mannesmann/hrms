<template>
	<div class="flex flex-col h-full w-full" v-if="isFormReady">
		<div class="w-full h-full bg-surface-base sm:w-96 flex flex-col">
			<header
				class="flex flex-row bg-surface-base shadow-sm py-4 px-3 items-center sticky top-0 z-[1000]"
			>
				<Button variant="ghost" class="!pl-0 hover:bg-surface-base" @click="router.back()">
					<Icon name="lucide-chevron-left" class="h-5 w-5" />
				</Button>
				<div v-if="id" class="flex flex-row items-center gap-2 overflow-hidden grow">
					<h2
						class="text-2xl-semibold text-ink-gray-8 whitespace-nowrap overflow-hidden text-ellipsis"
					>
						{{ __(props.doctype) }}
					</h2>
					<Badge :label="id" class="whitespace-nowrap text-[8px]" variant="outline" />
					<Badge
						v-if="status"
						:label="__(status, null, doctype)"
						:theme="statusColor"
						class="whitespace-nowrap text-[8px]"
					/>

					<Dropdown
						class="ml-auto"
						:options="[
							{
								label: __('Delete'),
								condition: showDeleteButton,
								onClick: () => (showDeleteDialog = true),
							},
							{ label: __('Reload'), onClick: () => reloadDoc() },
							{
								label: __('Download PDF'),
								condition: () => props.showDownloadPDFButton,
								onClick: () => handleDownload(),
							},
						]"
						:button="{
							label: __('Menu'),
							icon: 'lucide-more-horizontal',
							variant: 'ghost',
							disabled: isUpdatingDocument,
						}"
					/>
				</div>
				<h2 v-else class="text-3xl-semibold text-ink-gray-8">
					{{ __("New {0}", [__(doctype)], props.doctype) }}
				</h2>
			</header>

			<!-- Form -->
			<div class="bg-surface-base grow overflow-y-auto">
				<!-- Tabs -->
				<template v-if="tabbedView">
					<div
						class="px-4 sticky top-0 z-[100] bg-surface-base text-sm-medium text-center text-ink-gray-4 border-b border-outline-gray-2"
					>
						<ul class="flex -mb-px overflow-auto hide-scrollbar">
							<li class="mr-2 whitespace-nowrap" v-for="tab in tabs">
								<button
									@click="activeTab = tab.name"
									class="inline-block py-4 px-2 border-b-2 border-transparent rounded-t-6"
									:class="[
										activeTab === tab.name
											? '!text-ink-gray-7 !border-outline-gray-8'
											: 'hover:text-ink-gray-5 hover:border-outline-gray-3',
									]"
								>
									{{ __(tab.name, null, props.doctype) }}
								</button>
							</li>
						</ul>
					</div>

					<template v-for="(fieldList, tabName, index) in tabFields">
						<div v-show="tabName === activeTab" class="flex flex-col space-y-4 p-4">
							<template v-for="field in fieldList" :key="field.fieldname">
								<slot
									v-if="field.fieldtype == 'Table'"
									:name="field.fieldname"
									:isFormReadOnly="isFormReadOnly"
								></slot>

								<FormField
									v-else
									:fieldtype="field.fieldtype"
									:fieldname="field.fieldname"
									v-model="formModel[field.fieldname]"
									:default="field.default"
									:label="__(field.label, null, props.doctype)"
									:options="field.options"
									:linkFilters="field.linkFilters"
									:documentList="field.documentList"
									:readOnly="isFieldReadOnly(field)"
									:reqd="Boolean(field.reqd)"
									:hidden="Boolean(field.hidden)"
									:errorMessage="field.error_message"
									:minDate="field.minDate"
									:maxDate="field.maxDate"
									:addSectionPadding="fieldList[0].name !== field.name"
								/>
							</template>

							<!-- Attachment upload -->
							<div
								class="flex flex-row gap-2 items-center justify-center p-5"
								v-if="isFileUploading"
							>
								<LoadingIndicator class="w-3 h-3 text-ink-gray-7" />
								<span class="text-ink-gray-8 text-sm">{{ __("Uploading...") }} </span>
							</div>

							<FileUploaderView
								v-else-if="showAttachmentView && index === 0"
								v-model="fileAttachments"
								:inert="isUpdatingDocument"
								@handleFileSelect="handleFileSelect"
								@handleFileDelete="handleFileDelete"
							/>
						</div>
					</template>
				</template>

				<div class="flex flex-col space-y-4 p-4" v-else>
					<FormField
						v-for="field in props.fields"
						:key="field.name"
						:fieldtype="field.fieldtype"
						:fieldname="field.fieldname"
						v-model="formModel[field.fieldname]"
						:default="field.default"
						:label="__(field.label, null, props.doctype)"
						:options="field.options"
						:linkFilters="field.linkFilters"
						:documentList="field.documentList"
						:readOnly="isFieldReadOnly(field)"
						:reqd="Boolean(field.reqd)"
						:hidden="Boolean(field.hidden)"
						:errorMessage="field.error_message"
						:minDate="field.minDate"
						:maxDate="field.maxDate"
					/>

					<!-- Attachment upload -->
					<div class="flex flex-row gap-2 items-center justify-center p-5" v-if="isFileUploading">
						<LoadingIndicator class="w-3 h-3 text-ink-gray-7" />
						<span class="text-ink-gray-8 text-sm">{{ __("Uploading...") }} </span>
					</div>

					<FileUploaderView
						v-else-if="showAttachmentView"
						v-model="fileAttachments"
						:inert="isUpdatingDocument"
						@handleFileSelect="handleFileSelect"
						@handleFileDelete="handleFileDelete"
					/>
				</div>
			</div>

			<!-- Form Primary/Secondary Button -->
			<!-- custom form button eg: Download button in salary slips -->
			<div
				v-if="!showFormButton"
				class="px-4 pt-4 pb-4 standalone:pb-safe-bottom sm:w-96 bg-surface-base sticky bottom-0 w-full drop-shadow-xl z-40 border-t rounded-t-6"
			>
				<slot name="formButton"></slot>
			</div>

			<!-- workflow actions -->
			<WorkflowActionSheet
				v-else-if="
					!isFormDirty && workflow?.hasWorkflow && !editorUploadBusy && !isUpdatingDocument
				"
				:doc="documentResource.doc"
				:workflow="workflow"
				@workflowApplied="reloadDoc()"
			/>

			<!-- save/submit/cancel -->
			<div
				v-else-if="isFormDirty || (!workflow?.hasWorkflow && formButton)"
				class="px-4 pt-4 pb-4 standalone:pb-safe-bottom sm:w-96 bg-surface-base sticky bottom-0 w-full drop-shadow-xl z-40 border-t rounded-t-6"
			>
				<ErrorMessage
					class="mb-2"
					:message="
						formErrorMessage || docList?.insert?.error || documentResource?.setValue?.error
					"
				/>

				<Button
					class="w-full rounded-4 py-5 text-base disabled:bg-surface-gray-8 disabled:text-ink-base"
					:class="formButton === 'Cancel' ? 'shadow' : ''"
					@click="formButton === 'Save' ? saveForm() : submitOrCancelForm()"
					:variant="formButton === 'Cancel' ? 'subtle' : 'solid'"
					:disabled="editorUploadBusy || isFileUploading || isUpdatingDocument"
					:loading="
						isCompletingInsert || isUpdatingDocument || documentResource?.setValue?.loading
					"
				>
					{{ createdDocument ? __("Retry Attachments") : __(formButton) }}
				</Button>
			</div>
		</div>
	</div>

	<!-- Confirmation Dialogs -->
	<Dialog v-model:open="showDeleteDialog">
		<template #title>
			<h2 class="text-2xl-bold">{{ __("Delete {0}", [__(props.doctype)]) }}</h2>
		</template>
		<template #default>
			<p>
				{{ __("Are you sure you want to delete the {0}", [__(props.doctype)]) }}
				<span class="font-bold">{{ formModel.name }}</span>
				?
			</p>
		</template>
		<template #actions>
			<div class="grid grid-cols-2 gap-4">
				<Button
					variant="outline"
					class="py-5 w-full"
					:disabled="isUpdatingDocument"
					@click="showDeleteDialog = false"
				>
					{{ __("Cancel") }}
				</Button>
				<Button
					variant="solid"
					theme="red"
					:disabled="isUpdatingDocument"
					@click="handleDocDelete"
					class="py-5 w-full"
				>
					{{ __("Delete") }}
				</Button>
			</div>
		</template>
	</Dialog>

	<Dialog v-model:open="showSubmitDialog">
		<template #title>
			<h2 class="text-2xl-bold">{{ __("Confirm") }}</h2>
		</template>
		<template #default>
			<p>
				{{ __("Permanently submit {0}", [__(props.doctype)]) }}
				<span class="font-bold">{{ formModel.name }}</span>
				?
			</p>
		</template>
		<template #actions>
			<div class="grid grid-cols-2 gap-4">
				<Button
					variant="outline"
					class="py-5 w-full"
					:disabled="isUpdatingDocument"
					@click="showSubmitDialog = false"
				>
					{{ __("No") }}
				</Button>
				<Button
					variant="solid"
					@click="handleDocUpdate('submit')"
					:disabled="editorUploadBusy || isUpdatingDocument"
					class="py-5 w-full"
				>
					{{ __("Yes") }}
				</Button>
			</div>
		</template>
	</Dialog>

	<Dialog v-model:open="showCancelDialog">
		<template #title>
			<h2 class="text-2xl-bold">{{ __("Confirm") }}</h2>
		</template>
		<template #default>
			<p>
				{{ __("Permanently cancel {0}", [__(props.doctype)]) }}
				<span class="font-bold">{{ formModel.name }}</span
				>?
			</p>
		</template>
		<template #actions>
			<div class="grid grid-cols-2 gap-4">
				<Button
					variant="outline"
					class="py-5 w-full"
					:disabled="isUpdatingDocument"
					@click="showCancelDialog = false"
				>
					{{ __("No") }}
				</Button>
				<Button
					variant="solid"
					@click="handleDocUpdate('cancel')"
					:disabled="editorUploadBusy || isUpdatingDocument"
					class="py-5 w-full"
				>
					{{ __("Yes") }}
				</Button>
			</div>
		</template>
	</Dialog>
</template>

<script setup>
import { computed, inject, nextTick, onMounted, provide, ref, watch } from "vue"
import { useRouter } from "vue-router"
import {
	ErrorMessage,
	Badge,
	Icon,
	createListResource,
	createDocumentResource,
	toast,
	createResource,
	Dropdown,
	Dialog,
	LoadingIndicator,
} from "frappe-ui"
import FormField from "@/components/FormField.vue"
import FileUploaderView from "@/components/FileUploaderView.vue"
import WorkflowActionSheet from "@/components/WorkflowActionSheet.vue"

import { FileAttachment, guessStatusColor } from "@/composables"
import useWorkflow from "@/composables/workflow"
import { updateDocumentLifecycle } from "@/composables/documentLifecycle"
import { EditorUploads, editorUploadsKey } from "@/composables/editorUploads"
import { getCompanyCurrency } from "@/data/currencies"
import { getLeaveStatus } from "@/data/leaves"
import { formatCurrency } from "@/utils/formatters"
import { useDownloadPDF } from "@/utils/commonUtils"

const props = defineProps({
	doctype: {
		type: String,
		required: true,
	},
	modelValue: {
		type: Object,
		required: true,
	},
	isSubmittable: {
		type: Boolean,
		required: false,
		default: false,
	},
	fields: {
		type: Array,
		required: true,
	},
	id: {
		type: String,
		required: false,
	},
	tabbedView: {
		type: Boolean,
		required: false,
		default: false,
	},
	tabs: {
		type: Array,
		required: false,
	},
	showAttachmentView: {
		type: Boolean,
		required: false,
		default: false,
	},
	showFormButton: {
		type: Boolean,
		required: false,
		default: true,
	},
	showDownloadPDFButton: {
		type: Boolean,
		required: false,
		default: false,
	},
})
const emit = defineEmits(["validateForm", "update:modelValue", "formReloaded"])
const router = useRouter()
const { downloadPDF } = useDownloadPDF()

const __ = inject("$translate")

let activeTab = ref(props.tabs?.[0].name)
let fileAttachments = ref([])
let statusColor = ref("")
let formErrorMessage = ref("")
let isFormDirty = ref(false)
let isFormUpdated = ref(false)
let showDeleteDialog = ref(false)
let showSubmitDialog = ref(false)
let showCancelDialog = ref(false)
let isFileUploading = ref(false)
let workflow = ref(null)
const createdDocument = ref(null)
const isCompletingInsert = ref(false)
const isUpdatingDocument = ref(false)
const editorUploads = new EditorUploads(
	() => ({ doctype: props.doctype, name: props.id || createdDocument.value?.name }),
	() =>
		!isCompletingInsert.value &&
		!isUpdatingDocument.value &&
		!createdDocument.value &&
		!documentResource?.setValue?.loading
)
const editorUploadBusy = editorUploads.busy
provide(editorUploadsKey, editorUploads)

const formModel = computed({
	get() {
		return props.modelValue
	},
	set(newValue) {
		emit("update:modelValue", newValue)
	},
})

const status = computed(() => {
	if (!props.id) return ""

	if (workflow.value) {
		const stateField = workflow.value.getWorkflowStateField()
		if (stateField) return formModel.value[stateField]
	}

	if (props.doctype === "Leave Application") return getLeaveStatus(formModel.value)

	return formModel.value.status || formModel.value.approval_status
})

watch(
	() => formModel.value,
	() => {
		if (!props.id) return

		if (isFormReady.value && !isFormUpdated.value) {
			isFormDirty.value = true
		} else if (isFormUpdated.value) {
			isFormUpdated.value = false
		}
	},
	{ deep: true }
)

watch(
	() => status.value,
	async (value) => {
		if (!value) return
		statusColor.value = await guessStatusColor(props.doctype, status.value)
	},
	{ immediate: true }
)

const tabFields = computed(() => {
	let fieldsByTab = {}
	let fieldList = []
	let firstFieldIndex = 0
	let lastFieldIndex = 0

	props.tabs?.forEach((tab) => {
		lastFieldIndex = props.fields.findIndex((field) => field.fieldname === tab.lastField)
		fieldList = props.fields.slice(firstFieldIndex, lastFieldIndex + 1)
		fieldsByTab[tab.name] = fieldList
		firstFieldIndex = lastFieldIndex + 1
	})

	return fieldsByTab
})

const attachedFiles = createResource({
	url: "hrms.api.get_attachments",
	params: {
		dt: props.doctype,
		dn: props.id,
	},
	onSuccess(data) {
		fileAttachments.value = data.map((file) => ({ ...file, uploaded: true }))
	},
})

const handleFileSelect = (e) => {
	if (isUpdatingDocument.value) return
	if (props.id) {
		uploadAllAttachments(props.doctype, props.id, [...e.target.files])
	} else {
		fileAttachments.value.push(...e.target.files)
	}
}

const handleFileDelete = async (fileObj) => {
	if (isUpdatingDocument.value) return
	if (fileObj.uploaded) {
		const fileAttachment = new FileAttachment(fileObj)
		await fileAttachment.delete()
		await attachedFiles.reload()
	} else {
		fileAttachments.value = fileAttachments.value.filter((file) => file.name !== fileObj.name)
	}
}

async function uploadAllAttachments(documentType, documentName, attachments) {
	isFileUploading.value = true

	const uploadPromises = attachments
		.filter((file) => !file.uploaded)
		.map((attachment) => {
			const fileAttachment = new FileAttachment(attachment)
			return fileAttachment.upload(documentType, documentName, "").then((fileDoc) => {
				fileDoc.uploaded = true
				attachment.uploaded = true
				if (props.id) {
					fileAttachments.value.push(fileDoc)
				}
			})
		})

	await Promise.allSettled(uploadPromises)
	isFileUploading.value = false
}

// CRUD for doc
const docList = createListResource({
	doctype: props.doctype,
	insert: {
		onSuccess(data) {
			// Preserve the inserted document when attaching its editor files must be retried.
			createdDocument.value = data
		},
		onError() {
			toast.error(__("Error"), {
				description: __("Error creating {0}", [__(props.doctype)]),
			})
			console.log(`Error creating ${props.doctype}`)
		},
	},
})

const documentResource = createDocumentResource({
	doctype: props.doctype,
	name: props.id,
	setValue: {
		onSuccess() {
			toast.success(__("Success"), {
				description: __("{0} updated successfully!", [__(props.doctype)]),
			})
		},
		onError() {
			toast.error(__("Error"), {
				description: __("Error updating {0}", [__(props.doctype)]),
			})
			console.log(`Error updating ${props.doctype}`)
		},
	},
	delete: {
		onSuccess() {
			router.back()
			toast.success(__("Success"), {
				description: __("{0} deleted successfully!", [__(props.doctype)]),
			})
		},
		onError() {
			toast.error(__("Error"), {
				description: __("Error deleting {0}", [__(props.doctype)]),
			})
			console.log(`Error deleting ${props.doctype}`)
		},
	},
})

const docPermissions = createResource({
	url: "frappe.client.get_doc_permissions",
	params: { doctype: props.doctype, docname: props.id },
})

const permittedWriteFields = createResource({
	url: "hrms.api.get_permitted_fields_for_write",
	params: { doctype: props.doctype },
})

const formButton = computed(() => {
	if (!props.showFormButton) return

	if (props.id && props.isSubmittable && !isFormDirty.value) {
		if (formModel.value.docstatus === 0 && hasPermission("submit")) {
			return "Submit"
		} else if (formModel.value.docstatus === 1 && hasPermission("cancel")) {
			return "Cancel"
		}
	} else if (formModel.value.docstatus !== 2) {
		return "Save"
	}
})

function showDeleteButton() {
	return props.id && formModel.value.docstatus !== 1 && hasPermission("delete")
}

function hasPermission(action) {
	return docPermissions.data?.permissions[action]
}

function isFieldReadOnly(field) {
	return (
		Boolean(field.read_only) ||
		isFormReadOnly.value ||
		(props.id && !permittedWriteFields.data?.includes(field.fieldname))
	)
}

async function handleDocInsert() {
	if (isCompletingInsert.value || editorUploadBusy.value || !validateMandatoryFields()) return
	isCompletingInsert.value = true
	try {
		if (!createdDocument.value) await docList.insert.submit(formModel.value)
		const doc = createdDocument.value
		await editorUploads.attachTo(doc.doctype, doc.name)
		await uploadAllAttachments(doc.doctype, doc.name, fileAttachments.value)
		toast.success(__("Success"), {
			description: __("{0} created successfully!", [__(props.doctype)]),
		})
		await router.replace({
			name: `${props.doctype.replace(/\s+/g, "")}DetailView`,
			params: { id: doc.name },
		})
	} catch (error) {
		formErrorMessage.value = createdDocument.value
			? __(
					"The document was created, but its files could not be attached. Select Retry Attachments to finish saving."
			  )
			: error.messages?.join("\n") || error.message
	} finally {
		isCompletingInsert.value = false
	}
}

function validateMandatoryFields() {
	const errorFields = props.fields
		.filter((field) => field.reqd && !field.hidden && !formModel.value[field.fieldname])
		.map((field) => field.label)

	if (errorFields.length) {
		formErrorMessage.value = `${errorFields.join(", ")} ${
			errorFields.length > 1 ? __("fields are mandatory") : __("field is mandatory")
		}`
		return false
	} else {
		formErrorMessage.value = ""
		return true
	}
}

async function handleDocUpdate(action) {
	if (isUpdatingDocument.value || editorUploadBusy.value || isFileUploading.value) return
	if (!documentResource.doc || !validateMandatoryFields()) return

	isUpdatingDocument.value = true
	try {
		if (action === "submit" || action === "cancel") {
			await updateDocumentLifecycle(documentResource.originalDoc, action)
			await documentResource.reload()
		} else {
			await documentResource.setValue.submit({ ...formModel.value })
			await documentResource.get.promise
		}
		resetForm()
		await nextTick()
		showSubmitDialog.value = false
		showCancelDialog.value = false
	} catch (error) {
		formErrorMessage.value = error.messages?.join("\n") || error.message
		if (action) toast.error(__("Error"), { description: formErrorMessage.value })
	} finally {
		isUpdatingDocument.value = false
	}
}

function saveForm() {
	if (
		isUpdatingDocument.value ||
		editorUploadBusy.value ||
		isCompletingInsert.value ||
		isFileUploading.value
	)
		return
	emit("validateForm")

	if (props.id) {
		handleDocUpdate()
	} else {
		handleDocInsert()
	}
}

function submitOrCancelForm() {
	if (
		isUpdatingDocument.value ||
		isFormDirty.value ||
		editorUploadBusy.value ||
		isFileUploading.value
	)
		return

	if (formModel.value.docstatus === 0) {
		emit("validateForm")
		showSubmitDialog.value = true
	} else if (formModel.value.docstatus === 1) {
		showCancelDialog.value = true
	}
}

function handleDocDelete() {
	if (isUpdatingDocument.value) return
	documentResource.delete.submit()
	showDeleteDialog.value = false
}

async function reloadDoc() {
	if (isUpdatingDocument.value) return
	await documentResource.reload()
	resetForm()
}

function resetForm() {
	formModel.value = { ...documentResource.doc }
	nextTick(() => {
		isFormDirty.value = false
		isFormUpdated.value = true
		emit("formReloaded")
	})
}
function handleDownload() {
	if (!props.id) return
	downloadPDF({
		doctype: props.doctype,
		docname: props.id,
		filename: props.id,
	})
}

async function setFormattedCurrency() {
	const companyCurrency = await getCompanyCurrency(formModel.value.company)

	props.fields.forEach((field) => {
		if (field.fieldtype !== "Currency") return
		if (!(field.readOnly || isFormReadOnly.value)) return

		if (field.options === "currency") {
			formModel.value[field.fieldname] = formatCurrency(
				formModel.value[field.fieldname],
				formModel.value.currency
			)
		} else {
			formModel.value[field.fieldname] = formatCurrency(
				formModel.value[field.fieldname],
				companyCurrency
			)
		}
	})
}

const isFormReadOnly = computed(() => {
	if (!isFormReady.value) return true
	if (isCompletingInsert.value || isUpdatingDocument.value || documentResource?.setValue?.loading)
		return true
	if (createdDocument.value) return true
	if (!props.id) return false

	// submitted & cancelled docs are read only
	if (formModel.value.docstatus !== 0) return true

	// read only due to workflow based on current user's roles
	if (workflow.value?.isReadOnly(formModel.value)) return true
})

const isFormReady = computed(() => {
	if (!props.id) return true

	return !documentResource.get.loading && documentResource.doc
})

onMounted(async () => {
	if (props.id) {
		await documentResource.get.promise
		formModel.value = { ...documentResource.doc }
		await docPermissions.reload()
		await permittedWriteFields.reload()
		await attachedFiles.reload()
		await setFormattedCurrency()

		// workflow
		workflow.value = useWorkflow(props.doctype)

		isFormDirty.value = false
	}
})
</script>
