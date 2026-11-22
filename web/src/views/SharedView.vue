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
      <RouterLink v-else to="/account" class="page__button">Войти или зарегистрироваться</RouterLink
      >
    </div>
  </section>
</template>

<script lang="ts">
import { defineComponent, onWatcherCleanup } from 'vue'

import { AccountRequiredError, copySharedProject, getSharedProject } from '@/api/projects'
import type { Project } from '@/domain/types'
import { usePlaybackStore } from '@/stores/playback'
import { prepareProject, useProjectPersistenceStore } from '@/stores/projectPersistence'

export default defineComponent({
  props: {
    token: { type: String, required: true },
  },

  data() {
    return {
      playback: usePlaybackStore(),
      persistence: useProjectPersistenceStore(),
      project: null as Project | null,
      loading: true,
      copying: false,
      accountRequired: false,
      error: '',
      controller: new AbortController(),
    }
  },

  watch: {
    token: {
      async handler(token: string) {
        const request = new AbortController()
        this.controller = request
        const { signal } = request
        onWatcherCleanup(() => request.abort())
        this.project = null
        this.playback.setPreview(null)
        this.loading = true
        this.accountRequired = false
        this.error = ''
        try {
          const remote = await getSharedProject(token, signal)
          this.project = await prepareProject(remote, signal)
          this.playback.setPreview(this.project)
        } catch (reason) {
          if (!signal.aborted) {
            this.error = reason instanceof Error ? reason.message : 'Не удалось открыть проект.'
          }
        } finally {
          if (!signal.aborted) {
            this.loading = false
          }
        }
      },
      immediate: true,
    },
  },

  beforeUnmount() {
    this.controller.abort()
    this.playback.setPreview(null)
  },

  methods: {
    async togglePlayback(): Promise<void> {
      this.error = ''
      try {
        await this.playback.toggle()
      } catch {
        this.error = 'Не удалось запустить воспроизведение.'
      }
    },

    async makeCopy(): Promise<void> {
      if (
        this.persistence.isDirty &&
        !window.confirm('Открыть копию без сохранения текущих изменений?')
      ) {
        return
      }
      const { signal } = this.controller
      this.copying = true
      this.error = ''
      try {
        const remote = await copySharedProject(this.token)
        await this.persistence.open(remote, signal)
        await this.$router.push({ name: 'editor' })
      } catch (reason) {
        if (!signal.aborted) {
          this.accountRequired = reason instanceof AccountRequiredError
          this.error = reason instanceof Error ? reason.message : 'Не удалось сделать копию.'
        }
      } finally {
        this.copying = false
      }
    },
  },
})
</script>
