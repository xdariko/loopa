<template>
  <section class="page page--account">
    <div class="page__account-panel">
      <h1 class="page__title">{{ email ? $t('account.title') : registering ? $t('account.registerTitle') : $t('account.signInTitle') }}</h1>
      <p v-if="error" class="page__error" role="alert">{{ error }}</p>
      <p v-if="loading" class="page__hint" role="status">{{ $t('account.checking') }}</p>
      <button v-else-if="loadFailed" type="button" class="page__button" @click="load">
        {{ $t('common.retry') }}
      </button>

      <template v-else-if="email">
        <p>{{ email }}</p>
        <div class="page__actions">
          <RouterLink to="/projects" class="page__button">{{ $t('account.myProjects') }}</RouterLink>

          <RouterLink to="/editor" class="page__button">{{ $t('common.openEditor') }}</RouterLink>
          <button type="button" class="page__button" :disabled="disabled" @click="logout">
            {{ $t('account.signOut') }}
          </button>
          <button type="button" class="page__button page__button--danger" :disabled="disabled" @click="removeAccount">
            {{ $t('account.delete') }}
          </button>
        </div>
      </template>

      <form v-else class="page__form" @submit.prevent="submit">
        <label>
          {{ $t('account.email') }}
          <input
            v-model.trim="address"
            type="email"
            autocomplete="email"
            maxlength="254"
            required />
        </label>

        <label>
          {{ $t('account.password') }}
          <input
            v-model="password"
            type="password"
            :autocomplete="registering ? 'new-password' : 'current-password'"
            :minlength="registering ? 8 : undefined"
            required />
        </label>

        <label v-if="registering">
          {{ $t('account.repeatPassword') }}
          <input 
            v-model="confirmation" 
            type="password" 
            autocomplete="new-password" 
            required />
        </label>

        <div class="page__actions">
          <button class="page__button page__button--primary" type="submit" :disabled="disabled">
            {{ registering ? $t('account.create') : $t('account.signIn') }}
          </button>
          <button type="button" class="page__button" :disabled="disabled" @click="toggleMode">
            {{ registering ? $t('account.alreadyRegistered') : $t('account.register') }}
          </button>
        </div>
      </form>
    </div>
  </section>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { authenticate, deleteAccount, getAccount, signOut } from '@/api/account'
import { useAccountStore } from '@/stores/account'
import { usePlaybackStore } from '@/stores/playback'
import { useProjectPersistenceStore } from '@/stores/projectPersistence'

export default defineComponent({
  data() {
    return {
      persistence: useProjectPersistenceStore(),
      playback: usePlaybackStore(),
      account: useAccountStore(),
      address: '',
      password: '',
      confirmation: '',
      registering: false,
      loading: true,
      loadFailed: false,
      busy: false,
      error: '',
      abort: new AbortController(),
    }
  },

  computed: {
    email() {
      return this.account.email
    },

    disabled() {
      return this.busy || this.persistence.isSaving
    },
  },

  mounted() {
    void this.load()
  },

  beforeRouteLeave() {
    return !this.busy
  },

  beforeUnmount() {
    this.abort.abort()
  },

  methods: {
    async load(): Promise<void> {
      this.loading = true
      this.loadFailed = false
      this.error = ''
      try {
        this.account.email = (await getAccount(this.abort.signal)).email
      } catch (cause) {
        if (!this.abort.signal.aborted) {
          this.account.email = null
          this.loadFailed = true
          this.report(cause)
        }
      } finally {
        this.loading = false
      }
    },

    toggleMode(): void {
      this.registering = !this.registering
      this.error = ''
      this.password = ''
      this.confirmation = ''
    },

    async submit(): Promise<void> {
      if (this.disabled) {
        return
      }
      if (this.registering && this.password !== this.confirmation) {
        this.error = this.$t('account.passwordMismatch')
        return
      }
      this.busy = true
      this.error = ''
      try {
        const account = await authenticate(
          this.address,
          this.password,
          this.registering ? this.confirmation : undefined,
        )
        this.persistence.detachSavedProject()
        this.account.email = account.email
        this.address = ''
        this.password = ''
        this.confirmation = ''
        this.registering = false
      } catch (cause) {
        this.report(cause)
      } finally {
        this.busy = false
      }
    },

    async logout(): Promise<void> {
      if (this.disabled || (this.persistence.isDirty && !window.confirm(this.$t('account.confirmSignOut')))) {
        return
      }
      await this.endAccountSession(signOut)
    },

    async removeAccount(): Promise<void> {
      if (this.disabled || !window.confirm(this.$t('account.confirmDelete'))) {
        return
      }
      await this.endAccountSession(deleteAccount)
    },

    async endAccountSession(action: () => Promise<void>): Promise<void> {
      this.busy = true
      this.error = ''
      try {
        await action()
        this.playback.reset()
        this.persistence.startNew()
        this.account.email = null
      } catch (cause) {
        this.report(cause)
      } finally {
        this.busy = false
      }
    },

    report(cause: unknown): void {
      this.error = cause instanceof Error ? cause.message : this.$t('common.requestFailed')
    },
  },
})
</script>
