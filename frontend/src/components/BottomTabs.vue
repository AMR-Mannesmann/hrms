<template>
	<div
		ref="navigation"
		slot="bottom"
		class="mx-auto mb-3 w-[calc(100%-1.5rem)] max-w-[360px] overflow-hidden rounded-6 border border-outline-gray-2 bg-surface-base shadow-md"
	>
		<MobileNav class="w-full !border-t-0">
			<MobileNavItem
				v-for="item in tabItems"
				:key="item.title"
				:label="item.title"
				:icon="item.icon"
				:route="item.route"
				:active="isActive(item.route)"
				@click="scrollActiveTabToTop(item.route)"
			/>
		</MobileNav>
	</div>
</template>

<script setup>
import { useRoute } from "vue-router"

import { MobileNav, MobileNavItem } from "frappe-ui"

import HomeIcon from "@/components/icons/HomeIcon.vue"
import LeaveIcon from "@/components/icons/LeaveIcon.vue"
import ExpenseIcon from "@/components/icons/ExpenseIcon.vue"
import SalaryIcon from "@/components/icons/SalaryIcon.vue"
import AttendanceIcon from "@/components/icons/AttendanceIcon.vue"
import { inject, ref } from "vue"

const __ = inject("$translate")

const route = useRoute()
const navigation = ref(null)
const isActive = (itemRoute) =>
	route.path === itemRoute || route.path.startsWith(`${itemRoute}/`)

function scrollActiveTabToTop(itemRoute) {
	if (route.path !== itemRoute) return
	const page = navigation.value?.parentElement?.querySelector(".ion-page:not(.ion-page-hidden)")
	page?.querySelector("ion-content")?.scrollToTop(200)
}

const tabItems = [
	{
		icon: HomeIcon,
		title: __("Home"),
		route: "/home",
	},
	{
		icon: AttendanceIcon,
		title: __("Attendance"),
		route: "/dashboard/attendance",
	},
	{
		icon: LeaveIcon,
		title: __("Leaves"),
		route: "/dashboard/leaves",
	},
	{
		icon: ExpenseIcon,
		title: __("Expenses"),
		route: "/dashboard/expense-claims",
	},
	{
		icon: SalaryIcon,
		title: __("Salary"),
		route: "/dashboard/salary-slips",
	},
]
</script>
