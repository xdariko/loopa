<template>
  <section class="page">
    <h1 class="page__title">Проекты</h1>
    <p v-if="loading" class="page__hint" role="status">Загружаем проекты…</p>
    <p v-else-if="!error && !projects.length" class="page__hint">Сохранённых проектов пока нет.</p>
    <p v-if="error" class="page__error" role="alert">{{ error }}</p>
    <button v-if="loadFailed" type="button" class="page__button" @click="refresh">Повторить</button>
    <ul v-if="projects.length" class="page__list">
      <li v-for="project in projects" :key="project.id" class="page__row">
        <div class="page__project">
          <p>{{ project.title }}</p>
          <time :datetime="project.updated_at" class="page__hint">{{
            dateFormat.format(new Date(project.updated_at))
          }}</time>
        </div>
        <button
          type="button"
          class="page__button"
          :disabled="opening !== null || persistence.isSaving"
          @click="open(project.id)"
        >
          {{ opening === project.id ? 'Открываем…' : 'Открыть' }}
        </button>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'

import { getProject, listProjects, type ProjectSummary } from '@/api/projects'
import { usePlaybackStore } from '@/stores/playback'
import { useProjectPersistenceStore } from '@/stores/projectPersistence'

const router = useRouter()
const persistence = useProjectPersistenceStore()
const playback = usePlaybackStore()
const controller = new AbortController()
const projects = shallowRef<ProjectSummary[]>([])
const loading = ref(false)
const opening = ref<number | null>(null)
const loadFailed = ref(false)
const error = ref('')
const dateFormat = new Intl.DateTimeFormat('ru', { dateStyle: 'medium', timeStyle: 'short' })

onMounted(refresh)
onBeforeUnmount(() => controller.abort())

async function refresh(): Promise<void> {
  loading.value = true
  loadFailed.value = false
  error.value = ''
  try {
    projects.value = await listProjects(controller.signal)
  } catch (reason) {
    if (!controller.signal.aborted) {
      error.value = reason instanceof Error ? reason.message : 'Не удалось загрузить проекты.'
      loadFailed.value = true
    }
  } finally {
    loading.value = false
  }
}

async function open(id: number): Promise<void> {
  if (persistence.isDirty && !window.confirm('Открыть проект без сохранения текущих изменений?')) {
    return
  }
  opening.value = id
  error.value = ''
  try {
    const remote = await getProject(id, controller.signal)
    await persistence.open(remote, controller.signal)
    playback.reset()
    await router.push({ name: 'editor' })
  } catch (reason) {
    if (!controller.signal.aborted) {
      error.value = reason instanceof Error ? reason.message : 'Не удалось открыть проект.'
    }
  } finally {
    opening.value = null
  }
}
</script>
