<template>
  <section class="page">
    <h1 class="page__title">{{ project?.title ?? 'Общий проект' }}</h1>
    <p v-if="loading" class="page__hint" role="status">Загружаем проект…</p>
    <p v-if="error" class="page__error" role="alert">{{ error }}</p>
    <div v-if="project" class="page__actions">
      <button type="button" class="page__button page__button--primary" @click="togglePlayback">
        {{ playback.isPlaying ? 'Пауза' : 'Воспроизвести' }}
      </button>
      <button
        v-if="!accountRequired"
        type="button"
        class="page__button"
        :disabled="copying || persistence.isSaving"
        @click="makeCopy"
      >
        {{ copying ? 'Копируем…' : 'Сделать копию' }}
      </button>
      <RouterLink v-else to="/account" class="page__button"
        >Войти или зарегистрироваться</RouterLink
      >
    </div>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'

import { AccountRequiredError, copySharedProject, getSharedProject } from '@/api/projects'
import type { Project } from '@/domain/types'
import { usePlaybackStore } from '@/stores/playback'
import { prepareProject, useProjectPersistenceStore } from '@/stores/projectPersistence'

const props = defineProps<{ token: string }>()
const router = useRouter()
const playback = usePlaybackStore()
const persistence = useProjectPersistenceStore()
const project = shallowRef<Project | null>(null)
const loading = ref(true)
const copying = ref(false)
const accountRequired = ref(false)
const error = ref('')
let controller = new AbortController()

watch(
  () => props.token,
  async (token, _, onCleanup) => {
    const request = new AbortController()
    controller = request
    const { signal } = request
    onCleanup(() => request.abort())
    project.value = null
    playback.setPreview(null)
    loading.value = true
    accountRequired.value = false
    error.value = ''
    try {
      const remote = await getSharedProject(token, signal)
      project.value = await prepareProject(remote, signal)
      playback.setPreview(project.value)
    } catch (reason) {
      if (!signal.aborted) {
        error.value = reason instanceof Error ? reason.message : 'Не удалось открыть проект.'
      }
    } finally {
      if (!signal.aborted) {
        loading.value = false
      }
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  playback.setPreview(null)
})

async function togglePlayback(): Promise<void> {
  error.value = ''
  try {
    await playback.toggle()
  } catch {
    error.value = 'Не удалось запустить воспроизведение.'
  }
}

async function makeCopy(): Promise<void> {
  if (persistence.isDirty && !window.confirm('Открыть копию без сохранения текущих изменений?')) {
    return
  }
  const { signal } = controller
  copying.value = true
  error.value = ''
  try {
    const remote = await copySharedProject(props.token)
    await persistence.open(remote, signal)
    await router.push({ name: 'editor' })
  } catch (reason) {
    if (!signal.aborted) {
      accountRequired.value = reason instanceof AccountRequiredError
      error.value = reason instanceof Error ? reason.message : 'Не удалось сделать копию.'
    }
  } finally {
    copying.value = false
  }
}
</script>
