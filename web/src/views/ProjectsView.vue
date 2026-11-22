<template>
  <section class="page">
    <h1 class="page__title">{{ $t('projects.title') }}</h1>
    <p v-if="loading" class="page__hint" role="status">{{ $t('projects.loading') }}</p>
    <p v-else-if="!error && !projects.length" class="page__hint">{{ $t('projects.empty') }}</p>
    <p v-if="error" class="page__error" role="alert">{{ error }}</p>
    <RouterLink v-if="accountRequired" to="/account" class="page__button">
      {{ $t('common.signInOrRegister') }}
    </RouterLink>
    <button v-else-if="loadFailed" type="button" class="page__button" @click="refresh">
      {{ $t('common.retry') }}
    </button>
    <ul v-if="projects.length" class="page__list">
      <li v-for="project in projects" :key="project.id" class="page__row">
        <div class="page__project">
          <p>{{ project.title }}</p>
          <time :datetime="project.updated_at" class="page__hint">{{
            $d(new Date(project.updated_at), 'projectDate')
          }}</time>
        </div>
        <button
          type="button"
          class="page__button"
          :disabled="opening !== null || persistence.isSaving"
          @click="open(project.id)"
        >
          {{ opening === project.id ? $t('projects.opening') : $t('common.open') }}
        </button>
      </li>
    </ul>
  </section>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { AccountRequiredError, getProject, listProjects, type ProjectSummary } from '@/api/projects'
import { usePlaybackStore } from '@/stores/playback'
import { useProjectPersistenceStore } from '@/stores/projectPersistence'

export default defineComponent({
  data() {
    return {
      persistence: useProjectPersistenceStore(),
      playback: usePlaybackStore(),
      controller: new AbortController(),
      projects: [] as ProjectSummary[],
      loading: false,
      opening: null as number | null,
      loadFailed: false,
      accountRequired: false,
      error: '',
    }
  },

  mounted() {
    void this.refresh()
  },

  beforeUnmount() {
    this.controller.abort()
  },

  methods: {
    async refresh(): Promise<void> {
      this.loading = true
      this.loadFailed = false
      this.accountRequired = false
      this.error = ''
      try {
        this.projects = await listProjects(this.controller.signal)
      } catch (reason) {
        if (!this.controller.signal.aborted) {
          this.projects = []
          this.accountRequired = reason instanceof AccountRequiredError
          this.error = reason instanceof Error ? reason.message : this.$t('projects.loadFailed')
          this.loadFailed = true
        }
      } finally {
        this.loading = false
      }
    },

    async open(id: number): Promise<void> {
      if (
        this.persistence.isDirty &&
        !window.confirm(this.$t('projects.confirmOpen'))
      ) {
        return
      }
      this.opening = id
      this.error = ''
      try {
        const remote = await getProject(id, this.controller.signal)
        await this.persistence.open(remote, this.controller.signal)
        this.playback.reset()
        await this.$router.push({ name: 'editor' })
      } catch (reason) {
        if (!this.controller.signal.aborted) {
          if (reason instanceof AccountRequiredError) {
            this.projects = []
            this.accountRequired = true
          }
          this.error = reason instanceof Error ? reason.message : this.$t('projects.openFailed')
        }
      } finally {
        this.opening = null
      }
    },
  },
})
</script>
