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

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

import { authenticate, getAccount, signOut } from '@/api/account'
import { usePlaybackStore } from '@/stores/playback'
import { useProjectPersistenceStore } from '@/stores/projectPersistence'

const persistence = useProjectPersistenceStore()
const playback = usePlaybackStore()
const email = ref<string | null>(null)
const address = ref('')
const password = ref('')
const confirmation = ref('')
const registering = ref(false)
const loading = ref(true)
const loadFailed = ref(false)
const busy = ref(false)
const error = ref('')
const abort = new AbortController()
const disabled = computed(() => busy.value || persistence.isSaving)

onMounted(load)
onBeforeUnmount(() => abort.abort())
onBeforeRouteLeave(() => !busy.value)

async function load(): Promise<void> {
  loading.value = true
  loadFailed.value = false
  error.value = ''
  try {
    email.value = (await getAccount(abort.signal)).email
  } catch (cause) {
    if (!abort.signal.aborted) {
      loadFailed.value = true
      report(cause)
    }
  } finally {
    loading.value = false
  }
}

function toggleMode(): void {
  registering.value = !registering.value
  error.value = ''
  password.value = ''
  confirmation.value = ''
}

async function submit(): Promise<void> {
  if (disabled.value) {
    return
  }
  if (registering.value && password.value !== confirmation.value) {
    error.value = 'Пароли не совпадают.'
    return
  }
  busy.value = true
  error.value = ''
  try {
    const account = await authenticate(
      address.value,
      password.value,
      registering.value ? confirmation.value : undefined,
    )
    persistence.detachSavedProject()
    email.value = account.email
    address.value = ''
    password.value = ''
    confirmation.value = ''
    registering.value = false
  } catch (cause) {
    report(cause)
  } finally {
    busy.value = false
  }
}

async function logout(): Promise<void> {
  if (disabled.value || (persistence.isDirty && !window.confirm('Выйти без сохранения проекта?'))) {
    return
  }
  busy.value = true
  error.value = ''
  try {
    await signOut()
    playback.reset()
    persistence.startNew()
    email.value = null
  } catch (cause) {
    report(cause)
  } finally {
    busy.value = false
  }
}

function report(cause: unknown): void {
  error.value = cause instanceof Error ? cause.message : 'Не удалось выполнить запрос.'
}
</script>
