<template>
	<ion-page>
		<ion-content class="ion-padding">
			<div class="flex flex-col h-screen w-screen">
				<div class="w-full sm:w-96">
					<header
						class="flex flex-row bg-surface-base shadow-sm py-4 px-3 items-center justify-between border-b sticky top-0 z-10"
					>
						<div class="flex flex-row items-center">
							<Button variant="ghost" class="!pl-0 hover:bg-surface-base" @click="router.back()">
								<Icon name="lucide-chevron-left" class="h-5 w-5" />
							</Button>
							<h2 class="text-2xl-semibold text-ink-gray-8">{{ __("Notifications") }}</h2>
						</div>
					</header>

					<div class="flex flex-col gap-4 mt-5 p-4">
						<div class="flex flex-wrap gap-2 justify-between items-center">
							<div class="text-lg-semibold text-ink-gray-7" v-if="unreadNotificationsCount.data">
								{{ __("{0} Unread", [unreadNotificationsCount.data]) }}
							</div>
							<div class="flex flex-wrap ml-auto gap-1">
								<Button
									variant="outline"
									:disabled="notifications.list.loading"
									@click="toggleReadFilter"
								>
									{{ showAll ? __("Show Unread") : __("Show All") }}
								</Button>
								<Button
									v-if="allowPushNotifications"
									variant="outline"
									@click="router.push({ name: 'Settings' })"
								>
									<template #prefix>
										<Icon name="lucide-settings" class="w-4" />
									</template>
									{{ __("Settings") }}
								</Button>
								<Button
									v-if="unreadNotificationsCount.data"
									variant="outline"
									@click="markAllAsRead.submit"
									:loading="markAllAsRead.loading"
								>
									<template #prefix>
										<Icon name="lucide-check-circle" class="w-4" />
									</template>
									{{ __("Mark all as read") }}
								</Button>
							</div>
						</div>

						<div class="flex flex-col bg-surface-base rounded-4" v-if="notifications.data?.length">
							<router-link
								:class="[
									'flex flex-row items-start p-4 justify-between border-b before:mt-3',
									`before:content-[''] before:mr-2 before:shrink-0 before:w-1.5 before:h-1.5 before:rounded-full`,
									item.read ? 'bg-surface-base' : 'before:bg-surface-blue-6',
								]"
								v-for="item in notifications.data"
								:key="item.name"
								:to="getItemRoute(item)"
								@click="markAsRead(item.name)"
							>
								<EmployeeAvatar :userID="item.from_user" size="lg" />
								<div class="flex flex-col gap-0.5 grow ml-3">
									<div
										class="text-sm font-normal leading-5 text-ink-gray-7"
										v-html="item.message"
									></div>
									<div class="text-xs font-normal text-ink-gray-4">
										{{ dayjs(item.creation).fromNow() }}
									</div>
								</div>
							</router-link>
						</div>
						<div v-if="notifications.data?.length && notifications.hasNextPage" class="flex">
							<Button
								variant="outline"
								class="ml-auto"
								@click="notifications.next()"
								:loading="notifications.list.loading"
							>
								{{ __("Load more") }}
							</Button>
						</div>
						<EmptyState
							v-else-if="!notifications.list.loading && !notifications.data?.length"
							:message="
								showAll ? __('You have no notifications') : __('You have no unread notifications')
							"
						/>
					</div>
				</div>
			</div>
		</ion-content>
	</ion-page>
</template>

<script setup>
import { IonContent, IonPage } from "@ionic/vue"
import { useRouter } from "vue-router"
import { createResource, Icon } from "frappe-ui"

import { computed, inject, onMounted } from "vue"
import EmployeeAvatar from "@/components/EmployeeAvatar.vue"
import EmptyState from "@/components/EmptyState.vue"

import {
	unreadNotificationsCount,
	notifications,
	arePushNotificationsEnabled,
} from "@/data/notifications"

const dayjs = inject("$dayjs")
const router = useRouter()
const __ = inject("$translate")
const showAll = computed(() => notifications.filters.read !== 0)

const allowPushNotifications = computed(
	() => window.frappe?.boot.push_relay_server_url && arePushNotificationsEnabled.data
)

const markAllAsRead = createResource({
	url: "hrms.api.mark_all_notifications_as_read",
	onSuccess() {
		refreshNotifications()
	},
})

function markAsRead(name) {
	notifications.setValue.submit(
		{ name, read: 1 },
		{
			onSuccess: () => {
				refreshNotifications()
			},
		}
	)
}

function getItemRoute(item) {
	return {
		name: `${item.reference_document_type.replace(/\s+/g, "")}DetailView`,
		params: { id: item.reference_document_name },
	}
}

onMounted(refreshNotifications)

function refreshNotifications() {
	notifications.start = 0
	return notifications.reload()
}

function toggleReadFilter() {
	const filters = { ...notifications.filters }
	if (showAll.value) {
		filters.read = 0
	} else {
		delete filters.read
	}
	notifications.update({ filters })
	notifications.setData(null)
	refreshNotifications()
}
</script>
