<template>
  <section class="page">
    <h1 class="page__title">{{ $t('projects.title') }}</h1>

    <p v-if="loading" class="page__hint" role="status">{{ $t('projects.loading') }}</p>
    <p v-else-if="!error && !projects.length" class="page__hint">{{ $t('projects.empty') }}</p>
    <p v-if="error" class="page__error" role="alert">{{ error }}</p>

    <ul v-if="projects.length" class="page__list">
      <li v-for="project in projects" :key="project.id" class="page__row">
        <div class="page__project">
          <p>{{ project.title }}</p>
          <time :datetime="project.updated_at" class="page__hint">{{
            $d(new Date(project.updated_at), 'projectDate')
          }}</time>
        </div>
        <div class="page__actions">
          <button
            type="button"
            class="page__button"
            :disabled="busy"
            @click="open(project.id)"
          >
            {{ opening === project.id ? $t('projects.opening') : $t('common.open') }}
          </button>
          <button type="button" class="page__button page__button--danger" :disabled="busy" @click="remove(project)">
            {{ $t('projects.delete') }}
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { AccountRequiredError, deleteProject, getProject, listProjects, type ProjectSummary } from '@/api/projects'
import { useAccountStore } from '@/stores/account'
import { usePlaybackStore } from '@/stores/playback'
import { useProjectPersistenceStore } from '@/stores/projectPersistence'

export default defineComponent({
  data() {
    return {
      persistence: useProjectPersistenceStore(),
      account: useAccountStore(),
      playback: usePlaybackStore(),
      controller: new AbortController(),
      projects: [] as ProjectSummary[],
      loading: false,
      opening: null as number | null,
      deleting: false,
      error: '',
    }
  },

  computed: {
    busy() {
      return this.loading || this.opening !== null || this.deleting || this.persistence.isSaving
    },
  },

  mounted() {
    void this.refresh()
  },

  beforeUnmount() {
    this.controller.abort()
  },

  beforeRouteLeave() {
    return !this.deleting
  },

  methods: {
    async refresh(): Promise<void> {
      this.loading = true
      this.error = ''
      try {
        this.projects = await listProjects(this.controller.signal)
      } catch (reason) {
        if (!this.controller.signal.aborted) {
          this.projects = []
          this.reportError(reason, this.$t('projects.loadFailed'))
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
          this.reportError(reason, this.$t('projects.openFailed'))
        }
      } finally {
        this.opening = null
      }
    },

    async remove(project: ProjectSummary): Promise<void> {
      if (this.busy || !window.confirm(this.$t('projects.confirmDelete', { title: project.title }))) {
        return
      }
      this.deleting = true
      this.error = ''
      try {
        await deleteProject(project.id)
        this.projects = this.projects.filter(({ id }) => id !== project.id)
        if (this.persistence.saved?.id === project.id) {
          this.persistence.detachSavedProject()
        }
      } catch (reason) {
        this.reportError(reason, this.$t('projects.deleteFailed'))
      } finally {
        this.deleting = false
      }
    },

    reportError(reason: unknown, fallback: string): void {
      if (reason instanceof AccountRequiredError) {
        this.projects = []
        this.account.email = null
        void this.$router.replace({ name: 'account' })
        return
      }
      this.error = reason instanceof Error ? reason.message : fallback
    },
  },
})
</script>
