<template>
	<ion-page>
		<ion-content class="ion-padding">
			<div v-if="resetPassword.showDialog" class="flex h-screen w-screen flex-col bg-surface-base">
				<header class="flex items-center justify-between px-6 py-4">
					<div class="text-lg-semibold text-ink-gray-8">
						{{ __("Reset Password") }}
					</div>
					<button
						type="button"
						class="text-sm text-ink-gray-5 hover:text-ink-gray-8 underline"
						@click="resetPassword.showDialog = false"
					>
						{{ __("Back to Login") }}
					</button>
				</header>
				<div class="flex flex-1 flex-col items-center justify-center px-8 text-center">
					<p class="text-ink-gray-6">
						{{ __("Your password has expired. Please reset your password to continue") }}
					</p>
					<a
						class="mt-6 inline-flex items-center justify-center gap-2 transition-colors focus:outline-none text-ink-base bg-surface-gray-10 hover:bg-surface-gray-9 active:bg-surface-gray-8 focus-visible:ring focus-visible:ring-outline-gray-4 h-9 text-base px-4 rounded-4"
						:href="resetPassword.link"
						target="_blank"
					>
						{{ __("Go to Reset Password page") }}
					</a>
				</div>
			</div>

			<div v-else class="flex h-screen w-screen flex-col justify-center bg-surface-base">
				<div class="flex flex-col mx-auto gap-3 items-center">
					<FrappeHRLogo class="h-8 w-8" />
					<div class="text-4xl-semibold text-ink-gray-8 text-center">
						{{ __("Login to Frappe HR") }}
					</div>
				</div>

				<div class="mx-auto mt-10 w-full px-8 sm:w-96">
					<form
						v-if="!user_pass_login_disabled.data"
						class="flex flex-col space-y-4"
						@submit.prevent="submit"
					>
						<TextInput
							:label="__('Email')"
							:placeholder="__('johndoe@mail.com')"
							v-model="email"
							type="text"
							autocomplete="username"
						/>
						<TextInput
							:label="__('Password')"
							type="password"
							placeholder="••••••"
							v-model="password"
							autocomplete="current-password"
						/>
						<ErrorMessage :message="errorMessage" />
						<Button
							type="submit"
							:loading="session.login.loading"
							variant="solid"
							class="disabled:bg-surface-gray-8 disabled:text-ink-base !mt-6"
						>
							{{ __("Login") }}
						</Button>
						<div class="text-center mt-4">
							<router-link
								:to="{ name: 'ForgotPassword', query: email ? { email } : {} }"
								class="text-sm text-ink-gray-5 hover:text-ink-gray-8 underline"
							>
								{{ __("Forgot Password?") }}
							</router-link>
						</div>
					</form>

					<template v-if="authProviders.data?.length">
						<div
							v-if="!user_pass_login_disabled.data"
							class="text-center text-sm text-ink-gray-5 my-4"
						>
							or
						</div>
						<div class="space-y-4">
							<a
								v-for="provider in authProviders.data"
								:key="provider.name"
								class="flex items-center justify-center gap-2 transition-colors focus:outline-none text-ink-gray-7 bg-surface-gray-2 hover:bg-surface-gray-3 active:bg-surface-gray-4 focus-visible:ring focus-visible:ring-outline-gray-4 h-7 text-base p-2 rounded-4"
								:href="provider.auth_url"
							>
								<img class="h-4 w-4" :src="provider.icon" :alt="provider.provider_name" />
								<span>Login with {{ provider.provider_name }}</span>
							</a>
						</div>
					</template>

					<div v-else-if="user_pass_login_disabled.data" class="text-center text-ink-gray-5 py-8">
						{{ __("No login methods are available. Please contact your administrator.") }}
					</div>
				</div>
			</div>
			<Dialog v-model:open="otp.showDialog">
				<template #title>
					<h2 class="text-lg-bold">{{ __("OTP Verification") }}</h2>
				</template>
				<template #default>
					<p class="mb-4" v-if="otp.verification.prompt">
						{{ otp.verification.prompt }}
					</p>

					<form class="flex flex-col space-y-4" @submit.prevent="submit">
						<TextInput
							:label="__('OTP Code')"
							type="text"
							placeholder="000000"
							v-model="otp.code"
							autocomplete="one-time-code"
						/>
						<ErrorMessage :message="errorMessage" />
						<Button
							type="submit"
							:loading="session.otp.loading"
							variant="solid"
							class="disabled:bg-surface-gray-8 disabled:text-ink-base !mt-6"
						>
							{{ __("Verify") }}
						</Button>
					</form>
				</template>
			</Dialog>
		</ion-content>
	</ion-page>
</template>

<script setup>
import { IonPage, IonContent } from "@ionic/vue"
import { inject, reactive, ref } from "vue"
import { TextInput, Button, ErrorMessage, Dialog, createResource } from "frappe-ui"

import FrappeHRLogo from "@/components/icons/FrappeHRLogo.vue"

const email = ref(null)
const password = ref(null)
const errorMessage = ref("")

const resetPassword = reactive({
	showDialog: false,
	link: "",
})
const otp = reactive({
	showDialog: false,
	tmp_id: "",
	code: "",
	verification: {},
})

const session = inject("$session")
const __ = inject("$translate")

async function submit(e) {
	try {
		let response
		if (otp.showDialog) {
			response = await session.otp(otp.tmp_id, otp.code)
		} else {
			response = await session.login(email.value, password.value)
		}

		if (response.message === "Password Reset") {
			resetPassword.showDialog = true
			resetPassword.link = response.redirect_to
		} else {
			resetPassword.showDialog = false
			resetPassword.link = ""
		}

		// OTP verification
		if (response.verification) {
			if (response.verification.setup) {
				otp.showDialog = true
				otp.tmp_id = response.tmp_id
				otp.verification = response.verification
			} else {
				// Don't bother handling impossible OTP setup (e.g. no phone number).
				window.open("/login?redirect-to=" + encodeURIComponent(window.location.pathname), "_blank")
			}
		}
	} catch (error) {
		errorMessage.value = error.messages.join("\n")
	}
}

const user_pass_login_disabled = createResource({
	url: "hrms.api.system_settings.get_user_pass_login_disabled",
	method: "GET",
	initialData: 1,
	auto: true,
})

const authProviders = createResource({
	url: "hrms.api.oauth.oauth_providers",
	auto: true,
})
</script>
