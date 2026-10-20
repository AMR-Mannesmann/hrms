<template>
	<div class="flex flex-col w-full gap-5" v-if="summary.data">
		<div class="text-lg-bold text-ink-gray-7">{{ __("Expense Claim Summary") }}</div>
		<div class="flex flex-col gap-4 bg-surface-base py-3 px-3.5 rounded-6 border-none">
			<div class="flex flex-col gap-1.5">
				<span class="text-ink-gray-5 text-base-medium leading-5">
					{{ __("Total Claimed Amount") }}
				</span>
				<span class="text-ink-gray-7 text-lg-bold leading-6">
					{{ formatCurrency(total_claimed_amount, company_currency) }}
				</span>
			</div>

			<div class="flex flex-row justify-between">
				<div class="flex flex-col gap-1">
					<div class="flex flex-row gap-1 items-center">
						<span class="text-ink-gray-5 text-sm-medium leading-5">
							{{ __("Pending") }}
						</span>
						<Icon name="lucide-alert-circle" class="text-ink-yellow-5 h-3 w-3" />
					</div>
					<span class="text-ink-gray-7 text-base-semibold leading-6">
						{{ formatCurrency(summary.data?.total_pending_amount, company_currency) }}
					</span>
				</div>
				<div class="flex flex-col gap-1">
					<div class="flex flex-row gap-1 items-center">
						<span class="text-ink-gray-5 text-sm-medium leading-5">
							{{ __("Approved") }}
						</span>
						<Icon name="lucide-check-circle" class="text-ink-green-5 h-3 w-3" />
					</div>
					<span class="text-ink-gray-7 text-base-semibold leading-6">
						{{ formatCurrency(summary.data?.total_approved_amount, company_currency) }}
					</span>
				</div>

				<div class="flex flex-col gap-1">
					<div class="flex flex-row gap-1 items-center">
						<span class="text-ink-gray-5 text-sm-medium leading-5">
							{{ __("Rejected") }}
						</span>
						<Icon name="lucide-x-circle" class="text-ink-red-5 h-3 w-3" />
					</div>
					<span class="text-ink-gray-7 text-base-semibold leading-6">
						{{
							formatCurrency(
								summary.data?.total_rejected_amount +
									(summary.data?.total_claimed_in_approved - summary.data?.total_approved_amount),
								company_currency
							)
						}}
					</span>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { Icon } from "frappe-ui"
import { computed } from "vue"

import { expenseClaimSummary as summary } from "@/data/claims"

import { formatCurrency } from "@/utils/formatters"

const total_claimed_amount = computed(() => {
	return (
		summary.data?.total_pending_amount +
		summary.data?.total_claimed_in_approved +
		summary.data?.total_rejected_amount
	)
})

const company_currency = computed(() => summary.data?.currency)
</script>
