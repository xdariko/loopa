<template>
  <header class="header">
    <RouterLink to="/" class="header__logo">
      <img :src="logoUrl" alt="" width="24" height="24" />
      loopa
    </RouterLink>

    <input
      v-if="isEditor"
      v-model="projectTitle"
      class="header__title"
      type="text"
      aria-label="Название проекта"
      @focus="status = ''"
    />

    <nav class="header__actions">
      <button
        v-if="isEditor && account.email"
        type="button"
        class="header__link"
        :disabled="persistence.isSaving"
        @keydown.space.stop
        @click="newProject"
      >
        Новый
      </button>
      <RouterLink v-if="account.email" to="/projects" class="header__link">Открыть</RouterLink>

      <template v-if="isEditor">
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

      <RouterLink v-if="account.email" to="/account" class="header__link">Аккаунт</RouterLink>
    </nav>

    <div v-if="isEditor && (status || shareLink)" class="header__feedback">
      <p v-if="status" role="status">{{ status }}</p>
      <RouterLink v-if="accountRequired" to="/account" class="header__button">
        Войти или зарегистрироваться
      </RouterLink>
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

<script lang="ts">
import { defineComponent, onWatcherCleanup } from 'vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'

import { getAccount } from '@/api/account'
import { AccountRequiredError } from '@/api/projects'
import { useAccountStore } from '@/stores/account'
import { usePlaybackStore } from '@/stores/playback'
import { useProjectStore } from '@/stores/project'
import { useProjectPersistenceStore } from '@/stores/projectPersistence'

export default defineComponent({
  data() {
    return {
      logoUrl: `${import.meta.env.BASE_URL}loopa.svg`,
      account: useAccountStore(),
      project: useProjectStore(),
      playback: usePlaybackStore(),
      persistence: useProjectPersistenceStore(),
      status: '',
      accountRequired: false,
      shareLink: '',
    }
  },

  computed: {
    isEditor() {
      return this.$route.name === 'editor'
    },

    projectTitle: {
      get() {
        return this.project.project.title
      },

      set(title: string) {
        this.project.rename(title)
      },
    },
  },

  watch: {
    '$route.name': {
      async handler(name: RouteLocationNormalizedLoaded['name']) {
        if (name === 'account') {
          return
        }
        const controller = new AbortController()
        onWatcherCleanup(() => controller.abort())
        try {
          const session = await getAccount(controller.signal)
          if (!controller.signal.aborted) {
            this.account.email = session.email
          }
        } catch {
          if (!controller.signal.aborted) {
            this.account.email = null
          }
        }
      },
      immediate: true,
    },

    isEditor() {
      this.status = ''
      this.accountRequired = false
      this.shareLink = ''
    },
  },

  methods: {
    async save(): Promise<void> {
      this.status = ''
      this.accountRequired = false
      this.shareLink = ''
      try {
        await this.persistence.save()
        this.status = this.persistence.isDirty
          ? 'Сохранено. Более свежие изменения ещё не сохранены.'
          : 'Проект сохранён.'
      } catch (error) {
        this.accountRequired = error instanceof AccountRequiredError
        if (this.accountRequired) {
          this.account.email = null
        }
        this.status = error instanceof Error ? error.message : 'Не удалось сохранить проект.'
      }
    },

    newProject(): void {
      if (
        this.persistence.isDirty &&
        !window.confirm('Начать новый проект без сохранения изменений?')
      ) {
        return
      }
      this.playback.reset()
      this.persistence.startNew()
      this.status = ''
      this.accountRequired = false
      this.shareLink = ''
    },

    async copyLink(): Promise<void> {
      const token = this.persistence.shareToken
      if (!token) {
        return
      }
      const href = this.$router.resolve({ name: 'shared', params: { token } }).href
      const url = new URL(href, window.location.origin).href
      try {
        await navigator.clipboard.writeText(url)
        this.status = 'Ссылка скопирована.'
      } catch {
        this.shareLink = url
        this.status = 'Скопируйте ссылку из поля.'
      }
    },

    selectLink(event: FocusEvent): void {
      if (event.target instanceof HTMLInputElement) {
        event.target.select()
      }
    },
  },
})
</script>
