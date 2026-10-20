<template>
	<div class="h-12 bg-surface-base border-b px-12 flex items-center">
		<div class="flex items-center space-x-1.5">
			<a
				href="/desk/hr-setup"
				class="text-ink-gray-6 hover:text-ink-gray-7 flex items-center"
			>
				<FrappeHRLogo class="h-6 w-6 mr-2.5" />
				Frappe HR
			</a>
			<span class="lucide-chevron-right h-4 w-4" aria-hidden="true" />
			<span class="font-medium">Roster</span>
		</div>
		<div class="ml-auto">
			<Dropdown
				:options="[
					{
						label: 'My Account',
						onClick: () => goTo('/me'),
					},
					{
						label: 'Log Out',
						onClick: () => logout.submit(),
					},
					{
						label: 'Switch to Desk',
						onClick: () => goTo('/app'),
					},
				]"
			>
				<Avatar
					:label="props.user?.full_name"
					:image="props.user?.user_image"
					size="lg"
					class="cursor-pointer"
				/>
			</Dropdown>
		</div>
	</div>
</template>

<script setup lang="ts">
import { Dropdown, Avatar, createResource } from "frappe-ui";
import FrappeHRLogo from "../icons/FrappeHRLogo.vue";

import { User } from "../views/Home.vue";
import { goTo, raiseToast } from "../utils";

const props = defineProps<{
	user: User;
}>();

// RESOURCES

const logout = createResource({
	url: "logout",
	onSuccess() {
		goTo("/login");
	},
	onError(error: { messages: string[] }) {
		raiseToast("error", error.messages[0]);
	},
});
</script>
