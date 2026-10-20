<template>
	<div class="flex flex-col bg-surface-base rounded-4 w-full py-6 px-4 border-none">
		<h2 class="text-lg-bold text-ink-gray-8">
			{{ __("Hey, {0} 👋", [employee?.data?.first_name]) }}
		</h2>

		<template v-if="settings.data?.allow_employee_checkin_from_mobile_app">
			<div class="text-sm-medium text-ink-gray-4 mt-1.5" v-if="lastLog?.time">
				<span>{{
					__("Last {0} was at {1}", [__(lastLogType), formatTimestamp(lastLog.time)])
				}}</span>
				<span class="whitespace-pre"> &middot; </span>
				<router-link :to="{ name: 'EmployeeCheckinListView' }" v-slot="{ navigate }">
					<span @click="navigate" class="underline">{{ __("View List") }}</span>
				</router-link>
			</div>
			<Button
				class="mt-4 mb-1 drop-shadow-sm py-5 text-base"
				id="open-checkin-modal"
				:loading="checkins.list.loading"
				@click="handleEmployeeCheckin"
			>
				<template #prefix>
					<Icon
						:name="
							nextAction.action === 'IN' ? 'lucide-arrow-right-circle' : 'lucide-arrow-left-circle'
						"
						class="w-4"
					/>
				</template>
				{{ nextAction.label }}
			</Button>
		</template>

		<div v-else class="text-sm-medium text-ink-gray-4 mt-1.5">
			{{ dayjs().format("ddd, D MMMM, YYYY") }}
		</div>
	</div>

	<BottomSheet
		v-if="settings.data?.allow_employee_checkin_from_mobile_app"
		v-model:open="showCheckinSheet"
		:title="nextAction.label"
		:dismissible="!checkins.insert.loading"
	>
		<div
			class="flex w-full flex-col items-center gap-5 px-4 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
		>
			<div class="flex flex-col gap-1.5 mt-2 items-center justify-center">
				<div class="text-2xl-bold">
					{{ dayjs(checkinTimestamp).format("hh:mm:ss a") }}
				</div>
				<div class="text-ink-gray-4 text-sm-medium">
					{{ dayjs().format("D MMM, YYYY") }}
				</div>
			</div>

			<template v-if="settings.data?.allow_geolocation_tracking">
				<span v-if="locationStatus" class="text-ink-gray-4 text-sm-medium">
					{{ locationStatus }}
				</span>

				<div class="rounded-4 border-4 translate-z-0 block overflow-hidden w-full h-[170px]">
					<iframe
						width="100%"
						height="170"
						frameborder="0"
						scrolling="no"
						marginheight="0"
						marginwidth="0"
						style="border: 0"
						:src="`https://maps.google.com/maps?q=${latitude},${longitude}&hl=en&z=15&amp;output=embed`"
					>
					</iframe>
				</div>
			</template>

			<Button
				:loading="checkins.insert.loading"
				variant="solid"
				class="w-full py-5 text-sm disabled:bg-surface-gray-8"
				@click="submitLog(nextAction.action)"
			>
				{{ __("Confirm {0}", [nextAction.label]) }}
			</Button>
		</div>
	</BottomSheet>
</template>

<script setup>
import { BottomSheet, createListResource, toast, Icon } from "frappe-ui"
import { computed, inject, ref, onMounted, onBeforeUnmount } from "vue"

import { formatTimestamp } from "@/utils/formatters"
import { settings } from "@/data/settings"

const DOCTYPE = "Employee Checkin"

const socket = inject("$socket")
const employee = inject("$employee")
const dayjs = inject("$dayjs")
const __ = inject("$translate")
const checkinTimestamp = ref(null)
const showCheckinSheet = ref(false)
const latitude = ref(0)
const longitude = ref(0)
const locationStatus = ref("")

const checkins = createListResource({
	doctype: DOCTYPE,
	fields: ["name", "employee", "employee_name", "log_type", "time", "device_id"],
	filters: {
		employee: employee.data.name,
	},
	orderBy: "time desc",
})
checkins.reload()

const lastLog = computed(() => {
	if (!checkins.data?.length) return null
	return checkins.data[0]
})

const lastLogType = computed(() => {
	return lastLog?.value?.log_type === "IN" ? "check-in" : "check-out"
})

const nextAction = computed(() => {
	return lastLog?.value?.log_type === "IN"
		? { action: "OUT", label: __("Check Out") }
		: { action: "IN", label: __("Check In") }
})

function handleLocationSuccess(position) {
	latitude.value = position.coords.latitude
	longitude.value = position.coords.longitude

	locationStatus.value = [
		__("Latitude: {0}°", [Number(latitude.value).toFixed(5)]),
		__("Longitude: {0}°", [Number(longitude.value).toFixed(5)]),
	].join(", ")
}

function handleLocationError(error) {
	locationStatus.value = __("Unable to retrieve your location")
	if (error) locationStatus.value += `: ERROR(${error.code}): ${error.message}`
}

const fetchLocation = () => {
	if (!navigator.geolocation) {
		locationStatus.value = __("Geolocation is not supported by your current browser")
	} else {
		locationStatus.value = __("Locating...")
		navigator.geolocation.getCurrentPosition(handleLocationSuccess, handleLocationError)
	}
}

const handleEmployeeCheckin = () => {
	checkinTimestamp.value = dayjs().format("YYYY-MM-DD HH:mm:ss")
	showCheckinSheet.value = true

	if (settings.data?.allow_geolocation_tracking) {
		fetchLocation()
	}
}

const submitLog = (logType) => {
	const actionLabel = logType === "IN" ? __("Check-in") : __("Check-out")

	checkins.insert.submit(
		{
			employee: employee.data.name,
			log_type: logType,
			time: checkinTimestamp.value,
			latitude: latitude.value,
			longitude: longitude.value,
		},
		{
			onSuccess(data) {
				if (!data?.name) {
					toast.error(__("Error"), {
						description: __("{0} failed!", [actionLabel]),
					})
					return
				}

				showCheckinSheet.value = false
				toast.success(__("Success"), {
					description: __("{0} successful!", [actionLabel]),
				})
			},
			onError(error) {
				let messages = error.messages?.length ? error.messages : [__("{0} failed!", [actionLabel])]

				for (const message of messages) {
					toast.error(__("Error"), {
						description: message || __("{0} failed!", [actionLabel]),
					})
				}
			},
		}
	)
}

onMounted(() => {
	socket.emit("doctype_subscribe", DOCTYPE)
	socket.on("list_update", (data) => {
		if (data.doctype == DOCTYPE) {
			checkins.reload()
		}
	})
})

onBeforeUnmount(() => {
	socket.emit("doctype_unsubscribe", DOCTYPE)
	socket.off("list_update")
})
</script>
