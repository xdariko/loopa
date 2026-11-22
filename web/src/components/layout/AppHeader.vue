<template>
  <header class="header">
    <RouterLink to="/" class="header__logo">loopa</RouterLink>

    <input
      v-if="isEditor"
      v-model="projectTitle"
      class="header__title"
      type="text"
      aria-label="Название проекта"
      @focus="status = ''"
    />

    <nav class="header__actions">
      <RouterLink to="/projects" class="header__link">Открыть</RouterLink>
      <template v-if="isEditor">
        <button
          type="button"
          class="header__link"
          :disabled="persistence.isSaving"
          @keydown.space.stop
          @click="newProject"
        >
          Новый
        </button>
        <button
          v-if="persistence.shareToken"
          type="button"
          class="header__link"
          :disabled="persistence.isSaving"
          @keydown.space.stop
          @click="copyLink"
        >
          Скопировать ссылку
        </button>
        <button
          type="button"
          class="header__button"
          :disabled="persistence.isSaving"
          @keydown.space.stop
          @click="save"
        >
          {{ persistence.isSaving ? 'Сохраняем…' : 'Сохранить' }}
        </button>
      </template>
    </nav>
    <div v-if="isEditor && (status || shareLink)" class="header__feedback">
      <p v-if="status" role="status">{{ status }}</p>
      <input
        v-if="shareLink"
        class="header__share-link"
        :value="shareLink"
        readonly
        aria-label="Ссылка на проект"
        @focus="selectLink"
      />
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { usePlaybackStore } from '@/stores/playback'
import { useProjectStore } from '@/stores/project'
import { useProjectPersistenceStore } from '@/stores/projectPersistence'

const route = useRoute()
const router = useRouter()
const project = useProjectStore()
const playback = usePlaybackStore()
const persistence = useProjectPersistenceStore()
const isEditor = computed(() => route.name === 'editor')
const projectTitle = computed({
  get: () => project.project.title,
  set: (title: string) => project.rename(title),
})
const status = ref('')
const shareLink = ref('')

watch(isEditor, () => {
  status.value = ''
  shareLink.value = ''
})

async function save(): Promise<void> {
  status.value = ''
  shareLink.value = ''
  try {
    await persistence.save()
    status.value = persistence.isDirty
      ? 'Сохранено. Более свежие изменения ещё не сохранены.'
      : 'Проект сохранён.'
  } catch (error) {
    status.value = error instanceof Error ? error.message : 'Не удалось сохранить проект.'
  }
}

function newProject(): void {
  if (persistence.isDirty && !window.confirm('Начать новый проект без сохранения изменений?')) {
    return
  }
  playback.reset()
  persistence.startNew()
  status.value = ''
  shareLink.value = ''
}

async function copyLink(): Promise<void> {
  const token = persistence.shareToken
  if (!token) {
    return
  }
  const href = router.resolve({ name: 'shared', params: { token } }).href
  const url = new URL(href, window.location.origin).href
  try {
    await navigator.clipboard.writeText(url)
    status.value = 'Ссылка скопирована.'
  } catch {
    shareLink.value = url
    status.value = 'Скопируйте ссылку из поля.'
  }
}

function selectLink(event: FocusEvent): void {
  if (event.target instanceof HTMLInputElement) {
    event.target.select()
  }
}
</script>
