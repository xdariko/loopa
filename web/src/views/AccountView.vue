<template>
  <section class="page page--account">
    <div class="page__account-panel">
      <h1 class="page__title">{{ email ? 'Аккаунт' : registering ? 'Регистрация' : 'Вход' }}</h1>
      <p v-if="error" class="page__error" role="alert">{{ error }}</p>
      <p v-if="loading" class="page__hint" role="status">Проверяем аккаунт…</p>
      <button v-else-if="loadFailed" type="button" class="page__button" @click="load">
        Повторить
      </button>
      <template v-else-if="email">
        <p>{{ email }}</p>
        <div class="page__actions">
          <RouterLink to="/projects" class="page__button">Мои проекты</RouterLink>

          <RouterLink to="/editor" class="page__button">Открыть редактор</RouterLink>
          <button type="button" class="page__button" :disabled="disabled" @click="logout">
            Выйти
          </button>
        </div>
      </template>
      <form v-else class="page__form" @submit.prevent="submit">
        <label>
          Электронная почта
          <input
            v-model.trim="address"
            type="email"
            autocomplete="email"
            maxlength="254"
            required
          />
        </label>

        <label>
          Пароль
          <input
            v-model="password"
            type="password"
            :autocomplete="registering ? 'new-password' : 'current-password'"
            :minlength="registering ? 8 : undefined"
            required
          />
        </label>

        <label v-if="registering">
          Повторите пароль
          <input v-model="confirmation" type="password" autocomplete="new-password" required />
        </label>

        <div class="page__actions">
          <button class="page__button page__button--primary" type="submit" :disabled="disabled">
            {{ registering ? 'Создать аккаунт' : 'Войти' }}
          </button>
          <button type="button" class="page__button" :disabled="disabled" @click="toggleMode">
            {{ registering ? 'Уже есть аккаунт' : 'Зарегистрироваться' }}
          </button>
        </div>
      </form>
    </div>
  </section>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { authenticate, getAccount, signOut } from '@/api/account'
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
        this.error = 'Пароли не совпадают.'
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
      if (
        this.disabled ||
        (this.persistence.isDirty && !window.confirm('Выйти без сохранения проекта?'))
      ) {
        return
      }
      this.busy = true
      this.error = ''
      try {
        await signOut()
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
      this.error = cause instanceof Error ? cause.message : 'Не удалось выполнить запрос.'
    },
  },
})
</script>
